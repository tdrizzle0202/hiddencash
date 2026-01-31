import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts, spacing } from "@/constants/theme";

interface LifeEventCardProps {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function LifeEventCard({
  id,
  title,
  description,
  icon,
  isSelected,
  onToggle,
}: LifeEventCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onToggle(id);
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
        <Ionicons
          name={icon}
          size={24}
          color={isSelected ? colors.white : colors.textSecondary}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, isSelected && styles.titleSelected]}>{title}</Text>
      </View>
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Ionicons name="checkmark" size={16} color={colors.white} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  iconContainerSelected: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  titleSelected: {
    color: colors.primaryDark,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
