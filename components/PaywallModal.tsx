import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PurchasesPackage } from "react-native-purchases";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaywallModal({ visible, onClose, onSuccess }: PaywallModalProps) {
  const { offerings, purchase, restore, loading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  const handlePurchase = async () => {
    const pkg = selectedPlan === "monthly" ? offerings.monthly : offerings.annual;

    if (!pkg) {
      Alert.alert("Error", "This plan is not available. Please try again later.");
      return;
    }

    try {
      const success = await purchase(pkg);
      if (success) {
        Alert.alert("Success!", "Welcome to HiddenCash Premium!", [
          { text: "OK", onPress: onSuccess },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Purchase Failed", error.message || "Please try again.");
    }
  };

  const handleRestore = async () => {
    try {
      const restored = await restore();
      if (restored) {
        Alert.alert("Success!", "Your subscription has been restored.", [
          { text: "OK", onPress: onSuccess },
        ]);
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to restore purchases.");
    }
  };

  const plans = [
    {
      id: "monthly" as const,
      name: "Monthly",
      price: offerings.monthly?.product.priceString || "$9.99",
      description: "Billed monthly",
    },
    {
      id: "annual" as const,
      name: "Annual",
      price: offerings.annual?.product.priceString || "$39.99",
      description: "Save 67%",
      badge: "BEST VALUE",
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Unlock Full Access</Text>
          <Text style={styles.subtitle}>
            Get unlimited searches and see all claim details including amounts and
            direct links to file claims.
          </Text>
        </View>

        <View style={styles.features}>
          <Feature text="Search all 50 states unlimited" />
          <Feature text="See exact claim amounts" />
          <Feature text="Direct links to file claims" />
          <Feature text="Priority search processing" />
          <Feature text="New claim notifications" />
        </View>

        <View style={styles.plans}>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.badge && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planRadio}>
                {selectedPlan === plan.id && (
                  <View style={styles.planRadioInner} />
                )}
              </View>
              <View style={styles.planContent}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
              </View>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={loading}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Subscriptions auto-renew unless canceled at least 24 hours before the end
          of the current period. Cancel anytime in your App Store settings.
        </Text>
      </View>
    </Modal>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  features: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
  },
  plans: {
    marginBottom: 24,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  planBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#10B981",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  planBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  planContent: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  planDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  purchaseButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  purchaseButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  restoreButtonText: {
    color: "#6B7280",
    fontSize: 14,
  },
  legal: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
});
