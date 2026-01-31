import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useOnboardingContext } from "@/lib/hooks/useOnboarding";
import { useClaims } from "@/lib/hooks/useClaims";
import { colors, fonts, spacing } from "@/constants/theme";

const FEATURES = [
  "Search all 50 states unlimited",
  "See exact claim amounts",
  "Get direct claim links",
  "Priority processing",
  "New claim notifications",
];

export default function PaywallScreen() {
  const router = useRouter();
  const { offerings, purchase, restore, loading } = useSubscription();
  const { firstName, lastName, selectedStates, estimatedAmount, completeOnboarding } = useOnboardingContext();
  const { createSearch, loading: searchLoading } = useClaims();

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle close button - navigate to special offer page
  const handleClose = () => {
    router.push("/onboarding/special-offer");
  };

  const handlePurchase = async () => {
    const pkg = selectedPlan === "monthly" ? offerings.monthly : offerings.annual;

    if (!pkg) {
      Alert.alert("Error", "This plan is not available. Please try again later.");
      return;
    }

    try {
      setIsProcessing(true);
      const success = await purchase(pkg);
      if (success) {
        // Trigger the initial search with onboarding data (one state at a time)
        if (firstName && lastName && selectedStates.length > 0) {
          const firstState = selectedStates[0];
          console.log("[Paywall] Starting initial search...", { firstName, lastName, state: firstState });
          await createSearch({
            firstName,
            lastName,
            states: [firstState],
          });
        }

        await completeOnboarding();
        // Navigate directly to home page - the searching indicator will show there
        router.replace("/(tabs)/search");
      }
    } catch (error: any) {
      if (!error.message?.includes("cancelled")) {
        Alert.alert("Purchase Failed", error.message || "Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessing(true);
      const restored = await restore();
      if (restored) {
        // Trigger the initial search with onboarding data (one state at a time)
        if (firstName && lastName && selectedStates.length > 0) {
          const firstState = selectedStates[0];
          console.log("[Paywall] Starting initial search after restore...", { firstName, lastName, state: firstState });
          await createSearch({
            firstName,
            lastName,
            states: [firstState],
          });
        }

        await completeOnboarding();
        // Navigate directly to home page - the searching indicator will show there
        router.replace("/(tabs)/search");
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to restore purchases.");
    } finally {
      setIsProcessing(false);
    }
  };

  const plans = [
    {
      id: "monthly" as const,
      name: "Monthly",
      price: offerings.monthly?.product.priceString || "$12.99",
      pricePerMonth: offerings.monthly?.product.priceString || "$12.99",
      description: "/month",
    },
    {
      id: "annual" as const,
      name: "Annual",
      price: offerings.annual?.product.priceString || "$34.99",
      pricePerMonth: "$2.92",
      description: "/year",
      badge: "SAVE 78%",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modalHeader}>
        <View style={styles.spacer} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleClose();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.estimateAmount}>
            ${estimatedAmount.max.toLocaleString()}
          </Text>
          <Text style={styles.nameText}>
            for {firstName?.charAt(0).toUpperCase()}{firstName?.slice(1).toLowerCase()} {lastName?.charAt(0).toUpperCase()}{lastName?.slice(1).toLowerCase()}
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedPlan(plan.id);
              }}
              activeOpacity={0.7}
            >
              {plan.badge && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planRadio}>
                {selectedPlan === plan.id && <View style={styles.planRadioInner} />}
              </View>
              <View style={styles.planContent}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPricePerMonth}>{plan.pricePerMonth}/mo</Text>
              </View>
              <View style={styles.planPriceContainer}>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.purchaseButton, (loading || isProcessing) && styles.purchaseButtonDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handlePurchase();
          }}
          disabled={loading || isProcessing}
          activeOpacity={0.8}
        >
          {loading || isProcessing ? (
            <>
              <ActivityIndicator color={colors.white} />
              {isProcessing && !loading && (
                <Text style={[styles.purchaseButtonText, { marginLeft: 8 }]}>Searching...</Text>
              )}
            </>
          ) : (
            <>
              <Ionicons name="lock-open" size={20} color={colors.white} />
              <Text style={styles.purchaseButtonText}>Unlock My Money</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleRestore();
          }}
          disabled={loading || isProcessing}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Subscriptions auto-renew unless canceled at least 24 hours before the end of
          the current period. Cancel anytime in your App Store settings. By continuing,
          you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  spacer: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  nameText: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  estimateAmount: {
    fontSize: 56,
    fontFamily: fonts.extraBold,
    color: colors.textPrimary,
  },
  features: {
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  plans: {
    marginBottom: spacing.lg,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    position: "relative",
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  planBadge: {
    position: "absolute",
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  planBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  planContent: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  planPricePerMonth: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  planPriceContainer: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  planDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  purchaseButton: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  purchaseButtonDisabled: {
    backgroundColor: colors.border,
  },
  purchaseButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.semiBold,
    marginLeft: spacing.sm,
  },
  restoreButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  restoreButtonText: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  legal: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
