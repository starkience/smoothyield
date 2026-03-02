import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MarketsScreen } from "./src/screens/MarketsScreen";
import { CryptoScreen } from "./src/screens/CryptoScreen";
import { PortfolioScreen } from "./src/screens/PortfolioScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICON: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Stocks: { active: "trending-up",  inactive: "trending-up-outline" },
  Crypto: { active: "logo-bitcoin", inactive: "logo-bitcoin" },
  Portfolio: { active: "wallet",    inactive: "wallet-outline" },
  Profile:{ active: "person",       inactive: "person-outline" },
};

function MainTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0B1220",
            borderTopColor: "#1F2A3C",
            paddingBottom: 4,
            height: 58,
          },
          tabBarActiveTintColor: "#1EC98A",
          tabBarInactiveTintColor: "#4A5568",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
          tabBarIcon: ({ color, size, focused }) => {
            const icons = TAB_ICON[route.name];
            const name = focused ? icons.active : icons.inactive;
            return <Ionicons name={name} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Stocks"   component={MarketsScreen} />
        <Tab.Screen name="Crypto"   component={CryptoScreen} />
        <Tab.Screen name="Portfolio" component={PortfolioScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function RootNavigator() {
  const { sessionId, loading } = useAuth();
  const { user, isReady } = usePrivy();
  const [initTimeout, setInitTimeout] = React.useState(false);

  // If Privy never becomes ready (known issue on some devices), stop blocking after 5s
  React.useEffect(() => {
    const t = setTimeout(() => setInitTimeout(true), 5_000);
    return () => clearTimeout(t);
  }, []);

  const showLoading = (loading || !isReady) && !initTimeout;

  if (showLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B1220", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#1EC98A" size="large" />
      </View>
    );
  }

  // Gate on Privy user — show login when no user. If user exists but backend failed, still show main app
  // but Profile will show "Log out" so you can get back to the login screen.
  if (!user) return <LoginScreen />;

  return <MainTabs />;
}

export default function App() {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID || "cmm3npboo05370cjr7kp9sbg6";

  return (
    <PrivyProvider appId={appId} clientId="client-WY6Wi7ufTkY2bWNZNJpg3K73eNJwg6Aq7RVZAAkLdA4F7">
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </PrivyProvider>
  );
}
