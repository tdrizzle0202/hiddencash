import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushTokenResult {
  token: string | null;
  error: string | null;
}

class NotificationService {
  private pushToken: string | null = null;

  async registerForPushNotifications(): Promise<PushTokenResult> {
    // Check if physical device
    if (!Device.isDevice) {
      return {
        token: null,
        error: "Push notifications require a physical device",
      };
    }

    // Check existing permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return {
        token: null,
        error: "Push notification permission not granted",
      };
    }

    // Get push token
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        process.env.EXPO_PUBLIC_PROJECT_ID ??
        "63df3cf3-5ccf-4308-8246-1504bb01f170";
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      this.pushToken = tokenData.data;

      // Set up Android notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#10B981",
        });
      }

      return { token: this.pushToken, error: null };
    } catch (error) {
      console.error("Failed to get push token:", error);
      return {
        token: null,
        error: "Failed to get push notification token",
      };
    }
  }

  async registerTokenWithServer(): Promise<boolean> {
    if (!this.pushToken) {
      const result = await this.registerForPushNotifications();
      if (!result.token) {
        console.log("No push token available, skipping registration");
        return false;
      }
    }

    try {
      console.log("Registering push token:", this.pushToken);

      // Verify we have a valid session by calling getUser (validates the JWT)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      console.log("Auth state for push registration:", {
        hasUser: !!user,
        userId: user?.id,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userError: userError?.message,
      });

      if (userError || !user) {
        console.log("No valid session for push token registration, skipping");
        return false;
      }

      // Get the access token to pass explicitly (supabase-js sometimes doesn't auto-include it)
      const accessToken = session?.access_token;
      if (!accessToken) {
        console.log("No access token available for push token registration");
        return false;
      }

      const { data, error } = await supabase.functions.invoke(
        "register-push-token",
        {
          body: {
            token: this.pushToken,
            platform: Platform.OS,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (error) {
        console.error("Failed to register token with server:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return false;
      }

      console.log("Push token registered successfully:", data);
      return data?.success === true;
    } catch (error) {
      console.error("Token registration error:", error);
      return false;
    }
  }

  getToken(): string | null {
    return this.pushToken;
  }

  // Add notification listeners
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Get last notification response (for deep linking)
  async getLastNotificationResponse() {
    return Notifications.getLastNotificationResponseAsync();
  }

  // Clear badge count
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }
}

export const notificationService = new NotificationService();
