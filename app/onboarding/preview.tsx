import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { FakeClaimCard } from "@/components/onboarding/FakeClaimCard";
import { useOnboardingContext } from "@/lib/hooks/useOnboarding";
import { colors, fonts, spacing } from "@/constants/theme";

const PROPERTY_TYPES = [
  "Utility Deposit",
  "Bank Account",
  "Insurance Proceeds",
  "Uncashed Check",
  "Security Deposit",
  "Savings Account",
];

export default function PreviewScreen() {
  const router = useRouter();
  const { selectedStates, firstName, lastName } = useOnboardingContext();

  // Generate fake claims based on user's selected states
  const fakeClaims = selectedStates.slice(0, 3).map((stateCode, index) => ({
    stateCode,
    propertyType: PROPERTY_TYPES[index % PROPERTY_TYPES.length],
  }));

  // Fallback if no states selected
  const claimsToShow = fakeClaims.length > 0 ? fakeClaims : [
    { stateCode: "CA", propertyType: "Utility Deposit" },
    { stateCode: "NY", propertyType: "Bank Account" },
    { stateCode: "TX", propertyType: "Insurance Proceeds" },
  ];

  const fullName = firstName && lastName ? `${firstName} ${lastName}` : "";

  const resultsAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = claimsToShow.map(() => ({
    opacity: useRef(new Animated.Value(0)).current,
    translateY: useRef(new Animated.Value(30)).current,
  }));

  useEffect(() => {
    // Animate in results immediately
    Animated.timing(resultsAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Stagger card animations
    cardAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(200 + index * 150),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, []);

  return (
    <OnboardingScreen
      ctaText="Start Filing Now"
      onCtaPress={() => router.push("/onboarding/paywall")}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.resultsContainer, { opacity: resultsAnim }]}>
          <View style={styles.resultsBadge}>
            <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            <Text style={styles.resultsTitle}>
              20+ Potential Claims Found!
            </Text>
          </View>

          <Text style={styles.resultsSubtitle}>
            Based on your profile, here's what you might find
          </Text>

          <View style={styles.claimsContainer}>
            {claimsToShow.map((claim, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: cardAnims[index].opacity,
                  transform: [{ translateY: cardAnims[index].translateY }],
                }}
              >
                <FakeClaimCard
                  stateCode={claim.stateCode}
                  propertyType={claim.propertyType}
                  ownerName={fullName}
                />
              </Animated.View>
            ))}
          </View>

          <View style={styles.lockMessage}>
            <Ionicons name="lock-closed" size={20} color={colors.textSecondary} />
            <Text style={styles.lockText}>
              Unlock to see exact amounts and claim details
            </Text>
          </View>
        </Animated.View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  resultsTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  resultsSubtitle: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  claimsContainer: {
    flex: 1,
  },
  lockMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  lockText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
