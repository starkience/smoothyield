import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Slot } from "expo-router";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { LoginScreen } from "../src/screens/LoginScreen";
import { colors } from "../src/theme";

// Set Inter as the default font for all <Text> components
const originalRender = (Text as any).render;
if (originalRender) {
  (Text as any).render = function (props: any, ref: any) {
    const style = props.style;
    const flatStyle = StyleSheet.flatten(style) || {};
    const weight = flatStyle.fontWeight;

    let fontFamily = "Inter_400Regular";
    if (weight === "500") fontFamily = "Inter_500Medium";
    else if (weight === "600") fontFamily = "Inter_600SemiBold";
    else if (weight === "700") fontFamily = "Inter_700Bold";
    else if (weight === "800") fontFamily = "Inter_800ExtraBold";
    else if (weight === "bold") fontFamily = "Inter_700Bold";

    return originalRender.call(
      this,
      { ...props, style: [{ fontFamily }, style] },
      ref,
    );
  };
}

function RootGate() {
  const { loading } = useAuth();
  const { user, isReady } = usePrivy();
  const [initTimeout, setInitTimeout] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setInitTimeout(true), 5_000);
    return () => clearTimeout(t);
  }, []);

  const showLoading = (loading || !isReady) && !initTimeout;

  if (showLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  return <Slot />;
}

export default function RootLayout() {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID || "cmm3npboo05370cjr7kp9sbg6";

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  return (
    <PrivyProvider appId={appId} clientId="client-WY6Wi7ufTkY2bWNZNJpg3K73eNJwg6Aq7RVZAAkLdA4F7">
      <AuthProvider>
        <RootGate />
      </AuthProvider>
    </PrivyProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
