import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SearchForm } from "@/components/SearchForm";
import { useClaims } from "@/lib/hooks/useClaims";
import { useSubscription } from "@/lib/hooks/useSubscription";

export default function SearchScreen() {
  const { createSearch, loading, error } = useClaims();
  const { isSubscribed } = useSubscription();
  const [searchStarted, setSearchStarted] = useState(false);

  const handleSearch = async (
    firstName: string,
    lastName: string,
    states: string[]
  ) => {
    const success = await createSearch({
      firstName,
      lastName,
      states,
    });

    if (success) {
      setSearchStarted(true);
      Alert.alert(
        "Search Started!",
        `We're searching ${states.length} state${
          states.length > 1 ? "s" : ""
        } for unclaimed property. We'll notify you when we find results!`,
        [{ text: "OK" }]
      );
    } else if (error) {
      Alert.alert("Search Failed", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Your Money</Text>
          <Text style={styles.subtitle}>
            Enter your name and select the states where you've lived. We'll
            search government unclaimed property databases for money that
            belongs to you.
          </Text>
        </View>

        {!isSubscribed && (
          <View style={styles.freeTierNotice}>
            <Text style={styles.freeTierText}>
              Free tier: Search up to 3 states. Upgrade for unlimited searches!
            </Text>
          </View>
        )}

        <SearchForm
          onSubmit={handleSearch}
          loading={loading}
          maxStates={isSubscribed ? 50 : 3}
        />

        {searchStarted && (
          <View style={styles.searchStartedNotice}>
            <Text style={styles.searchStartedTitle}>Search in Progress</Text>
            <Text style={styles.searchStartedText}>
              Check the "My Claims" tab to see results as they come in. You'll
              also receive a push notification when the search is complete.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },
  freeTierNotice: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  freeTierText: {
    color: "#92400E",
    fontSize: 14,
    textAlign: "center",
  },
  searchStartedNotice: {
    backgroundColor: "#D1FAE5",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  searchStartedTitle: {
    color: "#065F46",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  searchStartedText: {
    color: "#065F46",
    fontSize: 14,
    lineHeight: 20,
  },
});
