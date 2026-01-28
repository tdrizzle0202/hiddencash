import { useState, useEffect, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { revenueCat } from "../revenue-cat";
import { notificationService } from "../notifications";
import {
  signInWithApple,
  signInWithGoogle,
  isAppleSignInAvailable,
} from "../auth-providers";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  appleSignInAvailable: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
    appleSignInAvailable: false,
  });

  useEffect(() => {
    // Check Apple Sign In availability
    isAppleSignInAvailable().then((available) => {
      setState((prev) => ({ ...prev, appleSignInAvailable: available }));
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
        initialized: true,
      }));

      // Initialize services for authenticated user
      if (session?.user) {
        revenueCat.initialize(session.user.id);
        notificationService.registerTokenWithServer();
      }
    });

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

      if (event === "SIGNED_IN" && session?.user) {
        await revenueCat.setUserId(session.user.id);
        await notificationService.registerTokenWithServer();
      }

      if (event === "SIGNED_OUT") {
        await revenueCat.logout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setState((prev) => ({ ...prev, loading: false }));

    if (error) {
      throw error;
    }

    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setState((prev) => ({ ...prev, loading: false }));

    if (error) {
      throw error;
    }

    return data;
  }, []);

  const signInApple = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const data = await signInWithApple();
      setState((prev) => ({ ...prev, loading: false }));
      return data;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const data = await signInWithGoogle();
      setState((prev) => ({ ...prev, loading: false }));
      return data;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    const { error } = await supabase.auth.signOut();

    setState((prev) => ({ ...prev, loading: false }));

    if (error) {
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw error;
    }
  }, []);

  return {
    ...state,
    signUp,
    signIn,
    signInApple,
    signInGoogle,
    signOut,
    resetPassword,
  };
}
