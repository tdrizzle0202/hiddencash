import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, asyncStoragePersister, queryKeys } from "@/lib/query-client";
import { useAuth } from "@/lib/hooks/useAuth";
import { revenueCat } from "@/lib/revenue-cat";
import { notificationService } from "@/lib/notifications";
import { colors, fonts } from "@/constants/theme";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialized, user } = useAuth();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    // Initialize RevenueCat
    revenueCat.initialize(user?.id);
  }, [user]);

  // Refresh claims when user taps a drip notification
  useEffect(() => {
    const subscription = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === "new_claims" || data?.type === "audit_complete") {
          queryClient.invalidateQueries({ queryKey: queryKeys.claims });
        }
      }
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (initialized && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [initialized, fontsLoaded]);

  if (!initialized || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={styles.container}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            // Max age of persisted data: 24 hours
            maxAge: 24 * 60 * 60 * 1000,
            // Don't block rendering while restoring
            buster: undefined,
          }}
          onSuccess={() => {
            // After restoring cache, refetch stale queries in background
            queryClient.resumePausedMutations().then(() => {
              queryClient.invalidateQueries();
            });
          }}
        >
          <StatusBar style="dark" translucent />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.primary,
              },
              headerTintColor: colors.white,
              headerTitleStyle: {
                fontFamily: fonts.semiBold,
                fontSize: 18,
              },
              headerBackTitleStyle: {
                fontFamily: fonts.regular,
              },
              contentStyle: {
                backgroundColor: colors.background,
              },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="onboarding"
              options={{
                headerShown: false,
                gestureEnabled: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="claim/[id]"
              options={{
                title: "Claim Details",
                presentation: "modal",
                headerStyle: {
                  backgroundColor: colors.white,
                },
                headerTintColor: "#1A3D34",
                headerTitleStyle: {
                  fontFamily: fonts.semiBold,
                  fontSize: 18,
                  color: "#1A3D34",
                },
              }}
            />
          </Stack>
        </PersistQueryClientProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
