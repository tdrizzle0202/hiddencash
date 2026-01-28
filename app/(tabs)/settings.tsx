import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useState } from "react";
import { PaywallModal } from "@/components/PaywallModal";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();
  const { isSubscribed, restore, loading: subscriptionLoading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/");
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const handleRestorePurchases = async () => {
    try {
      const restored = await restore();
      if (restored) {
        Alert.alert("Success", "Your purchases have been restored!");
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases to restore."
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to restore purchases");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={20} color="#6B7280" />
            <Text style={styles.rowText}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.subscriptionRow}>
            <View>
              <Text style={styles.subscriptionStatus}>
                {isSubscribed ? "Premium" : "Free"}
              </Text>
              <Text style={styles.subscriptionDetail}>
                {isSubscribed
                  ? "Unlimited searches & full claim details"
                  : "Up to 3 states per search"}
              </Text>
            </View>
            {!isSubscribed && (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => setShowPaywall(true)}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={handleRestorePurchases}
          disabled={subscriptionLoading}
        >
          <Text style={styles.linkText}>
            {subscriptionLoading ? "Restoring..." : "Restore Purchases"}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL("https://hiddencash.netlify.app/#faq")}
        >
          <View style={styles.linkRowContent}>
            <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.linkRowText}>Help & FAQ</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL("mailto:tbhapp1234@gmail.com")}
        >
          <View style={styles.linkRowContent}>
            <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
            <Text style={styles.linkRowText}>Contact Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL("https://hiddencash.netlify.app/terms")}
        >
          <View style={styles.linkRowContent}>
            <Ionicons name="document-text-outline" size={20} color="#6B7280" />
            <Text style={styles.linkRowText}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL("https://hiddencash.netlify.app/privacy")}
        >
          <View style={styles.linkRowContent}>
            <Ionicons name="shield-outline" size={20} color="#6B7280" />
            <Text style={styles.linkRowText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text style={styles.signOutText}>
            {loading ? "Signing Out..." : "Sign Out"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>HiddenCash v1.0.0</Text>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={() => setShowPaywall(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
  },
  subscriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subscriptionStatus: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  subscriptionDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  upgradeButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  linkRow: {
    backgroundColor: "#fff",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    marginTop: 8,
  },
  linkRowContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkRowText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 12,
  },
  linkText: {
    fontSize: 16,
    color: "#10B981",
  },
  signOutButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  signOutText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },
  version: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 24,
    marginBottom: 40,
  },
});
