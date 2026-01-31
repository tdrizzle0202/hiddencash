import { Stack, usePathname } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { colors } from "@/constants/theme";
import { TOTAL_SCREENS, OnboardingProvider, useOnboardingContext } from "@/lib/hooks/useOnboarding";

// All onboarding images that need to be preloaded
const ONBOARDING_IMAGES = [
  require("@/assets/3d-rendering-usa-icon.png"),
  require("@/assets/money-stack-coins.jpg"),
  require("@/assets/hand-coins-3d.jpg"),
  require("@/assets/3d-illustration-ukraine-trident-hand-sign.jpg"),
  require("@/assets/notification-bell.png"),
];

const SCREEN_ORDER = [
  "index",
  "one-in-seven",
  "growing-pile",
  "urgency",
  "how-it-works",
  "how-did-you-hear",
  "name",
  "quiz-states",
  "quiz-life-events",
  "personalized",
  "rate-app",
  "preview",
  "paywall",
  "special-offer",
];

// Hidden preloader component to prime expo-image cache
function ImagePreloader({ images }: { images: number[] }) {
  return (
    <View style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
      {images.map((source, index) => (
        <Image
          key={index}
          source={source}
          style={{ width: 1, height: 1 }}
          cachePolicy="memory-disk"
        />
      ))}
    </View>
  );
}

// Inner layout component that has access to the onboarding context
function OnboardingLayoutInner() {
  const pathname = usePathname();
  const { loading } = useOnboardingContext();
  const currentScreenName = pathname.split("/").pop() || "index";
  const currentStep = SCREEN_ORDER.indexOf(currentScreenName) + 1;

  // Show loading state while onboarding data loads
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      {/* Preload all images into expo-image cache */}
      <ImagePreloader images={ONBOARDING_IMAGES} />
      <View style={{ paddingTop: 60 }}>
        <ProgressBar currentStep={currentStep} totalSteps={TOTAL_SCREENS} />
      </View>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.white },
          animation: "simple_push",
          gestureEnabled: currentScreenName !== "paywall",
          fullScreenGestureEnabled: true,
          gestureDirection: "horizontal",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="one-in-seven" />
        <Stack.Screen name="growing-pile" />
        <Stack.Screen name="urgency" />
        <Stack.Screen name="how-it-works" />
        <Stack.Screen name="how-did-you-hear" />
        <Stack.Screen name="name" />
        <Stack.Screen name="quiz-states" />
        <Stack.Screen name="quiz-life-events" />
        <Stack.Screen name="personalized" />
        <Stack.Screen name="rate-app" />
        <Stack.Screen name="preview" />
        <Stack.Screen
          name="paywall"
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="special-offer"
          options={{
            presentation: "fullScreenModal",
            gestureEnabled: false,
          }}
        />
      </Stack>
    </View>
  );
}

// Main layout wrapped with OnboardingProvider for shared state
export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <OnboardingLayoutInner />
    </OnboardingProvider>
  );
}
