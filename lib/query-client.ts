import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 24 hours (for persistence)
      gcTime: 24 * 60 * 60 * 1000,
      // Don't refetch on window focus for mobile
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
  },
});

// Persister to save cache to AsyncStorage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "REACT_QUERY_CACHE",
  // Throttle writes to every 1 second
  throttleTime: 1000,
});

// Query keys for consistent caching
export const queryKeys = {
  claims: ["claims"] as const,
  claimDetail: (id: string) => ["claims", id] as const,
  onboarding: ["onboarding"] as const,
  subscription: ["subscription"] as const,
};
