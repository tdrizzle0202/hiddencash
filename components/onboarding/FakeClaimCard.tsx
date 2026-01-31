import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, spacing } from "@/constants/theme";

interface FakeClaimCardProps {
  stateCode: string;
  propertyType: string;
  ownerName?: string;
}

export function FakeClaimCard({ stateCode, propertyType, ownerName }: FakeClaimCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <View style={styles.stateTag}>
          <Text style={styles.stateText}>{stateCode}</Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <Text style={styles.propertyType}>{propertyType}</Text>
        <Text style={styles.ownerName}>{ownerName || "Your Name"}</Text>
      </View>
      <View style={styles.amountSection}>
        <Text style={styles.amountBlurred}>$•••</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  leftSection: {
    marginRight: spacing.md,
  },
  stateTag: {
    backgroundColor: colors.primaryFaded,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  stateText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  rightSection: {
    flex: 1,
  },
  propertyType: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  amountSection: {
    backgroundColor: colors.borderLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  amountBlurred: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
});
