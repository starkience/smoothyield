import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { portfolioHoldings } from "../constants";
import { createApi } from "../api";
import { useAuth } from "../context/AuthContext";

export const PortfolioScreen = () => {
  const { sessionId } = useAuth();
  const [balances, setBalances] = useState({ usdc: "0", lbtc: "0" });
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!sessionId) return;
    setRefreshing(true);
    try {
      const api = createApi(sessionId);
      const res = await api.get<any>("/api/portfolio");
      setBalances({
        usdc: res.crypto?.usdcBalance || "0",
        lbtc: res.crypto?.lbtcBalance || "0"
      });
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [sessionId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Portfolio</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Value</Text>
        <Text style={styles.cardValue}>$47,820.12</Text>
      </View>
      <Text style={styles.sectionTitle}>Holdings</Text>
      <FlatList
        data={portfolioHoldings}
        keyExtractor={(item) => item.ticker}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.ticker}>{item.ticker}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <Text style={styles.value}>${(item.shares * item.price).toFixed(2)}</Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      />
      <Text style={styles.sectionTitle}>Crypto</Text>
      <View style={styles.row}>
        <Text style={styles.ticker}>USDC</Text>
        <Text style={styles.value}>{balances.usdc}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.ticker}>BTC (LBTC)</Text>
        <Text style={styles.value}>{balances.lbtc}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 16 },
  title: { color: "#F3F5F7", fontSize: 24, fontWeight: "700", marginBottom: 16 },
  card: {
    backgroundColor: "#121B2E",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  cardLabel: { color: "#96A4B8", fontSize: 12 },
  cardValue: { color: "#F3F5F7", fontSize: 22, fontWeight: "700", marginTop: 4 },
  sectionTitle: { color: "#96A4B8", marginTop: 12, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A3C"
  },
  ticker: { color: "#F3F5F7", fontWeight: "600" },
  name: { color: "#96A4B8", fontSize: 12 },
  value: { color: "#F3F5F7", fontWeight: "600" }
});
