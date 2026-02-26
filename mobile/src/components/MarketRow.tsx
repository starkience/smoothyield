import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const MarketRow: React.FC<{
  ticker: string;
  name: string;
  price: number;
  changePct: number;
}> = ({ ticker, name, price, changePct }) => {
  const positive = changePct >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.ticker}>{ticker}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.sparkline}>
        <View style={[styles.spark, positive ? styles.sparkUp : styles.sparkDown]} />
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>${price.toFixed(2)}</Text>
        <Text style={[styles.change, positive ? styles.up : styles.down]}>
          {positive ? "+" : ""}
          {changePct.toFixed(2)}%
        </Text>
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
    borderBottomColor: "#1F2A3C"
  },
  left: { flex: 1 },
  ticker: { color: "#F3F5F7", fontSize: 16, fontWeight: "700" },
  name: { color: "#96A4B8", fontSize: 12, marginTop: 2 },
  sparkline: { width: 60, height: 24, marginHorizontal: 12 },
  spark: { height: 24, borderRadius: 4 },
  sparkUp: { backgroundColor: "#1EC98A" },
  sparkDown: { backgroundColor: "#F86A5C" },
  right: { alignItems: "flex-end", width: 90 },
  price: { color: "#F3F5F7", fontSize: 14, fontWeight: "600" },
  change: { fontSize: 12, marginTop: 2 },
  up: { color: "#1EC98A" },
  down: { color: "#F86A5C" }
});
