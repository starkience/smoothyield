import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
} from "react-native";
import { markets, portfolioHoldings, TRADFI_TOTAL } from "../constants";
import { MarketRow } from "../components/MarketRow";

export const MarketsScreen = () => {
  const dayGain = 284.52;
  const dayGainPct = ((dayGain / TRADFI_TOTAL) * 100).toFixed(2);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Portfolio summary ───────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.portfolioLabel}>My TradFi Portfolio</Text>
          <Text style={styles.portfolioValue}>
            ${TRADFI_TOTAL.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.portfolioChange}>
            +${dayGain.toFixed(2)} (+{dayGainPct}%) today
          </Text>
        </View>
        <View style={styles.holdingsBadge}>
          <Text style={styles.holdingsBadgeText}>
            {portfolioHoldings.length} stocks
          </Text>
        </View>
      </View>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <View style={styles.divider} />
      <Text style={styles.listTitle}>All Markets</Text>

      {/* ── Market list ─────────────────────────────────────────────── */}
      <FlatList
        data={markets}
        keyExtractor={(item) => item.ticker}
        renderItem={({ item }) => (
          <MarketRow
            ticker={item.ticker}
            name={item.name}
            price={item.price}
            changePct={item.changePct}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  portfolioLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  portfolioValue: {
    color: "#F3F5F7",
    fontSize: 30,
    fontWeight: "800",
  },
  portfolioChange: {
    color: "#1EC98A",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  holdingsBadge: {
    backgroundColor: "#1EC98A22",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  holdingsBadgeText: {
    color: "#1EC98A",
    fontSize: 12,
    fontWeight: "600",
  },

  divider: { height: 1, backgroundColor: "#1F2A3C" },
  listTitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
});
