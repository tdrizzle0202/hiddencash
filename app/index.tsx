import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LandingScreen() {
  const router = useRouter();
  const { user, initialized } = useAuth();

  useEffect(() => {
    if (initialized && user) {
      router.replace("/(tabs)/search");
    }
  }, [initialized, user]);

  if (!initialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>HiddenCash</Text>
        <Text style={styles.tagline}>Find Money You Forgot About</Text>
        <Text style={styles.subtitle}>
          Search all 50 states for unclaimed property in your name.
          Millions of dollars are waiting to be found!
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>$</Text>
          <Text style={styles.featureText}>
            Over $80 billion in unclaimed property nationwide
          </Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>50</Text>
          <Text style={styles.featureText}>
            Search all 50 state databases at once
          </Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>!</Text>
          <Text style={styles.featureText}>
            Get notified when we find money for you
          </Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(auth)/signup")}
        >
          <Text style={styles.primaryButtonText}>Get Started Free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.secondaryButtonText}>
            Already have an account? Sign In
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        Search up to 3 states free. Unlimited searches with subscription.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  loading: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
  },
  hero: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  features: {
    marginBottom: 48,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
    width: 48,
    textAlign: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    marginLeft: 12,
  },
  buttons: {
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#6B7280",
    fontSize: 15,
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 13,
    color: "#9CA3AF",
  },
});
