import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { ReactNode } from "react";
import * as Haptics from "expo-haptics";
import { colors, fonts, spacing } from "@/constants/theme";

interface OnboardingScreenProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  ctaText: string;
  onCtaPress: () => void;
  ctaDisabled?: boolean;
  secondaryCtaText?: string;
  onSecondaryCtaPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export function OnboardingScreen({
  children,
  title,
  subtitle,
  ctaText,
  onCtaPress,
  ctaDisabled = false,
  secondaryCtaText,
  onSecondaryCtaPress,
}: OnboardingScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.body}>{children}</View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, ctaDisabled && styles.ctaButtonDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onCtaPress();
          }}
          disabled={ctaDisabled}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{ctaText}</Text>
        </TouchableOpacity>

        {secondaryCtaText && onSecondaryCtaPress && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSecondaryCtaPress();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryText}>{secondaryCtaText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  ctaButton: {
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaButtonDisabled: {
    backgroundColor: colors.border,
  },
  ctaText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.semiBold,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
});
