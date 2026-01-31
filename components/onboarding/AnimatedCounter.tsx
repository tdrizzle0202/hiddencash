import { View, Text, StyleSheet } from "react-native";
import AnimatedNumbers from "react-native-animated-numbers";
import { colors, fonts } from "@/constants/theme";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  style?: any;
  containerStyle?: any;
  labelStyle?: any;
  label?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 2000,
  style,
  containerStyle,
  labelStyle,
  label,
}: AnimatedCounterProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.row}>
        {prefix && <Text style={[styles.value, style]}>{prefix}</Text>}
        <AnimatedNumbers
          animateToNumber={value}
          animationDuration={duration}
          fontStyle={StyleSheet.flatten([styles.value, style])}
          includeComma={value >= 1000}
        />
        {suffix && <Text style={[styles.value, style]}>{suffix}</Text>}
      </View>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  value: {
    fontSize: 36,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});
