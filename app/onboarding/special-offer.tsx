import { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Animated,
    Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useOnboardingContext } from "@/lib/hooks/useOnboarding";
import { useClaims } from "@/lib/hooks/useClaims";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { colors, fonts, spacing } from "@/constants/theme";

export default function SpecialOfferScreen() {
    const router = useRouter();
    const { offerings, purchase, checkSubscription, loading: purchaseLoading } = useSubscription();
    const { firstName, lastName, selectedStates, estimatedAmount, completeOnboarding } = useOnboardingContext();
    const { createSearch, fetchClaims } = useClaims();
    const { user } = useAuth();

    const [giftRevealed, setGiftRevealed] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Animation values for gift box
    const giftScale = useRef(new Animated.Value(0)).current;
    const giftShake = useRef(new Animated.Value(0)).current;
    const lidRotate = useRef(new Animated.Value(0)).current;
    const lidTranslate = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const contentScale = useRef(new Animated.Value(0.5)).current;
    const sparkleOpacity = useRef(new Animated.Value(0)).current;

    const loading = purchaseLoading || isProcessing;

    // Gift box animation sequence
    const playGiftAnimation = () => {
        // Reset values
        giftScale.setValue(0);
        giftShake.setValue(0);
        lidRotate.setValue(0);
        lidTranslate.setValue(0);
        contentOpacity.setValue(0);
        contentScale.setValue(0.5);
        sparkleOpacity.setValue(0);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Sequence: appear -> shake -> open lid -> reveal content
        Animated.sequence([
            // Gift appears with bounce
            Animated.spring(giftScale, {
                toValue: 1,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
            }),
            // Shake animation
            Animated.sequence([
                Animated.timing(giftShake, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(giftShake, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(giftShake, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(giftShake, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(giftShake, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]),
            // Small pause
            Animated.delay(200),
            // Open lid
            Animated.parallel([
                Animated.timing(lidRotate, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                }),
                Animated.timing(lidTranslate, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setGiftRevealed(true);
            // Reveal content
            Animated.parallel([
                Animated.timing(contentOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(contentScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(sparkleOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    // Start animation on mount
    useEffect(() => {
        const timer = setTimeout(() => playGiftAnimation(), 100);
        return () => clearTimeout(timer);
    }, []);

    // Handle close button - FOR TESTING: same flow as payment success
    const handleClose = async () => {
        setIsProcessing(true);
        try {
            // TESTING: Set user as subscribed (skip actual RevenueCat purchase)
            if (user) {
                console.log("[SpecialOffer] TESTING: Setting user as subscribed...");
                const { error: subscriptionError } = await supabase.from("user_subscriptions").upsert({
                    user_id: user.id,
                    is_subscribed: true,
                    subscription_type: "test_subscription",
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

                if (subscriptionError) {
                    console.error("[SpecialOffer] Failed to set subscription:", subscriptionError);
                    throw new Error("Failed to activate subscription");
                }

                // Refresh subscription state
                await checkSubscription();
            }

            // Same flow as handleSpecialOfferPurchase success
            if (firstName && lastName && selectedStates.length > 0) {
                const firstState = selectedStates[0];
                console.log("[SpecialOffer] Starting initial search...", { firstName, lastName, state: firstState });
                await createSearch({
                    firstName,
                    lastName,
                    states: [firstState],
                });
            }

            await completeOnboarding();
            // Navigate directly to home page - the searching indicator will show there
            router.replace("/(tabs)/search");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle special offer purchase ($19.99/year)
    const handleSpecialOfferPurchase = async () => {
        // Use the annual package for the special offer
        const pkg = offerings.annual;

        if (!pkg) {
            Alert.alert("Error", "This offer is not available. Please try again later.");
            return;
        }

        try {
            setIsProcessing(true);
            const success = await purchase(pkg);
            if (success) {
                // Refresh subscription state to ensure it's synced
                await checkSubscription();

                // Trigger the initial search with onboarding data (one state at a time)
                if (firstName && lastName && selectedStates.length > 0) {
                    const firstState = selectedStates[0];
                    console.log("[SpecialOffer] Starting initial search...", { firstName, lastName, state: firstState });
                    await createSearch({
                        firstName,
                        lastName,
                        states: [firstState],
                    });
                }

                await completeOnboarding();
                // Navigate directly to home page - the searching indicator will show there
                router.replace("/(tabs)/search");
            }
        } catch (error: any) {
            if (!error.message?.includes("cancelled")) {
                Alert.alert("Purchase Failed", error.message || "Please try again.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const lidRotateInterpolate = lidRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-120deg'],
    });
    const lidTranslateY = lidTranslate.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30],
    });

    return (
        <SafeAreaView style={styles.specialOfferContainer}>
            <View style={styles.specialOfferContent}>
                {/* Gift Box Animation */}
                <Animated.View
                    style={[
                        styles.giftContainer,
                        {
                            transform: [
                                { scale: giftScale },
                                { translateX: giftShake },
                            ],
                        },
                    ]}
                >
                    {/* Sparkles */}
                    <Animated.View style={[styles.sparkleContainer, { opacity: sparkleOpacity }]}>
                        <View style={[styles.sparkle, styles.sparkle1]}>
                            <Ionicons name="sparkles" size={24} color={colors.accentLight} />
                        </View>
                        <View style={[styles.sparkle, styles.sparkle2]}>
                            <Ionicons name="sparkles" size={20} color={colors.accent} />
                        </View>
                        <View style={[styles.sparkle, styles.sparkle3]}>
                            <Ionicons name="sparkles" size={18} color={colors.accentLight} />
                        </View>
                        <View style={[styles.sparkle, styles.sparkle4]}>
                            <Ionicons name="sparkles" size={22} color={colors.accent} />
                        </View>
                    </Animated.View>

                    {/* Gift Lid */}
                    <Animated.View
                        style={[
                            styles.giftLid,
                            {
                                transform: [
                                    { translateY: lidTranslateY },
                                    { rotate: lidRotateInterpolate },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.giftLidTop} />
                        <View style={styles.giftRibbonTop} />
                    </Animated.View>

                    {/* Gift Box */}
                    <View style={styles.giftBox}>
                        <View style={styles.giftRibbonVertical} />
                        <View style={styles.giftRibbonHorizontal} />
                        {/* Content inside box */}
                        <Animated.View
                            style={[
                                styles.giftInnerContent,
                                {
                                    opacity: contentOpacity,
                                    transform: [{ scale: contentScale }],
                                },
                            ]}
                        >
                            <Text style={styles.giftMoneyIcon}>$</Text>
                        </Animated.View>
                    </View>
                </Animated.View>

                {/* Offer Text */}
                {giftRevealed && (
                    <Animated.View
                        style={[
                            styles.offerTextContainer,
                            {
                                opacity: contentOpacity,
                                transform: [{ scale: contentScale }],
                            },
                        ]}
                    >
                        <Text style={styles.waitText}>WAIT!</Text>
                        <Text style={styles.specialOfferTitle}>One-Time Secret Deal</Text>
                        <Text style={styles.neverAgainText}>You'll never see this offer again</Text>

                        <View style={styles.priceContainer}>
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountBadgeText}>87% OFF</Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={styles.originalPrice}>$149.99</Text>
                                <Text style={styles.specialPrice}>$19.99</Text>
                            </View>
                            <Text style={styles.perMonthText}>Just $1.66/month</Text>
                            <Text style={styles.billedText}>Billed annually</Text>
                        </View>

                        <View style={styles.specialFeatures}>
                            <View style={styles.specialFeatureRow}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={styles.specialFeatureText}>Unlimited searches forever</Text>
                            </View>
                            <View style={styles.specialFeatureRow}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={styles.specialFeatureText}>See all claim amounts</Text>
                            </View>
                            <View style={styles.specialFeatureRow}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={styles.specialFeatureText}>Direct claim filing links</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.specialOfferButton, loading && styles.purchaseButtonDisabled]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                handleSpecialOfferPurchase();
                            }}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <>
                                    <ActivityIndicator color={colors.white} />
                                    {isProcessing && !purchaseLoading && (
                                        <Text style={[styles.specialOfferButtonText, { marginLeft: 8 }]}>Searching...</Text>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Ionicons name="gift" size={22} color={colors.white} />
                                    <Text style={styles.specialOfferButtonText}>Claim This Deal</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.noThanksButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleClose();
                            }}
                            disabled={loading}
                        >
                            <Text style={[styles.noThanksText, loading && { opacity: 0.5 }]}>
                                {isProcessing ? "Searching..." : "No thanks, I'll pay full price later"}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    specialOfferContainer: {
        flex: 1,
        backgroundColor: colors.white,
    },
    specialOfferContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
    },
    giftContainer: {
        width: 140,
        height: 160,
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: spacing.xl,
    },
    sparkleContainer: {
        position: "absolute",
        width: 200,
        height: 200,
        top: -20,
    },
    sparkle: {
        position: "absolute",
    },
    sparkle1: {
        top: 0,
        left: 20,
    },
    sparkle2: {
        top: 30,
        right: 10,
    },
    sparkle3: {
        bottom: 40,
        left: 0,
    },
    sparkle4: {
        bottom: 20,
        right: 20,
    },
    giftLid: {
        width: 130,
        height: 30,
        alignItems: "center",
        zIndex: 2,
        transformOrigin: "left center",
    },
    giftLidTop: {
        width: 130,
        height: 25,
        backgroundColor: colors.accent,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    giftRibbonTop: {
        position: "absolute",
        width: 30,
        height: 30,
        backgroundColor: colors.error,
        left: "50%",
        marginLeft: -15,
        borderRadius: 4,
    },
    giftBox: {
        width: 120,
        height: 100,
        backgroundColor: colors.accent,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    giftRibbonVertical: {
        position: "absolute",
        width: 24,
        height: "100%",
        backgroundColor: colors.error,
    },
    giftRibbonHorizontal: {
        position: "absolute",
        width: "100%",
        height: 24,
        backgroundColor: colors.error,
    },
    giftInnerContent: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
    giftMoneyIcon: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: colors.white,
    },
    offerTextContainer: {
        alignItems: "center",
        width: "100%",
    },
    waitText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: colors.error,
        letterSpacing: 4,
        marginBottom: spacing.xs,
    },
    specialOfferTitle: {
        fontSize: 28,
        fontFamily: fonts.bold,
        color: colors.textPrimary,
        textAlign: "center",
        marginBottom: spacing.xs,
    },
    neverAgainText: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: spacing.lg,
    },
    priceContainer: {
        alignItems: "center",
        backgroundColor: colors.primaryFaded,
        borderRadius: 16,
        padding: spacing.lg,
        width: "100%",
        marginBottom: spacing.lg,
    },
    discountBadge: {
        backgroundColor: colors.error,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: 20,
        marginBottom: spacing.sm,
    },
    discountBadgeText: {
        color: colors.white,
        fontFamily: fonts.bold,
        fontSize: 14,
        letterSpacing: 1,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    originalPrice: {
        fontSize: 20,
        fontFamily: fonts.regular,
        color: colors.textMuted,
        textDecorationLine: "line-through",
    },
    specialPrice: {
        fontSize: 48,
        fontFamily: fonts.extraBold,
        color: colors.primary,
    },
    perMonthText: {
        fontSize: 18,
        fontFamily: fonts.semiBold,
        color: colors.primaryDark,
        marginTop: spacing.xs,
    },
    billedText: {
        fontSize: 13,
        fontFamily: fonts.regular,
        color: colors.textSecondary,
        marginTop: 2,
    },
    specialFeatures: {
        width: "100%",
        marginBottom: spacing.lg,
    },
    specialFeatureRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    specialFeatureText: {
        fontSize: 15,
        fontFamily: fonts.regular,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },
    specialOfferButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 14,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
        marginBottom: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    purchaseButtonDisabled: {
        backgroundColor: colors.border,
    },
    specialOfferButtonText: {
        color: colors.white,
        fontSize: 20,
        fontFamily: fonts.bold,
        marginLeft: spacing.sm,
    },
    noThanksButton: {
        paddingVertical: spacing.md,
        alignItems: "center",
    },
    noThanksText: {
        color: colors.textMuted,
        fontFamily: fonts.regular,
        fontSize: 13,
    },
});
