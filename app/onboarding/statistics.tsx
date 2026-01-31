import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { AnimatedCounter } from "@/components/onboarding/AnimatedCounter";
import { colors, fonts, spacing } from "@/constants/theme";

export default function StatisticsScreen() {
  const router = useRouter();
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(300, [
      Animated.timing(fadeAnim1, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim2, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim3, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <OnboardingScreen
      ctaText="Am I Owed Money?"
      onCtaPress={() => router.push("/onboarding/quiz-states")}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Money the government won't tell you about</Text>

        <Animated.View style={[styles.statCard, { opacity: fadeAnim1 }]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="people-outline" size={28} color={colors.primary} />
          </View>
          <AnimatedCounter
            value={33}
            suffix=" MILLION"
            style={styles.statValue}
            label="Americans are owed money"
          />
        </Animated.View>

        <Animated.View style={[styles.statCard, { opacity: fadeAnim2 }]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="pie-chart-outline" size={28} color={colors.primary} />
          </View>
          <AnimatedCounter
            value={5}
            suffix="%"
            style={styles.statValue}
            label="of people ever claim it"
          />
        </Animated.View>

        <Animated.View style={[styles.statCard, { opacity: fadeAnim3 }]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="wallet-outline" size={28} color={colors.primary} />
          </View>
          <AnimatedCounter
            value={2080}
            prefix="$"
            style={styles.statValue}
            label="average claim value"
          />
        </Animated.View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  statCard: {
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryFaded,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
});
