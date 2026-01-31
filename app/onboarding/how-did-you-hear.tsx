import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { colors, fonts, spacing } from "@/constants/theme";

const ATTRIBUTION_OPTIONS = [
  {
    id: "tiktok",
    label: "TikTok",
    icon: "logo-tiktok" as const,
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "logo-instagram" as const,
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "logo-facebook" as const,
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: "logo-youtube" as const,
  },
  {
    id: "friend",
    label: "Friend or Family",
    icon: "people" as const,
  },
  {
    id: "search",
    label: "Google Search",
    icon: "search" as const,
  },
  {
    id: "news",
    label: "News Article",
    icon: "newspaper" as const,
  },
  {
    id: "other",
    label: "Other",
    icon: "ellipsis-horizontal" as const,
  },
];

export default function HowDidYouHearScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(id);
  };

  const handleContinue = () => {
    // Could save attribution to analytics here
    router.push("/onboarding/name");
  };

  return (
    <OnboardingScreen
      ctaText="Continue"
      onCtaPress={handleContinue}
      ctaDisabled={!selected}
    >
      <View style={styles.content}>
        <Text style={styles.title}>How did you hear{"\n"}about us?</Text>

        <ScrollView
          style={styles.optionsContainer}
          contentContainerStyle={styles.optionsContent}
          showsVerticalScrollIndicator={false}
        >
          {ATTRIBUTION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selected === option.id && styles.optionCardSelected,
              ]}
              onPress={() => handleSelect(option.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconCircle,
                  selected === option.id && styles.iconCircleSelected,
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={selected === option.id ? colors.white : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  selected === option.id && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              {selected === option.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  optionsContainer: {
    flex: 1,
  },
  optionsContent: {
    paddingBottom: spacing.md,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  iconCircleSelected: {
    backgroundColor: colors.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
});
