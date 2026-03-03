import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "outline";
}

export const PrimaryButton: React.FC<Props> = ({
  title,
  onPress,
  loading,
  disabled,
  style,
  variant = "primary",
}) => (
  <TouchableOpacity
    style={[
      styles.button,
      variant === "outline" && styles.outline,
      disabled && styles.disabled,
      style,
    ]}
    onPress={onPress}
    activeOpacity={0.8}
    disabled={disabled || loading}
  >
    {loading ? (
      <ActivityIndicator color={variant === "outline" ? colors.primary : colors.primaryText} />
    ) : (
      <Text style={[styles.text, variant === "outline" && styles.outlineText]}>
        {title}
      </Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: spacing.md,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "700",
  },
  outlineText: {
    color: colors.primary,
  },
});
