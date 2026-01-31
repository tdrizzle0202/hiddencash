import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { LifeEventCard } from "@/components/onboarding/LifeEventCard";
import { useOnboardingContext, LIFE_EVENT_OPTIONS } from "@/lib/hooks/useOnboarding";
import { colors, fonts, spacing } from "@/constants/theme";

export default function QuizLifeEventsScreen() {
  const router = useRouter();
  const { lifeEvents, toggleLifeEvent, calculateEstimate } = useOnboardingContext();

  const handleContinue = () => {
    calculateEstimate();
    router.push("/onboarding/personalized");
  };

  return (
    <OnboardingScreen
      ctaText="Next"
      onCtaPress={handleContinue}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Select all that apply</Text>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {LIFE_EVENT_OPTIONS.map((event) => (
            <LifeEventCard
              key={event.id}
              id={event.id}
              title={event.title}
              description={event.description}
              icon={event.icon}
              isSelected={lifeEvents.includes(event.id)}
              onToggle={toggleLifeEvent}
            />
          ))}
        </ScrollView>

        {lifeEvents.length > 0 && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedText}>
              {lifeEvents.length} event{lifeEvents.length > 1 ? "s" : ""} selected
            </Text>
          </View>
        )}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  selectedBadge: {
    backgroundColor: colors.primaryFaded,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: spacing.sm,
  },
  selectedText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
});
