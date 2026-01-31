import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase, Claim } from "@/lib/supabase";
import { useClaims } from "@/lib/hooks/useClaims";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PaywallModal } from "@/components/PaywallModal";
import { fonts, colors, spacing } from "@/constants/theme";

const DARK_GREEN = "#1A3D34";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

const STATE_URLS: Record<string, string> = {
  AL: "https://missingmoney.al.gov/app/claim-search",
  AK: "https://unclaimedproperty.alaska.gov/app/claim-search",
  AZ: "https://azdor.gov/unclaimed-property/search-unclaimed-property",
  AR: "https://www.claimitarkansas.org/app/claim-search",
  CA: "https://claimit.ca.gov/app/claim-search",
  CO: "https://colorado.findyourunclaimedproperty.com/app/claim-search",
  CT: "https://ctbiglist.com/app/claim-search",
  DE: "https://unclaimedproperty.delaware.gov/app/claim-search",
  DC: "https://cfo.dc.gov/unclaimed-property/app/claim-search",
  FL: "https://www.fltreasurehunt.gov/app/claim-search",
  GA: "https://georgia.findyourunclaimedproperty.com/app/claim-search",
  HI: "https://hawaii.findyourunclaimedproperty.com/app/claim-search",
  ID: "https://yourmoney.idaho.gov/app/claim-search",
  IL: "https://icash.illinoistreasurer.gov/app/claim-search",
  IN: "https://indianaunclaimed.gov/app/claim-search",
  IA: "https://greatiowatreasruehunt.gov/app/claim-search",
  KS: "https://missingmoney.ks.gov/app/claim-search",
  KY: "https://missingmoney.ky.gov/app/claim-search",
  LA: "https://www.latreasury.com/app/claim-search",
  ME: "https://maine.findyourunclaimedproperty.com/app/claim-search",
  MD: "https://maryland.findyourunclaimedproperty.com/app/claim-search",
  MA: "https://findmassmoney.com/app/claim-search",
  MI: "https://unclaimedproperty.michigan.gov/app/claim-search",
  MN: "https://mn.findyourunclaimedproperty.com/app/claim-search",
  MS: "https://treasury.ms.gov/unclaimed-property/app/claim-search",
  MO: "https://treasurer.mo.gov/unclaimedproperty/app/claim-search",
  MT: "https://mtrevenue.gov/unclaimed-property/app/claim-search",
  NE: "https://treasurer.nebraska.gov/up/app/claim-search",
  NV: "https://nevadatreasurer.gov/unclaimed-property/app/claim-search",
  NH: "https://www.nh.gov/treasury/unclaimed-property/app/claim-search",
  NJ: "https://www.njtreasure.gov/app/claim-search",
  NM: "https://nmpossibility.com/app/claim-search",
  NY: "https://ouf.osc.ny.gov/app/claim-search",
  NC: "https://www.nccash.com/app/claim-search",
  ND: "https://ndunclaimed.findyourunclaimedproperty.com/app/claim-search",
  OH: "https://com.ohio.gov/unclaimedproperty/app/claim-search",
  OK: "https://oklahoma.findyourunclaimedproperty.com/app/claim-search",
  OR: "https://oregon.findyourunclaimedproperty.com/app/claim-search",
  PA: "https://unclaimedproperty.patreasury.gov/en/Property/SearchIndex",
  RI: "https://findrimoney.com/app/claim-search",
  SC: "https://southcarolina.findyourunclaimedproperty.com/app/claim-search",
  SD: "https://sdtreasurer.gov/unclaimed-property/app/claim-search",
  TN: "https://treasury.tn.gov/unclaimed-property/app/claim-search",
  TX: "https://www.claimittexas.gov/app/claim-search",
  UT: "https://mycash.utah.gov/app/claim-search",
  VT: "https://vermont.findyourunclaimedproperty.com/app/claim-search",
  VA: "https://vamoneysearch.org/app/claim-search",
  WA: "https://ucp.dor.wa.gov/app/claim-search",
  WV: "https://wvtreasury.com/unclaimed-property/app/claim-search",
  WI: "https://statetreasury.wisconsin.gov/ucpm/app/claim-search",
  WY: "https://wyoming.findyourunclaimedproperty.com/app/claim-search",
};

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { updateClaimStatus } = useClaims();
  const { isSubscribed } = useSubscription();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showClaimConfirm, setShowClaimConfirm] = useState(false);

  useEffect(() => {
    fetchClaimDetails();
  }, [id]);

  const fetchClaimDetails = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("user_claims")
        .select(
          `
          id,
          status,
          claim:claims (
            id,
            state_code,
            owner_name,
            owner_city,
            owner_state,
            owner_zip,
            property_type,
            holder_name,
            amount,
            amount_text,
            claim_url,
            reported_date
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setClaim({
          ...(data.claim as any),
          id: data.id, // user_claims.id - must come AFTER spread to avoid being overwritten
          status: data.status,
        });

        // Mark as viewed
        if (data.status === "new") {
          updateClaimStatus(data.id, "viewed");
        }
      }
    } catch (error) {
      console.error("Failed to fetch claim:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    if (!claim) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Toggle: if already liked, return to new; otherwise like
    const newStatus = claim.status === "liked" ? "new" : "liked";
    setClaim((prev) => prev ? { ...prev, status: newStatus } : null);
    updateClaimStatus(claim.id, newStatus);
  };

  const handleDislike = () => {
    if (!claim) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Toggle: if already disliked, return to new; otherwise dislike
    const newStatus = claim.status === "disliked" ? "new" : "disliked";
    setClaim((prev) => prev ? { ...prev, status: newStatus } : null);
    updateClaimStatus(claim.id, newStatus);
  };

  const handleMarkAsClaimed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowClaimConfirm(true);
  };

  const confirmClaim = () => {
    if (!claim) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Update cache optimistically and persist to server
    updateClaimStatus(claim.id, "claimed");
    setShowClaimConfirm(false);
    // Navigate back immediately - claim will appear in Wallet via optimistic update
    router.back();
  };

  const handleClaimNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isSubscribed) {
      setShowPaywall(true);
      return;
    }

    const stateUrl = claim?.state_code ? STATE_URLS[claim.state_code] : null;
    if (stateUrl) {
      Alert.alert(
        "Claim Your Money",
        "You'll be redirected to the official state website to file your claim. The claim process is handled directly by the state - LostCash does not process claims.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to State Site",
            onPress: () => {
              Linking.openURL(stateUrl);
            },
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DARK_GREEN} />
      </View>
    );
  }

  if (!claim) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Claim not found</Text>
      </View>
    );
  }

  const isLocked = !isSubscribed;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.stateTag}>
          <Text style={styles.stateText}>{STATE_NAMES[claim.state_code] || claim.state_code}</Text>
        </View>
        {isLocked ? (
          <TouchableOpacity onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowPaywall(true);
          }}>
            <Text style={styles.amountLocked}>Unlock to see</Text>
          </TouchableOpacity>
        ) : (
          <Text style={claim.amount ? styles.amount : styles.amountText}>
            {claim.amount ? `$${claim.amount.toLocaleString()}` : claim.amount_text || "TBD"}
          </Text>
        )}
        <Text style={styles.headerSubtitle}>Unclaimed Property</Text>
      </View>

      {/* Details Section */}
      <View style={styles.section}>
        <View style={styles.detailCard}>
          <DetailRow
            label="Holder"
            value={isLocked ? "••••••••" : claim.holder_name}
            icon="business-outline"
            locked={isLocked}
          />
          <DetailRow
            label="Owner"
            value={isLocked ? "••••••••" : claim.owner_name}
            icon="person-outline"
            locked={isLocked}
          />
          {claim.owner_city && (
            <DetailRow
              label="Location"
              value={
                isLocked
                  ? "••••••••"
                  : `${claim.owner_city}, ${claim.owner_state} ${claim.owner_zip || ""}`.trim()
              }
              icon="location-outline"
              locked={isLocked}
            />
          )}
          {claim.reported_date && (
            <DetailRow
              label="Reported"
              value={claim.reported_date}
              icon="calendar-outline"
              isLast
            />
          )}
        </View>
      </View>

      {/* Upgrade Prompt for Locked State */}
      {isLocked && (
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeIconWrapper}>
            <Ionicons name="lock-closed" size={24} color={DARK_GREEN} />
          </View>
          <Text style={styles.upgradeTitle}>Unlock Full Details</Text>
          <Text style={styles.upgradeText}>
            Get the owner info and direct link to file your claim
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowPaywall(true);
            }}
          >
            <Text style={styles.upgradeButtonText}>Unlock Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.dislikeButton,
            claim.status === "disliked" && styles.actionButtonActive,
          ]}
          onPress={handleDislike}
        >
          <Ionicons
            name={claim.status === "disliked" ? "thumbs-down" : "thumbs-down-outline"}
            size={24}
            color={claim.status === "disliked" ? colors.white : DARK_GREEN}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.likeButton,
            claim.status === "liked" && styles.actionButtonActive,
          ]}
          onPress={handleLike}
        >
          <Ionicons
            name={claim.status === "liked" ? "thumbs-up" : "thumbs-up-outline"}
            size={24}
            color={claim.status === "liked" ? colors.white : DARK_GREEN}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.claimedActionButton]}
          onPress={handleMarkAsClaimed}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color={DARK_GREEN} />
          <Text style={styles.claimedButtonText}>Claim</Text>
        </TouchableOpacity>
      </View>

      {/* Go to State Site Button for Unlocked State */}
      {!isLocked && (
        <TouchableOpacity style={styles.claimButton} onPress={handleClaimNow}>
          <Text style={styles.claimButtonText}>Claim Now</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        Claims are filed directly with state agencies. Processing times vary by state.
      </Text>

      {/* Claim Confirmation Modal */}
      <Modal
        visible={showClaimConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClaimConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrapper}>
              <Ionicons name="checkmark-circle" size={48} color={DARK_GREEN} />
            </View>
            <Text style={styles.modalTitle}>Mark as Claimed?</Text>
            <Text style={styles.modalText}>
              Have you successfully filed this claim with the state? This will move it to your claimed list.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowClaimConfirm(false);
                }}
              >
                <Text style={styles.modalCancelText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmClaim}
              >
                <Text style={styles.modalConfirmText}>Yes, Claimed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PaywallModal
        visible={showPaywall}
        onClose={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowPaywall(false);
        }}
        onSuccess={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowPaywall(false);
          fetchClaimDetails();
        }}
      />
    </ScrollView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  locked?: boolean;
  isLast?: boolean;
}

function DetailRow({ label, value, icon, locked, isLast }: DetailRowProps) {
  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={20} color={DARK_GREEN} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, locked && styles.lockedValue]}>
          {value}
        </Text>
      </View>
      {locked && <Ionicons name="lock-closed" size={16} color={colors.textMuted} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  headerCard: {
    backgroundColor: DARK_GREEN,
    margin: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
  },
  stateTag: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  stateText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.white,
  },
  amount: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  amountText: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  amountLocked: {
    fontSize: 18,
    fontFamily: fonts.medium,
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "underline",
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.6)",
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E8F5F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  lockedValue: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  upgradeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: "center",
  },
  upgradeIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F5F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  upgradeTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: DARK_GREEN,
    marginBottom: spacing.xs,
  },
  upgradeText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  upgradeButton: {
    backgroundColor: DARK_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  claimButton: {
    backgroundColor: DARK_GREEN,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  claimButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.semiBold,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  actionButtonActive: {
    backgroundColor: DARK_GREEN,
  },
  dislikeButton: {
    flex: 0.8,
  },
  likeButton: {
    flex: 0.8,
  },
  claimedActionButton: {
    flex: 1.4,
  },
  claimedButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: DARK_GREEN,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  modalIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F5F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: DARK_GREEN,
    marginBottom: spacing.sm,
  },
  modalText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: DARK_GREEN,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
});
