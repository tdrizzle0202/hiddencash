import { View, Text, StyleSheet, Animated, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { FakeClaimCard } from "@/components/onboarding/FakeClaimCard";
import { useOnboardingContext } from "@/lib/hooks/useOnboarding";
import { colors, fonts, spacing } from "@/constants/theme";

const PROPERTY_TYPES = [
  "Utility Deposit",
  "Bank Account",
  "Insurance Payout",
  "Uncashed Check",
  "Security Deposit",
  "Savings Account",
  "Tax Refund",
  "Payroll Check",
  "Vendor Payment",
  "Court Settlement",
  "Stock Dividend",
  "Escrow Balance",
];

export default function PreviewScreen() {
  const router = useRouter();
  const { selectedStates, firstName, lastName } = useOnboardingContext();

  const fullName = firstName && lastName ? `${firstName} ${lastName}` : "";

  // Generate 10 fake claims based on user's selected states
  const generateClaims = () => {
    const states = selectedStates.length > 0
      ? selectedStates
      : ["CA", "NY", "TX", "FL", "IL"];

    return Array.from({ length: 10 }, (_, index) => ({
      stateCode: states[index % states.length],
      propertyType: PROPERTY_TYPES[index % PROPERTY_TYPES.length],
    }));
  };

  const claimsToShow = generateClaims();

  const resultsAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(
    Array.from({ length: 10 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    }))
  ).current;

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
      ctaText="Claim My Money"
      onCtaPress={() => router.push("/onboarding/paywall")}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.resultsContainer, { opacity: resultsAnim }]}>
          <Text style={styles.claimsFoundLabel}>20+ claims found</Text>
          <ScrollView
            style={styles.claimsScroll}
            showsVerticalScrollIndicator={false}
          >
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
            <Text style={styles.disclaimer}>
              These are sample claims for illustration only. Actual results vary. Based on NAUPA data showing $2,000 average claim.
            </Text>
          </ScrollView>
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
  claimsFoundLabel: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  claimsScroll: {
    flex: 1,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
