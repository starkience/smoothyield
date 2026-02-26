import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { PrivyProvider } from "@privy-io/expo";
import { MarketsScreen } from "./src/screens/MarketsScreen";
import { PortfolioScreen } from "./src/screens/PortfolioScreen";
import { YieldScreen } from "./src/screens/YieldScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AuthProvider } from "./src/context/AuthContext";

const Tab = createBottomTabNavigator();

export default function App() {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID || "";

  return (
    <PrivyProvider appId={appId}>
      <AuthProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: { backgroundColor: "#0B1220", borderTopColor: "#1F2A3C" },
              tabBarActiveTintColor: "#1EC98A",
              tabBarInactiveTintColor: "#64748B"
            }}
          >
            <Tab.Screen name="Markets" component={MarketsScreen} />
            <Tab.Screen name="Portfolio" component={PortfolioScreen} />
            <Tab.Screen name="Passive Bitcoin yield" component={YieldScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </PrivyProvider>
  );
}
