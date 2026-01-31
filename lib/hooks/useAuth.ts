import { useState, useEffect, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { revenueCat } from "../revenue-cat";
import { notificationService } from "../notifications";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  useEffect(() => {
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      console.log("[Auth] Starting initialization...");

      // First, verify if we have a valid session
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      console.log("[Auth] getUser result:", {
        hasUser: !!user,
        userId: user?.id,
        isAnonymous: user?.is_anonymous,
        userError: userError?.message
      });

      if (user && !userError) {
        // Valid session exists
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[Auth] Existing session found:", {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          tokenLength: session?.access_token?.length,
          expiresAt: session?.expires_at,
        });
        setState((prev) => ({
          ...prev,
          user,
          session,
          loading: false,
          initialized: true,
        }));
        revenueCat.initialize(user.id);
        // Delay token registration to ensure session is fully propagated
        setTimeout(() => notificationService.registerTokenWithServer(), 1000);
        return;
      }

      // No valid session or stale session - sign out to clear and sign in fresh
      console.log("[Auth] No valid session, signing in anonymously...");
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signInAnonymously();

      console.log("[Auth] Anonymous sign in result:", {
        hasUser: !!data?.user,
        userId: data?.user?.id,
        hasSession: !!data?.session,
        hasAccessToken: !!data?.session?.access_token,
        tokenLength: data?.session?.access_token?.length,
        error: error?.message,
      });

      if (error) {
        console.error("[Auth] Anonymous sign in failed:", error.message, error);
        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResult = await supabase.auth.signInAnonymously();
        if (retryResult.error) {
          console.error("[Auth] Retry also failed:", retryResult.error.message);
        } else if (retryResult.data?.user) {
          console.log("[Auth] Retry succeeded:", retryResult.data.user.id);
          setState((prev) => ({
            ...prev,
            user: retryResult.data.user,
            session: retryResult.data.session,
            loading: false,
            initialized: true,
          }));
          revenueCat.initialize(retryResult.data.user.id);
          setTimeout(() => notificationService.registerTokenWithServer(), 1000);
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        user: data?.user ?? null,
        session: data?.session ?? null,
        loading: false,
        initialized: true,
      }));

      if (data?.user) {
        revenueCat.initialize(data.user.id);
        // Delay token registration to ensure session is fully propagated
        setTimeout(() => notificationService.registerTokenWithServer(), 1000);
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        initialized: true,
      }));
    }
  };

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    const { error } = await supabase.auth.signOut();

    setState((prev) => ({ ...prev, loading: false }));

    if (error) {
      throw error;
    }
  }, []);

  return {
    ...state,
    signOut,
  };
}
