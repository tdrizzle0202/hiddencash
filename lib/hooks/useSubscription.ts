import { useState, useEffect, useCallback } from "react";
import { PurchasesPackage } from "react-native-purchases";
import { revenueCat, SubscriptionOffering } from "../revenue-cat";
import { supabase } from "../supabase";
import { useAuth } from "./useAuth";

interface SubscriptionState {
  isSubscribed: boolean;
  loading: boolean;
  offerings: SubscriptionOffering;
  error: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    loading: true,
    offerings: { monthly: null, annual: null },
    error: null,
  });

  // Load offerings on mount (doesn't require user)
  useEffect(() => {
    loadOfferings();
  }, []);

  // Check subscription status when user changes
  useEffect(() => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        loading: false,
      }));
      return;
    }

    checkSubscription();
  }, [user]);

  const checkSubscription = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Check RevenueCat first
      const rcSubscribed = await revenueCat.checkSubscriptionStatus();

      // Also check our database (for webhook-based updates)
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("is_subscribed")
        .eq("user_id", user?.id)
        .single();

      const isSubscribed = rcSubscribed || subscription?.is_subscribed || false;

      setState((prev) => ({
        ...prev,
        isSubscribed,
        loading: false,
      }));

      return isSubscribed;
    } catch (error) {
      console.error("Subscription check failed:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to check subscription status",
      }));
      return false;
    }
  }, [user]);

  const loadOfferings = useCallback(async () => {
    try {
      const offerings = await revenueCat.getOfferings();
      setState((prev) => ({ ...prev, offerings }));
    } catch (error) {
      console.error("Failed to load offerings:", error);
    }
  }, []);

  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const success = await revenueCat.purchasePackage(pkg);

        if (success) {
          // Update our database
          await supabase.from("user_subscriptions").upsert({
            user_id: user?.id,
            is_subscribed: true,
            subscription_type: pkg.identifier,
            updated_at: new Date().toISOString(),
          });
        }

        setState((prev) => ({
          ...prev,
          isSubscribed: success,
          loading: false,
        }));

        return success;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Purchase failed",
        }));
        return false;
      }
    },
    [user]
  );

  const restore = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const success = await revenueCat.restorePurchases();

      if (success) {
        await supabase.from("user_subscriptions").upsert({
          user_id: user?.id,
          is_subscribed: true,
          updated_at: new Date().toISOString(),
        });
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: success,
        loading: false,
      }));

      return success;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Restore failed",
      }));
      return false;
    }
  }, [user]);

  return {
    ...state,
    checkSubscription,
    purchase,
    restore,
    loadOfferings,
  };
}
