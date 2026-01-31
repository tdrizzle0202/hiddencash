import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { StateGrid } from "@/components/onboarding/StateGrid";
import { useOnboardingContext } from "@/lib/hooks/useOnboarding";
import { colors, fonts, spacing } from "@/constants/theme";

export default function QuizStatesScreen() {
  const router = useRouter();
  const { selectedStates, setSelectedStates } = useOnboardingContext();

  const toggleState = (code: string) => {
    if (selectedStates.includes(code)) {
      setSelectedStates(selectedStates.filter((s) => s !== code));
    } else {
      setSelectedStates([...selectedStates, code]);
    }
  };

  return (
    <OnboardingScreen
      ctaText="Continue"
      onCtaPress={() => router.push("/onboarding/quiz-life-events")}
      ctaDisabled={selectedStates.length === 0}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Where have you lived?</Text>

        {selectedStates.length > 0 && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedText}>
              {selectedStates.length} state{selectedStates.length > 1 ? "s" : ""} selected
            </Text>
          </View>
        )}

        <StateGrid
          selectedStates={selectedStates}
          onToggleState={toggleState}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  selectedBadge: {
    backgroundColor: colors.primaryFaded,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  selectedText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
});
