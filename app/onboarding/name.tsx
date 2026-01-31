import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { useOnboardingContext } from "@/lib/hooks/useOnboarding";
import { colors, fonts, spacing } from "@/constants/theme";

export default function NameScreen() {
  const router = useRouter();
  const { setName } = useOnboardingContext();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [focusedField, setFocusedField] = useState<"first" | "last" | null>(null);

  const lastNameRef = useRef<TextInput>(null);
  const firstNameScale = useRef(new Animated.Value(1)).current;
  const lastNameScale = useRef(new Animated.Value(1)).current;

  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleContinue = () => {
    setName(firstName.trim(), lastName.trim());
    router.push("/onboarding/quiz-states");
  };

  const animateFocus = (field: "first" | "last", focused: boolean) => {
    const anim = field === "first" ? firstNameScale : lastNameScale;
    Animated.spring(anim, {
      toValue: focused ? 1.02 : 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
    setFocusedField(focused ? field : null);
  };

  return (
    <OnboardingScreen
      ctaText="Continue"
      onCtaPress={handleContinue}
      ctaDisabled={!canContinue}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.content}>
          <Text style={styles.title}>What's your name?</Text>

          <View style={styles.inputsContainer}>
            <Animated.View style={[
              styles.inputWrapper,
              focusedField === "first" && styles.inputWrapperFocused,
              { transform: [{ scale: firstNameScale }] }
            ]}>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                onFocus={() => animateFocus("first", true)}
                onBlur={() => animateFocus("first", false)}
                onSubmitEditing={() => lastNameRef.current?.focus()}
                returnKeyType="next"
              />
            </Animated.View>

            <Animated.View style={[
              styles.inputWrapper,
              focusedField === "last" && styles.inputWrapperFocused,
              { transform: [{ scale: lastNameScale }] }
            ]}>
              <TextInput
                ref={lastNameRef}
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                onFocus={() => animateFocus("last", true)}
                onBlur={() => animateFocus("last", false)}
                onSubmitEditing={canContinue ? handleContinue : undefined}
                returnKeyType="done"
              />
            </Animated.View>
          </View>

          <Text style={styles.hint}>
            We'll search official databases for unclaimed money in your name
          </Text>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  inputsContainer: {
    width: "100%",
    gap: spacing.md,
  },
  inputWrapper: {
    backgroundColor: colors.borderLight,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  input: {
    fontSize: 24,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    textAlign: "center",
    paddingVertical: 20,
    paddingHorizontal: spacing.lg,
  },
  hint: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
