import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { spacing } from "@/constants/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width = "100%", height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function ClaimCardSkeleton() {
  return (
    <View style={styles.claimCard}>
      <View style={styles.claimCardContent}>
        <View style={styles.claimCardLeft}>
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
        <View style={styles.claimCardCenter}>
          <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={14} />
        </View>
        <View style={styles.claimCardRight}>
          <Skeleton width={60} height={18} />
        </View>
      </View>
    </View>
  );
}

export function FeaturedCardSkeleton() {
  return (
    <View style={styles.featuredCard}>
      <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width={80} height={24} style={{ marginBottom: 12 }} />
      <Skeleton width="80%" height={12} />
    </View>
  );
}

export function HomeScreenSkeleton() {
  return (
    <View style={styles.container}>
      {/* Greeting skeleton */}
      <Skeleton width={180} height={32} style={{ marginBottom: 8 }} />
      <Skeleton width={220} height={16} style={{ marginBottom: 24 }} />

      {/* Featured section skeleton */}
      <Skeleton width={120} height={20} style={{ marginBottom: 16 }} />
      <View style={styles.featuredRow}>
        <FeaturedCardSkeleton />
        <FeaturedCardSkeleton />
      </View>

      {/* Tabs skeleton */}
      <View style={styles.tabsRow}>
        <Skeleton width={60} height={36} borderRadius={18} />
        <Skeleton width={70} height={36} borderRadius={18} />
        <Skeleton width={80} height={36} borderRadius={18} />
      </View>

      {/* Claims list skeleton */}
      <ClaimCardSkeleton />
      <ClaimCardSkeleton />
      <ClaimCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#D0D0D0",
  },
  container: {
    paddingTop: spacing.lg,
  },
  featuredRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featuredCard: {
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: spacing.lg,
    width: 160,
  },
  tabsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  claimCard: {
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  claimCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  claimCardLeft: {
    marginRight: spacing.md,
  },
  claimCardCenter: {
    flex: 1,
  },
  claimCardRight: {
    marginLeft: spacing.sm,
  },
});
