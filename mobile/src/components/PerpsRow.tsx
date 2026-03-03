import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { colors, spacing } from "../theme";
import type { PerpSide } from "../mockData";

interface Props {
  symbol: string;
  name: string;
  priceUsd: number;
  side?: PerpSide;
  pnlUsd?: number;
  mode?: "market" | "position";
}

export const PerpsRow: React.FC<Props> = ({
  symbol,
  name,
  priceUsd,
  side,
  pnlUsd,
  mode = "market",
}) => (
  <View style={styles.row}>
    <View style={styles.info}>
      <Text style={styles.symbol}>{symbol}</Text>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
    </View>

    <Text style={styles.price}>
      {priceUsd.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: priceUsd < 10 ? 4 : 2,
      })}
    </Text>

    {mode === "market" ? (
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.longBtn}
          onPress={() => Alert.alert(`Long ${symbol}`, `Open a long position on ${symbol}?`)}
        >
          <Text style={styles.longText}>Long</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortBtn}
          onPress={() => Alert.alert(`Short ${symbol}`, `Open a short position on ${symbol}?`)}
        >
          <Text style={styles.shortText}>Short</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.positionInfo}>
        <View style={[styles.sideBadge, side === "Long" ? styles.longBadge : styles.shortBadge]}>
          <Text style={[styles.sideText, side === "Long" ? styles.longSideText : styles.shortSideText]}>
            {side}
          </Text>
        </View>
        {pnlUsd != null && (
          <Text style={[styles.pnl, pnlUsd >= 0 ? styles.pnlPos : styles.pnlNeg]}>
            {(pnlUsd >= 0 ? "+" : "") + pnlUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          </Text>
        )}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  info: { flex: 1 },
  symbol: { fontSize: 15, fontWeight: "600", color: colors.text },
  name: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  price: { fontSize: 14, fontWeight: "500", color: colors.text, marginRight: 10 },
  actions: { flexDirection: "row", gap: 6 },
  longBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#ECFDF5",
  },
  longText: { color: colors.positive, fontSize: 12, fontWeight: "600" },
  shortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
  shortText: { color: colors.negative, fontSize: 12, fontWeight: "600" },
  positionInfo: { alignItems: "flex-end" },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 2,
  },
  longBadge: { backgroundColor: "#ECFDF5" },
  shortBadge: { backgroundColor: "#FEF2F2" },
  sideText: { fontSize: 11, fontWeight: "600" },
  longSideText: { color: colors.positive },
  shortSideText: { color: colors.negative },
  pnl: { fontSize: 13, fontWeight: "600" },
  pnlPos: { color: colors.positive },
  pnlNeg: { color: colors.negative },
});
