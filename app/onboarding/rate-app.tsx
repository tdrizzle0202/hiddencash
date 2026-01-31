import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as StoreReview from "expo-store-review";
import * as Haptics from "expo-haptics";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { colors, fonts, spacing } from "@/constants/theme";

export default function RateAppScreen() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleStarPress = async (star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(star);

    if (star === 5) {
      // Show native Apple rating modal for 5 stars
      try {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await StoreReview.requestReview();
        }
      } catch (error) {
        console.log("Store review error:", error);
      }
    } else {
      // Show feedback input for 1-4 stars
      setShowFeedback(true);
    }
  };

  const handleContinue = () => {
    // Could save feedback to analytics here
    router.push("/onboarding/paywall");
  };

  return (
    <OnboardingScreen
      ctaText={rating === 0 ? "Skip" : "Continue"}
      onCtaPress={handleContinue}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={48} color={colors.accent} />
        </View>

        <Text style={styles.title}>Enjoying LostCash?</Text>

        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleStarPress(star)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={44}
                color={star <= rating ? colors.accent : colors.textMuted}
                style={styles.star}
              />
            </TouchableOpacity>
          ))}
        </View>

        {showFeedback && rating > 0 && rating < 5 && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackLabel}>
              What could we do better?
            </Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Your feedback helps us improve..."
              placeholderTextColor={colors.textMuted}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentLight + "30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  star: {
    marginHorizontal: 6,
  },
  feedbackContainer: {
    width: "100%",
  },
  feedbackLabel: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  feedbackInput: {
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    minHeight: 100,
  },
});
