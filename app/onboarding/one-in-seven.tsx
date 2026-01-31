import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { colors, fonts, spacing } from "@/constants/theme";

export default function OneInSevenScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      ctaText="Continue"
      onCtaPress={() => router.push("/onboarding/growing-pile")}
    >
      <View style={styles.content}>
        {/* Centered Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require("@/assets/money-stack-coins.jpg")}
            style={styles.heroImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* Main Heading */}
        <View style={styles.textContainer}>
          <Text style={styles.headingHighlight}>$4.5 billion</Text>
          <Text style={styles.heading}>was paid out in last year alone</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          And yours could be next.
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
  subtitle: {
    fontSize: 18,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
