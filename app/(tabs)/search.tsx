import { useState, useMemo, useCallback, memo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { FeaturedClaimCard } from "@/components/FeaturedClaimCard";
import { ClaimListItem } from "@/components/ClaimListItem";
import { PaywallModal } from "@/components/PaywallModal";
import { HomeScreenSkeleton } from "@/components/SkeletonLoader";
import { useClaims } from "@/lib/hooks/useClaims";
import { useOnboarding } from "@/lib/hooks/useOnboarding";
import { Claim } from "@/lib/supabase";
import { colors, fonts, spacing } from "@/constants/theme";

const DARK_GREEN = "#1A3D34";

type FilterTab = "new" | "liked" | "disliked";

// Memoized list item to prevent re-renders
const MemoizedClaimListItem = memo(ClaimListItem);

// Memoized featured card
const MemoizedFeaturedClaimCard = memo(FeaturedClaimCard);

export default function HomeScreen() {
  const router = useRouter();
  const { claims, fetchClaims, loading, initialLoadComplete, searchStatus } = useClaims();
  const { firstName } = useOnboarding();
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("new");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchClaims(true);
    setIsRefreshing(false);
  }, [fetchClaims]);

  // Poll for updates when searches are pending
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (searchStatus.pending > 0) {
      // Start polling every 5 seconds when searches are pending
      pollIntervalRef.current = setInterval(() => {
        fetchClaims(true);
      }, 5000);
    } else {
      // Clear polling when no pending searches
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [searchStatus.pending, fetchClaims]);

  // Filter to show only potential matches (not yet claimed)
  const matches = useMemo(() =>
    claims.filter(
      (c) => c.status === "new" || c.status === "viewed" || c.status === "liked" || c.status === "disliked"
    ),
    [claims]
  );

  // Get featured claims (top 5 by amount or newest)
  const featuredClaims = useMemo(() => {
    const sorted = [...matches].sort((a, b) => {
      // Sort by amount (highest first), then by status (new first)
      if (a.amount && b.amount) return b.amount - a.amount;
      if (a.amount) return -1;
      if (b.amount) return 1;
      if (a.status === "new" && b.status !== "new") return -1;
      if (b.status === "new" && a.status !== "new") return 1;
      return 0;
    });
    return sorted.slice(0, 5);
  }, [matches]);

  // Filter claims based on active tab
  const filteredClaims = useMemo(() => {
    if (activeTab === "new") {
      return matches.filter((c) => c.status === "new" || c.status === "viewed");
    } else if (activeTab === "liked") {
      return matches.filter((c) => c.status === "liked");
    } else if (activeTab === "disliked") {
      return matches.filter((c) => c.status === "disliked");
    }
    return matches;
  }, [matches, activeTab]);

  // Count claims for each tab
  const tabCounts = useMemo(() => ({
    new: matches.filter((c) => c.status === "new" || c.status === "viewed").length,
    liked: matches.filter((c) => c.status === "liked").length,
    disliked: matches.filter((c) => c.status === "disliked").length,
  }), [matches]);

  const handleClaimPress = useCallback((claim: Claim) => {
    if (claim.is_locked) {
      setShowPaywall(true);
    } else {
      router.push(`/claim/${claim.id}`);
    }
  }, [router]);

  const handlePaywallClose = useCallback(() => {
    setShowPaywall(false);
  }, []);

  const handlePaywallSuccess = useCallback(() => {
    setShowPaywall(false);
    fetchClaims(true);
  }, [fetchClaims]);

  // Stable key extractor
  const keyExtractor = useCallback((item: Claim) => item.id, []);

  // Memoized render item
  const renderItem = useCallback(({ item }: { item: Claim }) => (
    <MemoizedClaimListItem
      claim={item}
      isLocked={Boolean(item.is_locked)}
      onPress={() => handleClaimPress(item)}
    />
  ), [handleClaimPress]);

  // Check if there are pending searches
  const isSearching = searchStatus.pending > 0;

  // Memoized header to prevent re-renders on list scroll
  const ListHeader = useMemo(() => (
    <View style={styles.header}>
      {/* Greeting */}
      <Text style={styles.greeting}>
        Hey{firstName ? ` ${firstName}` : ""}!
      </Text>
      <Text style={styles.subtitle}>
        New matches we found this week!
      </Text>

      {/* Searching Indicator */}
      {isSearching && (
        <View style={styles.searchingBanner}>
          <ActivityIndicator size="small" color={DARK_GREEN} />
          <Text style={styles.searchingText}>Searching for you...</Text>
        </View>
      )}

      {/* Featured Section */}
      {featuredClaims.length > 0 && (
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Top matches</Text>
          <View style={styles.featuredScrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredClaims.map((claim) => (
                <MemoizedFeaturedClaimCard
                  key={claim.id}
                  claim={claim}
                  isLocked={Boolean(claim.is_locked)}
                  onPress={() => handleClaimPress(claim)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "new" && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setActiveTab("new");
          }}
        >
          <Text style={[styles.tabText, activeTab === "new" && styles.tabTextActive]}>
            New {tabCounts.new > 0 && `(${tabCounts.new})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "liked" && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setActiveTab("liked");
          }}
        >
          <Text style={[styles.tabText, activeTab === "liked" && styles.tabTextActive]}>
            Liked {tabCounts.liked > 0 && `(${tabCounts.liked})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "disliked" && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setActiveTab("disliked");
          }}
        >
          <Text style={[styles.tabText, activeTab === "disliked" && styles.tabTextActive]}>
            Disliked {tabCounts.disliked > 0 && `(${tabCounts.disliked})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [firstName, featuredClaims, activeTab, tabCounts, handleClaimPress, isSearching]);

  const renderHeader = useCallback(() => ListHeader, [ListHeader]);

  const renderEmpty = useCallback(() => null, []);

  // Show skeleton on initial load (no cached data yet)
  const showSkeleton = loading && !initialLoadComplete && claims.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {showSkeleton ? (
        <ScrollView
          style={styles.skeletonContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <HomeScreenSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredClaims}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading ? renderEmpty : null}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={DARK_GREEN}
            />
          }
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          getItemLayout={undefined} // Let FlatList measure items
        />
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={handlePaywallClose}
        onSuccess={handlePaywallSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120, // Account for floating tab bar
    flexGrow: 1,
  },
  header: {
    paddingTop: spacing.lg,
  },
  greeting: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: DARK_GREEN,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  searchingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  searchingText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: DARK_GREEN,
  },
  featuredSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: DARK_GREEN,
    marginBottom: spacing.md,
  },
  featuredScrollWrapper: {
    marginHorizontal: -spacing.lg, // Extend to screen edges
  },
  featuredScroll: {
    paddingLeft: spacing.lg, // Start content at normal position
    paddingRight: spacing.lg, // End padding
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: DARK_GREEN,
    borderColor: DARK_GREEN,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: DARK_GREEN,
  },
  tabTextActive: {
    color: colors.white,
  },
});
