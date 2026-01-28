import { useState, useCallback } from "react";
import { supabase, Claim } from "../supabase";
import { useAuth } from "./useAuth";

interface ClaimsState {
  claims: Claim[];
  totalAmount: number | null;
  searchStatus: {
    pending: number;
    completed: number;
  };
  loading: boolean;
  error: string | null;
}

interface CreateSearchParams {
  firstName: string;
  lastName: string;
  states: string[];
}

export function useClaims() {
  const { user } = useAuth();
  const [state, setState] = useState<ClaimsState>({
    claims: [],
    totalAmount: null,
    searchStatus: { pending: 0, completed: 0 },
    loading: false,
    error: null,
  });

  const fetchClaims = useCallback(async () => {
    if (!user) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke("get-results");

      if (error) {
        throw error;
      }

      if (data.success) {
        setState((prev) => ({
          ...prev,
          claims: data.claims,
          totalAmount: data.total_amount,
          searchStatus: data.search_status,
          loading: false,
        }));
      }
    } catch (error: any) {
      console.error("Failed to fetch claims:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to load claims",
      }));
    }
  }, [user]);

  const createSearch = useCallback(
    async (params: CreateSearchParams): Promise<boolean> => {
      if (!user) return false;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase.functions.invoke(
          "create-search",
          {
            body: {
              first_name: params.firstName,
              last_name: params.lastName,
              states: params.states,
            },
          }
        );

        if (error) {
          throw error;
        }

        if (data.error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: data.error,
          }));
          return false;
        }

        setState((prev) => ({ ...prev, loading: false }));

        // Refresh claims after creating search
        setTimeout(() => fetchClaims(), 1000);

        return true;
      } catch (error: any) {
        console.error("Failed to create search:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to start search",
        }));
        return false;
      }
    },
    [user, fetchClaims]
  );

  const updateClaimStatus = useCallback(
    async (claimId: string, status: "viewed" | "claimed" | "dismissed") => {
      try {
        const updates: any = { status };

        if (status === "viewed") {
          updates.viewed_at = new Date().toISOString();
        } else if (status === "claimed") {
          updates.claimed_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from("user_claims")
          .update(updates)
          .eq("id", claimId);

        if (error) {
          throw error;
        }

        // Update local state
        setState((prev) => ({
          ...prev,
          claims: prev.claims.map((c) =>
            c.id === claimId ? { ...c, status } : c
          ),
        }));

        return true;
      } catch (error) {
        console.error("Failed to update claim status:", error);
        return false;
      }
    },
    []
  );

  return {
    ...state,
    fetchClaims,
    createSearch,
    updateClaimStatus,
  };
}
