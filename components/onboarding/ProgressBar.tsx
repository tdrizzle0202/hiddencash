import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { colors } from "@/constants/theme";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const progress = (currentStep / totalSteps) * 100;
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps]);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.white,
  },
  track: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
