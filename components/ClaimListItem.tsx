import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Claim } from "@/lib/supabase";
import { fonts, colors, spacing } from "@/constants/theme";

interface ClaimListItemProps {
  claim: Claim;
  isLocked: boolean;
  onPress: () => void;
}

export function ClaimListItem({ claim, isLocked, onPress }: ClaimListItemProps) {
  const getIconColor = () => {
    // Assign colors based on holder name for visual variety
    const colorOptions = [
      { bg: "#D1FAE5", icon: "#10B981" }, // Green
      { bg: "#D1E9E3", icon: "#1A3D34" }, // Dark Green
      { bg: "#FEE2E2", icon: "#EF4444" }, // Red
      { bg: "#FEF3C7", icon: "#F59E0B" }, // Amber
      { bg: "#E0E7FF", icon: "#6366F1" }, // Indigo
      { bg: "#F3E8FF", icon: "#8B5CF6" }, // Purple
    ];
    const index = (claim.holder_name?.charCodeAt(0) || 0) % colorOptions.length;
    return colorOptions[index];
  };

  const iconColors = getIconColor();

  const getHolderIcon = (): keyof typeof Ionicons.glyphMap => {
    const holder = claim.holder_name?.toLowerCase() || "";
    if (holder.includes("bank")) return "wallet-outline";
    if (holder.includes("insurance")) return "shield-outline";
    if (holder.includes("invest") || holder.includes("securities")) return "trending-up-outline";
    if (holder.includes("utility") || holder.includes("electric") || holder.includes("gas")) return "flash-outline";
    if (holder.includes("phone") || holder.includes("wireless") || holder.includes("mobile")) return "phone-portrait-outline";
    return "business-outline";
  };

  const formatAmount = () => {
    if (isLocked) return "Unlock";
    if (claim.amount) {
      return `$${claim.amount.toLocaleString()}`;
    }
    return claim.amount_text || "TBD";
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: iconColors.bg }]}>
        <Ionicons name={getHolderIcon()} size={22} color={iconColors.icon} />
      </View>

      <View style={styles.content}>
        <Text style={styles.holderName} numberOfLines={1}>
          {claim.holder_name && claim.holder_name.length > 15
            ? claim.holder_name.substring(0, 15) + "..."
            : claim.holder_name}
        </Text>
        <Text style={styles.location}>
          {claim.state_code} {claim.status === "new" && "• New"}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        {isLocked ? (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
            <Text style={styles.lockedText}>Unlock</Text>
          </View>
        ) : (
          <Text style={styles.amountText}>{formatAmount()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  holderName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  location: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  lockedText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
});
