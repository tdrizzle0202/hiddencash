import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fonts, colors, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/hooks/useAuth";

const DARK_GREEN = "#1A3D34";
const __DEV__ = process.env.NODE_ENV === "development";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleRateUs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Replace with actual App Store link
    Linking.openURL("https://apps.apple.com");
  };

  const handleResetOnboarding = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) return;

    await supabase
      .from("user_profiles")
      .update({ has_completed_onboarding: false })
      .eq("user_id", user.id);

    Alert.alert("Done", "Onboarding reset. Restart the app.", [
      { text: "OK", onPress: () => router.replace("/") }
    ]);
  };

  const handlePrivacy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL("https://hiddencash.netlify.app/privacy-policy.md");
  };

  const handleTerms = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL("https://hiddencash.netlify.app/terms-of-service.md");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Rate us */}
          <TouchableOpacity style={styles.menuItem} onPress={handleRateUs}>
            <Ionicons name="star-outline" size={22} color={colors.white} />
            <Text style={styles.menuItemText}>Rate us</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Privacy */}
          <TouchableOpacity style={styles.menuItem} onPress={handlePrivacy}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.white} />
            <Text style={styles.menuItemText}>Privacy</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Terms */}
          <TouchableOpacity style={styles.menuItem} onPress={handleTerms}>
            <Ionicons name="document-outline" size={22} color={colors.white} />
            <Text style={styles.menuItemText}>Terms</Text>
          </TouchableOpacity>

          {/* Dev only: Reset Onboarding */}
          {__DEV__ && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={handleResetOnboarding}>
                <Ionicons name="refresh-outline" size={22} color={colors.white} />
                <Text style={styles.menuItemText}>Reset Onboarding</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: DARK_GREEN,
    borderRadius: 20,
    paddingVertical: spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  menuItemText: {
    fontSize: 17,
    fontFamily: fonts.medium,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: spacing.lg,
  },
});
