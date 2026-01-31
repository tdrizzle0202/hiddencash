import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { colors, fonts, spacing } from "@/constants/theme";

export default function UrgencyScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      ctaText="Search Now"
      onCtaPress={() => router.push("/onboarding/how-it-works")}
    >
      <View style={styles.content}>
        {/* Centered Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require("@/assets/3d-illustration-ukraine-trident-hand-sign.jpg")}
            style={styles.heroImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* Main Heading */}
        <View style={styles.textContainer}>
          <Text style={styles.headingHighlight}>3-5 years</Text>
          <Text style={styles.heading}>before your assets are sold off</Text>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          *States liquidate unclaimed securities after the dormancy period. You can still claim cash value, but lose shares and future gains.
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
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
});
