import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Claim } from "@/lib/supabase";

interface ClaimCardProps {
  claim: Claim;
  isLocked: boolean;
  onPress: () => void;
}

export function ClaimCard({ claim, isLocked, onPress }: ClaimCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.stateTag}>
          <Text style={styles.stateText}>{claim.state_code}</Text>
        </View>
        {isLocked ? (
          <View style={styles.lockedAmount}>
            <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
            <Text style={styles.lockedText}>Unlock</Text>
          </View>
        ) : claim.amount ? (
          <Text style={styles.amount}>${claim.amount.toLocaleString()}</Text>
        ) : (
          <Text style={styles.amountText}>{claim.amount_text || "Amount varies"}</Text>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Owner</Text>
          <Text style={[styles.value, isLocked && styles.blurredText]}>
            {isLocked ? maskName(claim.owner_name) : claim.owner_name}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{claim.property_type}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Holder</Text>
          <Text style={[styles.value, isLocked && styles.blurredText]}>
            {isLocked ? "***" : claim.holder_name}
          </Text>
        </View>

        {claim.owner_city && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Location</Text>
            <Text style={[styles.value, isLocked && styles.blurredText]}>
              {isLocked ? "***" : claim.owner_city}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.tapText}>Tap for details</Text>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>

      {claim.status === "new" && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function maskName(name: string): string {
  if (!name || name.length < 3) return "***";
  return name.charAt(0) + "*".repeat(Math.min(name.length - 2, 6)) + name.charAt(name.length - 1);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  stateTag: {
    backgroundColor: "#10B981",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  stateText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  amount: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#10B981",
  },
  amountText: {
    fontSize: 14,
    color: "#6B7280",
  },
  lockedAmount: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  lockedText: {
    color: "#6B7280",
    fontSize: 14,
    marginLeft: 4,
  },
  details: {},
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
  },
  value: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  blurredText: {
    color: "#9CA3AF",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  tapText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginRight: 4,
  },
  newBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#EF4444",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
