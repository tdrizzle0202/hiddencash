import { View, Text, StyleSheet, Platform } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { colors, fonts, spacing } from "@/constants/theme";

async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    return true;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#10B981",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export default function HowItWorksScreen() {
  const router = useRouter();

  const handleContinue = async () => {
    await requestNotificationPermissions();
    router.push("/onboarding/how-did-you-hear");
  };

  return (
    <OnboardingScreen
      ctaText="Enable Notifications"
      onCtaPress={handleContinue}
    >
      <View style={styles.content}>
        {/* Centered Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require("@/assets/notification-bell.png")}
            style={styles.heroImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* Main Heading */}
        <View style={styles.textContainer}>
          <Text style={styles.heading}>We'll alert you</Text>
          <Text style={styles.headingHighlight}>when we find money</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Get notified the moment we find a match for you.
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  imageContainer: {
    marginBottom: spacing.xl,
  },
  heroImage: {
    width: 280,
    height: 280,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 38,
  },
  headingHighlight: {
    fontSize: 40,
    fontFamily: fonts.bold,
    color: colors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
