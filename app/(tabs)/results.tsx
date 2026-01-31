import { useState, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClaimListItem } from "@/components/ClaimListItem";
import { useClaims } from "@/lib/hooks/useClaims";
import { Claim } from "@/lib/supabase";
import { colors, fonts, spacing } from "@/constants/theme";

const DARK_GREEN = "#1A3D34";

// Memoized list item
const MemoizedClaimListItem = memo(ClaimListItem);

export default function WalletScreen() {
  const router = useRouter();
  const { claims, totalAmount, fetchClaims, initialLoadComplete } = useClaims();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeClaims = useMemo(
    () => claims
      .filter((c) => c.status === "claimed")
      .sort((a, b) => {
        // Put TBD amounts (no amount) at the bottom
        const aHasAmount = !!a.amount;
        const bHasAmount = !!b.amount;
        if (aHasAmount && !bHasAmount) return -1;
        if (!aHasAmount && bHasAmount) return 1;
        return 0;
      }),
    [claims]
  );
  const claimedAmount = totalAmount ?? 0;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchClaims(true);
    setIsRefreshing(false);
  }, [fetchClaims]);

  const handleClaimPress = useCallback((claim: Claim) => {
    router.push(`/claim/${claim.id}`);
  }, [router]);

  const handleSettingsPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/settings");
  }, [router]);

  const keyExtractor = useCallback((item: Claim) => item.id, []);

  const renderItem = useCallback(({ item }: { item: Claim }) => (
    <MemoizedClaimListItem
      claim={item}
      isLocked={false}
      onPress={() => handleClaimPress(item)}
    />
  ), [handleClaimPress]);

  const ListHeader = useMemo(() => (
    <View style={styles.header}>
      {/* Title Row */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Wallet</Text>
        <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={DARK_GREEN} />
        </TouchableOpacity>
      </View>

      {/* Money Bag Icon */}
      <View style={styles.iconWrapper}>
        <View style={styles.moneyBagCircle}>
          <Text style={styles.moneyBagEmoji}>💰</Text>
        </View>
      </View>

      {/* Total Amount */}
      <Text style={styles.totalAmount}>${claimedAmount.toLocaleString()}</Text>
      <Text style={styles.totalLabel}>Potentially Available Amount</Text>

      {/* Your Claims Section */}
      <Text style={styles.sectionTitle}>Your Claims</Text>
    </View>
  ), [claimedAmount, handleSettingsPress]);

  const renderHeader = useCallback(() => ListHeader, [ListHeader]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyCard}>
      <Ionicons name="document-text-outline" size={40} color="rgba(255,255,255,0.5)" />
      <Text style={styles.emptyTitle}>No Claims Yet</Text>
      <Text style={styles.emptyText}>Pending claims will appear here</Text>
      <TouchableOpacity
        style={styles.startSearchButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/(tabs)/search");
        }}
      >
        <Text style={styles.startSearchText}>Start Searching</Text>
      </TouchableOpacity>
    </View>
  ), [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={activeClaims}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={initialLoadComplete ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        // Performance optimizations
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120, // Account for floating tab bar
    flexGrow: 1,
  },
  header: {
    paddingTop: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: DARK_GREEN,
  },
  settingsButton: {
    padding: spacing.xs,
  },
  iconWrapper: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  moneyBagCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#B8D4CE",
    alignItems: "center",
    justifyContent: "center",
  },
  moneyBagEmoji: {
    fontSize: 36,
  },
  totalAmount: {
    fontSize: 56,
    fontFamily: fonts.bold,
    color: DARK_GREEN,
    textAlign: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: DARK_GREEN,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: DARK_GREEN,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.white,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.6)",
    marginBottom: spacing.lg,
  },
  startSearchButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  startSearchText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
});
