import { useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/constants/theme";

/**
 * OAuth callback route
 * Handles redirect from Google (and other OAuth providers)
 * URL: hiddencash://auth/callback
 */
export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tokens from URL fragment (hash params)
        const accessToken = params.access_token as string;
        const refreshToken = params.refresh_token as string;

        if (accessToken) {
          // Set the session in Supabase
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (error) {
            console.error("Error setting session:", error);
            router.replace("/(auth)/login");
            return;
          }

          // Success - go to main app
          router.replace("/(tabs)/search");
        } else {
          // No token, check if there's an error
          const error = params.error as string;
          const errorDescription = params.error_description as string;

          if (error) {
            console.error("OAuth error:", error, errorDescription);
          }

          // Go back to login
          router.replace("/(auth)/login");
        }
      } catch (error) {
        console.error("Callback error:", error);
        router.replace("/(auth)/login");
      }
    };

    handleCallback();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
