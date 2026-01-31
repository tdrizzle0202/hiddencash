import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing } from "@/constants/theme";

interface FakeClaimCardProps {
  stateCode: string;
  propertyType: string;
  ownerName?: string;
  isLocked?: boolean;
}

export function FakeClaimCard({ stateCode, propertyType, ownerName, isLocked = true }: FakeClaimCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.stateTag}>
          <Text style={styles.stateText}>{stateCode}</Text>
        </View>
        <View style={styles.lockedAmount}>
          <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          <Text style={styles.lockedText}>$XXX</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{propertyType}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Owner</Text>
          <Text style={styles.value}>{(ownerName || "John Smith").toUpperCase()}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Holder</Text>
          <View style={styles.blurredValue}>
            <Text style={styles.blurredText}>***</Text>
          </View>
        </View>
      </View>

      {isLocked && (
        <View style={styles.lockOverlay}>
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={20} color={colors.white} />
            <Text style={styles.lockBadgeText}>Unlock to view</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    position: "relative",
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  stateTag: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  stateText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  lockedAmount: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  lockedText: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    marginLeft: 4,
  },
  details: {},
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  blurredValue: {
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  blurredText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  lockOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  lockBadgeText: {
    color: colors.white,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginLeft: 6,
  },
});
