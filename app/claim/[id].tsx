import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, Claim } from "@/lib/supabase";
import { useClaims } from "@/lib/hooks/useClaims";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PaywallModal } from "@/components/PaywallModal";

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateClaimStatus } = useClaims();
  const { isSubscribed } = useSubscription();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    fetchClaimDetails();
  }, [id]);

  const fetchClaimDetails = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("user_claims")
        .select(
          `
          id,
          status,
          claim:claims (
            id,
            state_code,
            owner_name,
            owner_city,
            owner_state,
            owner_zip,
            property_type,
            holder_name,
            amount,
            amount_text,
            claim_url,
            reported_date
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setClaim({
          id: data.id,
          status: data.status,
          ...(data.claim as any),
        });

        // Mark as viewed
        if (data.status === "new") {
          updateClaimStatus(data.id, "viewed");
        }
      }
    } catch (error) {
      console.error("Failed to fetch claim:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimNow = () => {
    if (!isSubscribed) {
      setShowPaywall(true);
      return;
    }

    if (claim?.claim_url) {
      Alert.alert(
        "Claim Your Money",
        "You'll be redirected to the official state website to file your claim. The claim process is handled directly by the state - HiddenCash does not process claims.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to State Site",
            onPress: () => {
              Linking.openURL(claim.claim_url!);
              updateClaimStatus(claim.id, "claimed");
            },
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!claim) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Claim not found</Text>
      </View>
    );
  }

  const isLocked = !isSubscribed;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stateLabel}>{claim.state_code}</Text>
        {claim.amount && !isLocked ? (
          <Text style={styles.amount}>${claim.amount.toLocaleString()}</Text>
        ) : (
          <TouchableOpacity onPress={() => setShowPaywall(true)}>
            <Text style={styles.amountLocked}>
              {isLocked ? "Unlock to see amount" : claim.amount_text || "Amount varies"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Property Details</Text>
        <View style={styles.detailCard}>
          <DetailRow
            label="Type"
            value={claim.property_type}
            icon="document-text-outline"
          />
          <DetailRow
            label="Holder"
            value={isLocked ? "***" : claim.holder_name}
            icon="business-outline"
            locked={isLocked}
          />
          {claim.reported_date && (
            <DetailRow
              label="Reported"
              value={claim.reported_date}
              icon="calendar-outline"
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Owner Information</Text>
        <View style={styles.detailCard}>
          <DetailRow
            label="Name"
            value={isLocked ? "J*** D**" : claim.owner_name}
            icon="person-outline"
            locked={isLocked}
          />
          {claim.owner_city && (
            <DetailRow
              label="Location"
              value={
                isLocked
                  ? "***"
                  : `${claim.owner_city}, ${claim.owner_state} ${claim.owner_zip || ""}`
              }
              icon="location-outline"
              locked={isLocked}
            />
          )}
        </View>
      </View>

      {isLocked && (
        <View style={styles.upgradePrompt}>
          <Text style={styles.upgradeTitle}>Unlock Full Details</Text>
          <Text style={styles.upgradeText}>
            Subscribe to see the full claim details and get the direct link to
            file your claim.
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => setShowPaywall(true)}
          >
            <Text style={styles.upgradeButtonText}>Unlock Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLocked && (
        <TouchableOpacity style={styles.claimButton} onPress={handleClaimNow}>
          <Text style={styles.claimButtonText}>Claim Now</Text>
          <Ionicons name="open-outline" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          HiddenCash helps you find unclaimed property but does not process
          claims. All claims are filed directly with state agencies. Claim
          processing times and requirements vary by state.
        </Text>
      </View>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={() => {
          setShowPaywall(false);
          fetchClaimDetails();
        }}
      />
    </ScrollView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  locked?: boolean;
}

function DetailRow({ label, value, icon, locked }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color="#6B7280" />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, locked && styles.lockedValue]}>
          {value}
        </Text>
      </View>
      {locked && <Ionicons name="lock-closed" size={14} color="#9CA3AF" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    backgroundColor: "#10B981",
    padding: 24,
    alignItems: "center",
  },
  stateLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  amount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  amountLocked: {
    fontSize: 18,
    color: "rgba(255,255,255,0.8)",
    textDecorationLine: "underline",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailIcon: {
    width: 32,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 16,
    color: "#1F2937",
    marginTop: 2,
  },
  lockedValue: {
    color: "#9CA3AF",
  },
  upgradePrompt: {
    margin: 16,
    backgroundColor: "#FEF3C7",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    color: "#92400E",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  claimButton: {
    backgroundColor: "#10B981",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  claimButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  disclaimer: {
    padding: 16,
    paddingBottom: 40,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
});
