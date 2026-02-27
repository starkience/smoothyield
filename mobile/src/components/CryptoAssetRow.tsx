import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  iconColor: string;
  holding: number;       // amount held (e.g. 0.05 BTC)
  holdingValueUsd: number;
}

export const CryptoAssetRow: React.FC<Props> = ({
  symbol,
  name,
  price,
  changePct,
  iconColor,
  holding,
  holdingValueUsd,
}) => {
  const positive = changePct >= 0;

  return (
    <View style={styles.row}>
      {/* Icon circle */}
      <View style={[styles.icon, { backgroundColor: iconColor + "22" }]}>
        <Text style={[styles.iconText, { color: iconColor }]}>
          {symbol.slice(0, 1)}
        </Text>
      </View>

      {/* Name + holding */}
      <View style={styles.left}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.name}>
          {holding > 0 ? `${holding} ${symbol}` : name}
        </Text>
      </View>

      {/* Sparkline placeholder */}
      <View style={styles.sparkWrap}>
        <View style={[styles.spark, positive ? styles.sparkUp : styles.sparkDown]} />
      </View>

      {/* Price + change */}
      <View style={styles.right}>
        <Text style={styles.price}>
          ${price >= 1000 ? price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : price.toFixed(2)}
        </Text>
        <Text style={[styles.change, positive ? styles.up : styles.down]}>
          {positive ? "+" : ""}{changePct.toFixed(2)}%
        </Text>
        {holdingValueUsd > 0 && (
          <Text style={styles.holdingValue}>${holdingValueUsd.toFixed(2)}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A3C",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
    fontWeight: "800",
  },
  left: { flex: 1 },
  symbol: { color: "#F3F5F7", fontSize: 16, fontWeight: "700" },
  name: { color: "#96A4B8", fontSize: 12, marginTop: 2 },
  sparkWrap: { width: 50, height: 24, marginHorizontal: 10 },
  spark: { height: 24, borderRadius: 4, width: "100%" },
  sparkUp: { backgroundColor: "#1EC98A33" },
  sparkDown: { backgroundColor: "#F86A5C33" },
  right: { alignItems: "flex-end", minWidth: 80 },
  price: { color: "#F3F5F7", fontSize: 14, fontWeight: "600" },
  change: { fontSize: 12, marginTop: 2 },
  holdingValue: { color: "#96A4B8", fontSize: 11, marginTop: 2 },
  up: { color: "#1EC98A" },
  down: { color: "#F86A5C" },
});
