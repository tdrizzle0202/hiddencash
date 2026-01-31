import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing } from "@/constants/theme";

interface TestimonialCardProps {
  name: string;
  state: string;
  amount: number;
  description: string;
}

export function TestimonialCard({ name, state, amount, description }: TestimonialCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.state}>{state}</Text>
        </View>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.foundLabel}>Found</Text>
        <Text style={styles.amount}>${amount.toLocaleString()}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons key={star} name="star" size={16} color={colors.accent} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginRight: spacing.md,
    width: 280,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFaded,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  state: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  amountContainer: {
    backgroundColor: colors.primaryFaded,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  foundLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.primaryDark,
    marginBottom: 2,
  },
  amount: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  stars: {
    flexDirection: "row",
  },
});
