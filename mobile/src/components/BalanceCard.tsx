import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  totalBalanceUsd: number;
  cashUsd: number;
}

export const BalanceCard: React.FC<Props> = ({ totalBalanceUsd, cashUsd }) => (
  <View style={styles.container}>
    <Text style={styles.balance}>
      {totalBalanceUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}
    </Text>
    <Text style={styles.cash}>
      Cash{" "}
      {cashUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  balance: {
    fontSize: 38,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  cash: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
