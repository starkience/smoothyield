import { TextStyle } from "react-native";

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
};

export const colors = {
  background: "#FFFFFF",
  text: "#000000",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  divider: "#E5E7EB",
  card: "#F9FAFB",
  cardBorder: "#F3F4F6",
  primary: "#000000",
  primaryText: "#FFFFFF",
  accent: "#10B981",
  accentLight: "#ECFDF5",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  warning: "#F59E0B",
  positive: "#10B981",
  negative: "#EF4444",
  tabActive: "#000000",
  tabInactive: "#9CA3AF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography: Record<string, TextStyle> = {
  largeTitle: { fontSize: 34, fontWeight: "700", color: colors.text },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  headline: { fontSize: 17, fontWeight: "600", color: colors.text },
  body: { fontSize: 15, color: colors.text },
  bodyBold: { fontSize: 15, fontWeight: "600", color: colors.text },
  caption: { fontSize: 13, color: colors.textSecondary },
  small: { fontSize: 11, color: colors.textTertiary },
};

export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.cardBorder,
};
