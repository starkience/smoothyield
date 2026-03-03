import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  index: { active: "home", inactive: "home-outline" },
  invest: { active: "trending-up", inactive: "trending-up-outline" },
  portfolio: { active: "pie-chart", inactive: "pie-chart-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

const TAB_LABELS: Record<string, string> = {
  index: "Home",
  invest: "Invest",
  portfolio: "Portfolio",
  profile: "Profile",
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "ios" ? insets.bottom : 4;
  const tabBarHeight = 52 + bottomPad;

  return (
    <Tabs
      screenOptions={({ route }) => {
        const icons = TAB_ICONS[route.name] ?? TAB_ICONS.index;
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.divider,
            borderTopWidth: 1,
            paddingBottom: bottomPad,
            height: tabBarHeight,
          },
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const, marginBottom: 2 },
          tabBarLabel: TAB_LABELS[route.name] ?? route.name,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />
          ),
        };
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="invest" />
      <Tabs.Screen name="portfolio" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
