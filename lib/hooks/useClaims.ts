import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase, Claim, ClaimStatus } from "../supabase";
import { useAuth } from "./useAuth";
import { queryKeys } from "../query-client";

interface ClaimsData {
  claims: Claim[];
  totalAmount: number | null;
  searchStatus: {
    pending: number;
    completed: number;
  };
}

interface CreateSearchParams {
  firstName: string;
  lastName: string;
  states: string[];
}

async function fetchClaimsData(): Promise<ClaimsData> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.log("[Claims] No access token available");
    return {
      claims: [],
      totalAmount: null,
      searchStatus: { pending: 0, completed: 0 },
    };
  }

  console.log("[Claims] Fetching with session:", {
    hasSession: !!session,
    userId: session?.user?.id,
    isAnonymous: session?.user?.is_anonymous,
  });

  const { data, error } = await supabase.functions.invoke("get-results", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error("[Claims] Failed to fetch claims:", error);
    throw error;
  }

  if (data.success) {
    return {
      claims: data.claims,
      totalAmount: data.total_amount,
      searchStatus: data.search_status,
    };
  }

  return {
    claims: [],
    totalAmount: null,
    searchStatus: { pending: 0, completed: 0 },
  };
}

export function useClaims() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.claims,
    queryFn: fetchClaimsData,
    enabled: !!user,
    // Show cached data immediately while revalidating
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    // Return placeholder while loading
    placeholderData: {
      claims: [],
      totalAmount: null,
      searchStatus: { pending: 0, completed: 0 },
    },
  });

  // Memoize claims array to prevent unnecessary re-renders
  const claims = useMemo(() => data?.claims ?? [], [data?.claims]);
  const totalAmount = data?.totalAmount ?? null;
  const searchStatus = data?.searchStatus ?? { pending: 0, completed: 0 };
  const initialLoadComplete = !loading || claims.length > 0;

  const fetchClaims = useCallback(async (forceRefresh = false) => {
    if (!user) {
      console.log("[Claims] No user, skipping fetch");
      return;
    }

    if (forceRefresh) {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: queryKeys.claims });
    } else {
      // Just refetch if stale
      await refetch();
    }
  }, [user, queryClient, refetch]);

  const createSearchMutation = useMutation({
    mutationFn: async (params: CreateSearchParams): Promise<boolean> => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error("[Claims] No access token for search");
        throw new Error("Not authenticated");
      }

      console.log("[Claims] Creating search with session:", {
        hasSession: !!session,
        userId: session?.user?.id,
      });

      const { data, error } = await supabase.functions.invoke("create-search", {
        body: {
          first_name: params.firstName,
          last_name: params.lastName,
          states: params.states,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return true;
    },
    onSuccess: () => {
      // Refresh claims after creating search
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.claims });
      }, 1000);
    },
  });

  const createSearch = useCallback(
    async (params: CreateSearchParams): Promise<boolean> => {
      try {
        return await createSearchMutation.mutateAsync(params);
      } catch (error: any) {
        console.error("[Claims] Failed to create search:", error);
        return false;
      }
    },
    [createSearchMutation]
  );

  const updateClaimStatusMutation = useMutation({
    mutationFn: async ({ claimId, status }: { claimId: string; status: ClaimStatus }) => {
      const updates: Record<string, string> = { status };

      if (status === "viewed") {
        updates.viewed_at = new Date().toISOString();
      } else if (status === "claimed") {
        updates.claimed_at = new Date().toISOString();
      } else if (status === "liked") {
        updates.liked_at = new Date().toISOString();
      } else if (status === "disliked") {
        updates.disliked_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("user_claims")
        .update(updates)
        .eq("id", claimId);

      if (error) {
        throw error;
      }

      return { claimId, status };
    },
    onMutate: async ({ claimId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.claims });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ClaimsData>(queryKeys.claims);

      // Optimistically update the cache
      queryClient.setQueryData<ClaimsData>(queryKeys.claims, (old) => {
        if (!old) return old;
        return {
          ...old,
          claims: old.claims.map((c) =>
            c.id === claimId ? { ...c, status } : c
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.claims, context.previousData);
      }
      console.error("Failed to update claim status:", err);
    },
  });

  const updateClaimStatus = useCallback(
    async (claimId: string, status: ClaimStatus): Promise<boolean> => {
      try {
        await updateClaimStatusMutation.mutateAsync({ claimId, status });
        return true;
      } catch {
        return false;
      }
    },
    [updateClaimStatusMutation]
  );

  return {
    claims,
    totalAmount,
    searchStatus,
    loading: loading && !isFetching,
    initialLoadComplete,
    error: error?.message || null,
    fetchClaims,
    createSearch,
    updateClaimStatus,
  };
}

// Prefetch claims data (call this in _layout to warm the cache)
export function prefetchClaims() {
  const { queryClient } = require("../query-client");
  return queryClient.prefetchQuery({
    queryKey: queryKeys.claims,
    queryFn: fetchClaimsData,
    staleTime: 2 * 60 * 1000,
  });
}
