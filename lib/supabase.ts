import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage adapter for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Type definitions for database tables
export interface SearchProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface SearchJob {
  id: string;
  search_profile_id: string;
  state_code: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export interface Claim {
  id: string;
  state_code: string;
  owner_name: string;
  owner_city: string | null;
  property_type: string;
  holder_name: string;
  amount: number | null;
  amount_text: string | null;
  claim_url: string | null;
  status: string;
  is_locked?: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  is_subscribed: boolean;
  subscription_type: string | null;
  expires_at: string | null;
}
