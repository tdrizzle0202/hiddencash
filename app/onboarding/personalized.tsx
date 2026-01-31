import { View, Text, StyleSheet, Animated, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { FakeClaimCard } from "@/components/onboarding/FakeClaimCard";
import { useOnboardingContext } from "@/lib/hooks/useOnboarding";
import { colors, fonts, spacing } from "@/constants/theme";

// All 50 US states for the searching animation
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

// Loading steps with their completion percentage thresholds
const LOADING_STEPS = [
  { label: "Verify eligibility", threshold: 15 },
  { label: "Personalized matching", threshold: 40 },
  { label: "Calculate your claim", threshold: 65 },
  { label: "Prepare your results", threshold: 85 },
  { label: "Set up your account", threshold: 100 },
];

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

export default function PersonalizedScreen() {
  const router = useRouter();
  const { estimatedAmount, selectedStates, firstName, lastName, calculateEstimate } = useOnboardingContext();
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [displayAmount, setDisplayAmount] = useState(estimatedAmount);

  // Calculate estimate immediately on mount to ensure it's ready
  useEffect(() => {
    const amount = calculateEstimate();
    setDisplayAmount(amount);
  }, []);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingFadeAnim = useRef(new Animated.Value(1)).current;
  const cardAnims = useRef(
    Array.from({ length: 10 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    }))
  ).current;

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

  const fullName = firstName && lastName ? `${firstName} ${lastName}` : "";

  // Animate progress from 0 to 100 and cycle through states
  useEffect(() => {
    if (!isLoading) return;

    const loadingDuration = 5000; // 5 seconds total
    const progressInterval = 50; // Update every 50ms for smooth animation
    const stepsNeeded = loadingDuration / progressInterval;
    const incrementPerStep = 100 / stepsNeeded;

    // State cycling - switch to a new random state every 100ms
    const stateInterval = setInterval(() => {
      setCurrentStateIndex(Math.floor(Math.random() * US_STATES.length));
    }, 100);

    // Progress increment
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + incrementPerStep;
        return next >= 100 ? 100 : next;
      });
    }, progressInterval);

    return () => {
      clearInterval(stateInterval);
      clearInterval(progressTimer);
    };
  }, [isLoading]);

  // Transition from loading to results when progress hits 100
  useEffect(() => {
    if (progress < 100) return;

    const timer = setTimeout(() => {
      // Fade out loading after progress completes
      Animated.timing(loadingFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsLoading(false);

        // Animate in results
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();

        // Stagger card animations
        cardAnims.forEach((anim, index) => {
          Animated.sequence([
            Animated.delay(300 + index * 150),
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
      });
    }, 500); // Short delay after 100% before transitioning

    return () => clearTimeout(timer);
  }, [progress]);

  if (isLoading) {
    return (
      <OnboardingScreen
        ctaText="Find My Money"
        onCtaPress={() => { }}
        ctaDisabled
      >
        <Animated.View style={[styles.loadingContent, { opacity: loadingFadeAnim }]}>
          {/* Large percentage display */}
          <Text style={styles.percentageText}>{Math.round(progress)}%</Text>

          <Text style={styles.loadingTitle}>Finding claims</Text>
          <Text style={styles.loadingSubtitle}>Checking available claims you're{"\n"}eligible for</Text>

          {/* Steps progress */}
          <View style={styles.stepsContainer}>
            {LOADING_STEPS.map((step, index) => {
              const isCompleted = progress >= step.threshold;
              const isActive = !isCompleted &&
                (index === 0 || progress >= LOADING_STEPS[index - 1].threshold);

              return (
                <View key={step.label} style={styles.stepRow}>
                  <View style={[
                    styles.stepIcon,
                    isCompleted && styles.stepIconCompleted,
                    isActive && styles.stepIconActive,
                  ]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    ) : isActive ? (
                      <View style={styles.stepSpinner} />
                    ) : null}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isActive && styles.stepLabelActive,
                    !isCompleted && !isActive && styles.stepLabelPending,
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* State searching message at bottom */}
          <View style={styles.stateSearchContainer}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <Text style={styles.stateSearchText}>
              Searching {US_STATES[currentStateIndex]}...
            </Text>
          </View>
        </Animated.View>
      </OnboardingScreen>
    );
  }

  return (
    <OnboardingScreen
      ctaText="Claim My Money"
      onCtaPress={() => router.push("/onboarding/rate-app")}
    >
      <View style={styles.content}>
        {/* Header */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.amountHighlight}>
            ${displayAmount.max.toLocaleString()}
          </Text>
          <Text style={styles.amountLabel}>unclaimed</Text>
        </Animated.View>

        {/* Claims preview */}
        <Animated.View style={[styles.claimsSection, { opacity: fadeAnim }]}>
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
  loadingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  percentageText: {
    fontSize: 80,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  loadingTitle: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  loadingSubtitle: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  stepsContainer: {
    width: "100%",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  stepIconCompleted: {
    backgroundColor: colors.primary,
  },
  stepIconActive: {
    backgroundColor: colors.primaryFaded,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  stepSpinner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  stepLabel: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  stepLabelCompleted: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
  },
  stepLabelPending: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  stateSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  stateSearchText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  amountHighlight: {
    fontSize: 56,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  amountLabel: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  claimsSection: {
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
