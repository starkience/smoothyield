import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  title: string;
  subtitle: string;
  amountUsd: number;
}

export const TransactionRow: React.FC<Props> = ({ title, subtitle, amountUsd }) => {
  const positive = amountUsd >= 0;
  const formatted =
    (positive ? "+" : "") +
    amountUsd.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={[styles.amount, positive ? styles.positive : styles.negative]}>
        {formatted}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  left: { flex: 1 },
  title: { fontSize: 15, fontWeight: "500", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "600" },
  positive: { color: colors.positive },
  negative: { color: colors.text },
});
