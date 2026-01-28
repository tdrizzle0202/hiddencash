import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { ClaimCard } from "@/components/ClaimCard";
import { PaywallModal } from "@/components/PaywallModal";
import { useClaims } from "@/lib/hooks/useClaims";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { Claim } from "@/lib/supabase";

export default function ResultsScreen() {
  const router = useRouter();
  const { claims, totalAmount, searchStatus, fetchClaims, loading } =
    useClaims();
  const { isSubscribed } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleClaimPress = (claim: Claim) => {
    if (claim.is_locked && !isSubscribed) {
      setShowPaywall(true);
    } else {
      router.push(`/claim/${claim.id}`);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Claims Found Yet</Text>
      <Text style={styles.emptyText}>
        Start a search to find unclaimed property in your name. We'll show your
        results here.
      </Text>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => router.push("/(tabs)/search")}
      >
        <Text style={styles.searchButtonText}>Start Search</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {searchStatus.pending > 0 && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            Searching... {searchStatus.pending} state
            {searchStatus.pending > 1 ? "s" : ""} remaining
          </Text>
        </View>
      )}

      {claims.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {claims.length} Claim{claims.length > 1 ? "s" : ""} Found
          </Text>
          {isSubscribed && totalAmount !== null && totalAmount > 0 && (
            <Text style={styles.summaryAmount}>
              Total: ${totalAmount.toLocaleString()}
            </Text>
          )}
          {!isSubscribed && (
            <TouchableOpacity onPress={() => setShowPaywall(true)}>
              <Text style={styles.unlockText}>Unlock to see amounts</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={claims}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClaimCard
            claim={item}
            isLocked={item.is_locked && !isSubscribed}
            onPress={() => handleClaimPress(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchClaims}
            tintColor="#10B981"
          />
        }
      />

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={() => {
          setShowPaywall(false);
          fetchClaims();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  statusBar: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    color: "#92400E",
    fontSize: 14,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#10B981",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryAmount: {
    color: "#fff",
    fontSize: 18,
    marginTop: 4,
  },
  unlockText: {
    color: "#D1FAE5",
    fontSize: 14,
    marginTop: 8,
    textDecorationLine: "underline",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  searchButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
