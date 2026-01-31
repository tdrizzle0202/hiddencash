import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

const DARK_GREEN = "#1A3D34";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  // Only show search and results tabs
  const visibleRoutes = state.routes.filter(
    (route: any) => route.name === "search" || route.name === "results"
  );

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom || 20 }]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBarInner}>
          {visibleRoutes.map((route: any) => {
            const { options } = descriptors[route.key];
            const isFocused = state.routes[state.index].name === route.name;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            let iconName: keyof typeof Ionicons.glyphMap = "home";
            if (route.name === "search") {
              iconName = isFocused ? "home" : "home-outline";
            } else if (route.name === "results") {
              iconName = isFocused ? "wallet" : "wallet-outline";
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={[styles.tabButton, isFocused && styles.tabButtonActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={iconName}
                  size={24}
                  color={isFocused ? DARK_GREEN : "rgba(255,255,255,0.6)"}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        sceneContainerStyle={styles.sceneContainer}
        screenOptions={{
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
        }}
      >
        <Tabs.Screen
          name="search"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="results"
          options={{
            title: "Wallet",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sceneContainer: {
    backgroundColor: colors.background,
  },
  tabBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  tabBarContainer: {
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: "#1C1C1C",
  },
  tabBarInner: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  tabButton: {
    width: 64,
    height: 48,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
