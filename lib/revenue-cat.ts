import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
} from "react-native-purchases";
import { Platform } from "react-native";

const REVENUECAT_IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || "";
const REVENUECAT_ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || "";

// Entitlement ID configured in RevenueCat dashboard
const ENTITLEMENT_ID = "pro";

export interface SubscriptionOffering {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}

class RevenueCatService {
  private initialized = false;

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    const apiKey =
      Platform.OS === "ios" ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;

    if (!apiKey) {
      console.warn("RevenueCat API key not configured");
      return;
    }

    try {
      Purchases.configure({ apiKey });

      if (userId) {
        await Purchases.logIn(userId);
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize RevenueCat:", error);
    }
  }

  async getOfferings(): Promise<SubscriptionOffering> {
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;

      if (!current) {
        return { monthly: null, annual: null };
      }

      // Find packages by identifier
      const packages = current.availablePackages;
      const monthly = packages.find((p) => p.identifier === "pro") || null;
      const annual = packages.find((p) => p.identifier === "yearly") || null;

      return { monthly, annual };
    } catch (error) {
      console.error("Failed to get offerings:", error);
      return { monthly: null, annual: null };
    }
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return this.checkEntitlement(customerInfo);
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled, not an error
        return false;
      }
      console.error("Purchase failed:", error);
      throw error;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return this.checkEntitlement(customerInfo);
    } catch (error) {
      console.error("Failed to restore purchases:", error);
      throw error;
    }
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return this.checkEntitlement(customerInfo);
    } catch (error) {
      console.error("Failed to check subscription:", error);
      return false;
    }
  }

  private checkEntitlement(customerInfo: CustomerInfo): boolean {
    return (
      customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined
    );
  }

  async setUserId(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
    } catch (error) {
      console.error("Failed to set user ID:", error);
    }
  }

  async logout(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.error("Failed to logout from RevenueCat:", error);
    }
  }
}

export const revenueCat = new RevenueCatService();
