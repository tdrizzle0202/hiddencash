import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Claim } from "@/lib/supabase";
import { fonts, colors, spacing } from "@/constants/theme";

interface FeaturedClaimCardProps {
  claim: Claim;
  isLocked: boolean;
  onPress: () => void;
}

export function FeaturedClaimCard({ claim, isLocked, onPress }: FeaturedClaimCardProps) {
  const getCardColor = () => {
    // Assign colors based on state or amount for visual variety
    const colorOptions = [
      { bg: "#10B981", icon: "#FFFFFF" }, // Green
      { bg: "#1F2937", icon: "#FFFFFF" }, // Dark
      { bg: "#1A3D34", icon: "#FFFFFF" }, // Dark Green
      { bg: "#8B5CF6", icon: "#FFFFFF" }, // Purple
      { bg: "#F59E0B", icon: "#FFFFFF" }, // Amber
    ];
    const index = claim.state_code.charCodeAt(0) % colorOptions.length;
    return colorOptions[index];
  };

  const cardColors = getCardColor();

  const formatAmount = () => {
    if (isLocked) return "Unlock to see";
    if (claim.amount) {
      return `$${claim.amount.toLocaleString()}`;
    }
    return claim.amount_text || "Amount varies";
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardColors.bg }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
        <Ionicons
          name={isLocked ? "lock-closed" : "cash-outline"}
          size={24}
          color={cardColors.icon}
        />
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>{formatAmount()}</Text>
      </View>

      <Text style={styles.holderName} numberOfLines={1}>
        {claim.holder_name}
      </Text>
      <Text style={styles.stateText}>{claim.state_code}</Text>

      {claim.status === "new" && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    height: 160,
    borderRadius: 16,
    padding: spacing.md,
    marginRight: spacing.md,
    position: "relative",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  amountContainer: {
    marginBottom: spacing.xs,
  },
  amountText: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#FFFFFF",
  },
  holderName: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  stateText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.7)",
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
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: fonts.bold,
  },
});
