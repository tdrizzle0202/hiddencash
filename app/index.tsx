import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { colors } from "@/constants/theme";

export default function IndexScreen() {
  const router = useRouter();
  const { initialized, user } = useAuth();

  useEffect(() => {
    if (!initialized) return;

    const checkOnboardingAndRoute = async () => {
      try {
        if (!user) {
          // No user yet, wait for auth
          return;
        }

        // Check database for onboarding status
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("has_completed_onboarding")
          .eq("user_id", user.id)
          .single();

        // Show splash for a moment before navigating
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (profile?.has_completed_onboarding) {
          router.replace("/(tabs)/search");
        } else {
          router.replace("/onboarding");
        }
      } catch {
        // No profile found, go to onboarding
        await new Promise((resolve) => setTimeout(resolve, 1000));
        router.replace("/onboarding");
      }
    };

    checkOnboardingAndRoute();
  }, [initialized, user]);

  // Show splash screen with USA map image while initializing
  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/adaptive-icon.png")}
        style={styles.logo}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 280,
    height: 280,
  },
});
