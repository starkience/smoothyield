import "dotenv/config";
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "TradFi Yield",
  slug: "tradfi-yield",
  scheme: "tradfi-yield",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.smoothyield.app"
  },
  android: {
    package: "com.smoothyield.app"
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001",
    privyAppId: process.env.EXPO_PUBLIC_PRIVY_APP_ID || "",
    devMode: process.env.EXPO_PUBLIC_DEV_MODE || "true"
  }
};

export default config;
