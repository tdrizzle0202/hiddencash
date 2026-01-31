import { useCallback, createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabase";
import { queryKeys } from "../query-client";

const ONBOARDING_STORAGE_KEY = "@hiddencash:onboarding";

// Module-level cache for instant access to user data (persists across hook instances)
let cachedFirstName: string | null = null;
let cachedLastName: string | null = null;

// Initialize cache from AsyncStorage immediately on module load
AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((saved) => {
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as OnboardingState;
      cachedFirstName = parsed.firstName || null;
      cachedLastName = parsed.lastName || null;
    } catch {}
  }
});

// Context for sharing onboarding state across screens
const OnboardingContext = createContext<ReturnType<typeof useOnboardingState> | null>(null);

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  firstName: string;
  lastName: string;
  selectedStates: string[];
  lifeEvents: string[];
  estimatedAmount: { min: number; max: number };
  currentScreen: number;
}

const getInitialState = (): OnboardingState => ({
  hasCompletedOnboarding: false,
  firstName: cachedFirstName || "",
  lastName: cachedLastName || "",
  selectedStates: [],
  lifeEvents: [],
  estimatedAmount: { min: 0, max: 0 },
  currentScreen: 0,
});

export const LIFE_EVENT_OPTIONS = [
  {
    id: "moved",
    title: "I've moved homes",
    description: "Utility deposits, mail refunds",
    icon: "home-outline" as const,
  },
  {
    id: "changed_jobs",
    title: "Changed jobs",
    description: "Final paychecks, 401k rollovers",
    icon: "briefcase-outline" as const,
  },
  {
    id: "switched_banks",
    title: "Closed or switched banks",
    description: "Dormant accounts, old savings",
    icon: "card-outline" as const,
  },
  {
    id: "childhood_accounts",
    title: "Had accounts as a child",
    description: "Savings bonds, custodial accounts",
    icon: "gift-outline" as const,
  },
  {
    id: "rented",
    title: "Rented an apartment",
    description: "Security deposits, utility refunds",
    icon: "key-outline" as const,
  },
  {
    id: "inheritance",
    title: "Received inheritance",
    description: "Estate funds, unclaimed benefits",
    icon: "document-text-outline" as const,
  },
];

export const TOTAL_SCREENS = 14;

// Fetch onboarding state from database or AsyncStorage
async function fetchOnboardingState(): Promise<OnboardingState> {
  console.log("[Onboarding] Loading state...");

  try {
    // First try to load from database
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log("[Onboarding] loadState - user check:", {
      hasUser: !!user,
      userId: user?.id,
      userError: userError?.message,
    });

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      console.log("[Onboarding] loadState - profile query:", {
        hasProfile: !!profile,
        profile,
        profileError: profileError?.message,
      });

      if (profile) {
        const dbState: OnboardingState = {
          hasCompletedOnboarding: profile.has_completed_onboarding ?? false,
          firstName: profile.first_name ?? "",
          lastName: profile.last_name ?? "",
          selectedStates: profile.selected_states ?? [],
          lifeEvents: profile.life_events ?? [],
          estimatedAmount: {
            min: profile.estimated_amount_min ?? 0,
            max: profile.estimated_amount_max ?? 0,
          },
          currentScreen: profile.current_screen ?? 0,
        };
        // Update cache for instant access
        cachedFirstName = dbState.firstName || null;
        cachedLastName = dbState.lastName || null;
        console.log("[Onboarding] Loaded state from database:", dbState);
        // Also save to AsyncStorage for offline access
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(dbState));
        return dbState;
      }
    }

    // Fallback to AsyncStorage if no database record
    const saved = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    console.log("[Onboarding] Fallback to AsyncStorage:", saved ? "found" : "not found");
    if (saved) {
      const parsed = JSON.parse(saved) as OnboardingState;
      // Update cache for instant access
      cachedFirstName = parsed.firstName || null;
      cachedLastName = parsed.lastName || null;
      console.log("[Onboarding] Loaded from AsyncStorage:", parsed);
      return parsed;
    }
  } catch (error) {
    console.error("[Onboarding] Failed to load onboarding state:", error);
  }

  return getInitialState();
}

// Save onboarding state to database and AsyncStorage
async function saveOnboardingState(newState: OnboardingState): Promise<void> {
  try {
    // Save to AsyncStorage for offline access
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newState));
    console.log("[Onboarding] Saved to AsyncStorage");

    // Sync to database
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log("[Onboarding] saveState - user check:", {
      hasUser: !!user,
      userId: user?.id,
      userError: userError?.message,
    });

    if (user) {
      const payload = {
        user_id: user.id,
        first_name: newState.firstName || null,
        last_name: newState.lastName || null,
        selected_states: newState.selectedStates,
        life_events: newState.lifeEvents,
        estimated_amount_min: newState.estimatedAmount.min,
        estimated_amount_max: newState.estimatedAmount.max,
        has_completed_onboarding: newState.hasCompletedOnboarding,
        current_screen: newState.currentScreen,
      };

      console.log("[Onboarding] Upserting to user_profiles:", payload);

      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload, {
          onConflict: "user_id",
        })
        .select();

      if (error) {
        console.error("[Onboarding] Database upsert error:", error.message, error.details, error.hint);
      } else {
        console.log("[Onboarding] Database upsert success:", data);
      }
    } else {
      console.warn("[Onboarding] No user found, skipping database save");
    }
  } catch (error) {
    console.error("[Onboarding] Failed to save onboarding state:", error);
  }
}

// Internal hook that manages the actual state
function useOnboardingState() {
  const queryClient = useQueryClient();

  const { data: state = getInitialState(), isLoading: loading } = useQuery({
    queryKey: queryKeys.onboarding,
    queryFn: fetchOnboardingState,
    staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    // Use initial state as placeholder for instant rendering
    placeholderData: getInitialState,
  });

  const saveMutation = useMutation({
    mutationFn: saveOnboardingState,
    onMutate: async (newState) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.onboarding });

      // Snapshot the previous value
      const previousState = queryClient.getQueryData<OnboardingState>(queryKeys.onboarding);

      // Optimistically update the cache
      queryClient.setQueryData<OnboardingState>(queryKeys.onboarding, newState);

      return { previousState };
    },
    onError: (err, newState, context) => {
      // Rollback on error
      if (context?.previousState) {
        queryClient.setQueryData(queryKeys.onboarding, context.previousState);
      }
    },
  });

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    const newState = { ...state, ...updates };
    // Update caches
    if (updates.firstName !== undefined) cachedFirstName = updates.firstName || null;
    if (updates.lastName !== undefined) cachedLastName = updates.lastName || null;
    // Save with debounce handled by mutation
    saveMutation.mutate(newState);
  }, [state, saveMutation]);

  const setName = useCallback((firstName: string, lastName: string) => {
    cachedFirstName = firstName || null;
    cachedLastName = lastName || null;
    updateState({ firstName, lastName });
  }, [updateState]);

  const setSelectedStates = useCallback((selectedStates: string[]) => {
    updateState({ selectedStates });
  }, [updateState]);

  const setLifeEvents = useCallback((lifeEvents: string[]) => {
    updateState({ lifeEvents });
  }, [updateState]);

  const toggleLifeEvent = useCallback((eventId: string) => {
    const events = state.lifeEvents.includes(eventId)
      ? state.lifeEvents.filter((e) => e !== eventId)
      : [...state.lifeEvents, eventId];
    updateState({ lifeEvents: events });
  }, [state.lifeEvents, updateState]);

  const setCurrentScreen = useCallback((currentScreen: number) => {
    updateState({ currentScreen });
  }, [updateState]);

  const calculateEstimate = useCallback(() => {
    // Based on NAUPA FY2024 average claim: $2,080
    const stateCount = state.selectedStates.length;
    const eventCount = state.lifeEvents.length;

    const base = 2080;
    const stateBonus = stateCount * 25;
    const eventBonus = eventCount * 15;

    const amount = base + stateBonus + eventBonus;
    const estimatedAmount = { min: amount - 200, max: amount + 200 };

    updateState({ estimatedAmount });

    return estimatedAmount;
  }, [state.selectedStates, state.lifeEvents, updateState]);

  const getPercentileRank = useCallback(() => {
    // Calculate a "percentile" based on states and events
    const score = state.selectedStates.length * 10 + state.lifeEvents.length * 5;
    // Map score to percentile (60-95 range for believability)
    return Math.min(95, Math.max(60, Math.floor(60 + score * 1.5)));
  }, [state.selectedStates, state.lifeEvents]);

  const completeOnboarding = useCallback(async () => {
    console.log("[Onboarding] Completing onboarding...");
    const newState = { ...state, hasCompletedOnboarding: true };
    queryClient.setQueryData<OnboardingState>(queryKeys.onboarding, newState);
    await saveOnboardingState(newState);
    console.log("[Onboarding] Onboarding completed and saved");
  }, [state, queryClient]);

  const resetOnboarding = useCallback(async () => {
    console.log("[Onboarding] Resetting onboarding...");
    // Clear the cache
    cachedFirstName = null;
    cachedLastName = null;
    const initialState = getInitialState();
    queryClient.setQueryData<OnboardingState>(queryKeys.onboarding, initialState);
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);

    // Also delete from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Delete user_claims first (depends on search_profiles via claims)
      const { error: claimsError } = await supabase
        .from("user_claims")
        .delete()
        .eq("user_id", user.id);

      if (claimsError) {
        console.error("[Onboarding] Failed to delete user_claims:", claimsError.message);
      } else {
        console.log("[Onboarding] Deleted user_claims rows");
      }

      // Get search_profile IDs to delete related search_jobs
      const { data: profiles } = await supabase
        .from("search_profiles")
        .select("id")
        .eq("user_id", user.id);

      if (profiles && profiles.length > 0) {
        const profileIds = profiles.map(p => p.id);

        // Delete search_jobs for these profiles
        const { error: jobsError } = await supabase
          .from("search_jobs")
          .delete()
          .in("search_profile_id", profileIds);

        if (jobsError) {
          console.error("[Onboarding] Failed to delete search_jobs:", jobsError.message);
        } else {
          console.log("[Onboarding] Deleted search_jobs rows");
        }
      }

      // Delete search_profiles
      const { error: profilesError } = await supabase
        .from("search_profiles")
        .delete()
        .eq("user_id", user.id);

      if (profilesError) {
        console.error("[Onboarding] Failed to delete search_profiles:", profilesError.message);
      } else {
        console.log("[Onboarding] Deleted search_profiles rows");
      }

      // Delete user_profiles
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("[Onboarding] Failed to delete user_profiles:", error.message);
      } else {
        console.log("[Onboarding] Deleted user_profiles row");
      }
    }

    // Invalidate claims cache too
    queryClient.invalidateQueries({ queryKey: queryKeys.claims });
  }, [queryClient]);

  return {
    ...state,
    loading,
    setName,
    setSelectedStates,
    setLifeEvents,
    toggleLifeEvent,
    setCurrentScreen,
    calculateEstimate,
    getPercentileRank,
    completeOnboarding,
    resetOnboarding,
    LIFE_EVENT_OPTIONS,
    TOTAL_SCREENS,
  };
}

// Provider component that shares state across all onboarding screens
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const onboarding = useOnboardingState();
  return (
    <OnboardingContext.Provider value={onboarding}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Hook for use within the OnboardingProvider - all onboarding screens should use this
export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboardingContext must be used within OnboardingProvider");
  }
  return context;
}

// Public hook for use outside the onboarding flow (e.g., in tabs)
// Creates its own local state and loads from storage
export const useOnboarding = useOnboardingState;
