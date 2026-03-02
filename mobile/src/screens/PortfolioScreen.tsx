import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { portfolioHoldings, TRADFI_TOTAL, cryptoMarkets } from "../constants";

type BtcYieldPosition = {
  status: string;
  apy?: number;
  accruedUsd?: number;
  stakedAmountLbtc?: string | null;
};

type PortfolioRes = {
  tradfiHoldings?: { ticker: string; name: string; shares: number; price: number }[];
  crypto?: {
    usdcBalance?: string;
    lbtcBalance?: string;
    btcStakingApy?: number;
    btcYieldPosition?: BtcYieldPosition;
  };
};

function formatUsdc(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "0.00";
  return (n / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLbtc(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "0.00000000";
  return (n / 1e8).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });
}

/** Format raw LBTC (8 decimals) for display in APY card */
function formatLbtcShort(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "0";
  const units = n / 1e8;
  return units >= 1 ? units.toFixed(2) : units.toFixed(4);
}

export const PortfolioScreen = () => {
  const { sessionId } = useAuth();
  const [data, setData] = useState<PortfolioRes | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setRefreshing(true);
    try {
      const api = createApi(sessionId);
      const res = await api.get<PortfolioRes>("/api/portfolio");
      setData(res);
    } catch {
      setData(null);
    } finally {
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const crypto = data?.crypto;
  const usdcBalance = crypto?.usdcBalance ?? "0";
  const lbtcBalance = crypto?.lbtcBalance ?? "0";
  const yieldPos = crypto?.btcYieldPosition;
  const isEarning = yieldPos?.status === "earning";
  const apy = yieldPos?.apy ?? data?.crypto?.btcStakingApy ?? 0;
  const accruedUsd = yieldPos?.accruedUsd ?? 0;
  const stakedRaw = yieldPos?.stakedAmountLbtc ?? "0";
  const tradfi = data?.tradfiHoldings ?? portfolioHoldings;

  const btcPrice = cryptoMarkets.find((m) => m.symbol === "BTC")?.price ?? 0;
  const usdcUsd = (Number(usdcBalance) / 1e6) * 1;
  const lbtcUsd = (Number(lbtcBalance) / 1e8) * btcPrice;

  const stakedLbtcUsd = (Number(stakedRaw) / 1e8) * btcPrice;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <Text style={styles.subtitle}>All your assets in one place</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#1EC98A" />
        }
      >
        {/* Staked BTC APY card — only when user has staked */}
        {isEarning && (
          <View style={styles.apyCard}>
            <View style={styles.apyCardHeader}>
              <View style={[styles.apyIcon, { backgroundColor: "#F7931A22" }]}>
                <Text style={[styles.apyIconText, { color: "#F7931A" }]}>B</Text>
              </View>
              <View style={styles.apyCardTitleWrap}>
                <Text style={styles.apyCardTitle}>Staked BTC</Text>
                <Text style={styles.apyCardSub}>
                  Earning {apy}% APY on {formatLbtcShort(stakedRaw)} LBTC
                  {stakedLbtcUsd > 0 && (
                    <Text style={styles.apyCardUsd}> (${stakedLbtcUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</Text>
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.apyCardRow}>
              <Text style={styles.apyCardLabel}>Accrued (est.)</Text>
              <Text style={styles.apyCardValue}>${Number(accruedUsd).toFixed(2)}</Text>
            </View>
            <Text style={styles.apyCardNote}>Powered by Starknet native staking · Gasless</Text>
          </View>
        )}

        {/* Crypto assets */}
        <Text style={styles.sectionLabel}>Crypto</Text>
        <View style={styles.card}>
          <View style={styles.assetRow}>
            <View style={[styles.assetIcon, { backgroundColor: "#2775CA22" }]}>
              <Text style={[styles.assetIconText, { color: "#2775CA" }]}>U</Text>
            </View>
            <View style={styles.assetLeft}>
              <Text style={styles.assetSymbol}>USDC</Text>
              <Text style={styles.assetName}>USD Coin</Text>
            </View>
            <View style={styles.assetRight}>
              <Text style={styles.assetBalance}>{formatUsdc(usdcBalance)}</Text>
              <Text style={styles.assetUsd}>${usdcUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </View>
          <View style={styles.assetRow}>
            <View style={[styles.assetIcon, { backgroundColor: "#F7931A22" }]}>
              <Text style={[styles.assetIconText, { color: "#F7931A" }]}>B</Text>
            </View>
            <View style={styles.assetLeft}>
              <Text style={styles.assetSymbol}>BTC (LBTC)</Text>
              <Text style={styles.assetName}>Wrapped Bitcoin</Text>
            </View>
            <View style={styles.assetRight}>
              <Text style={styles.assetBalance}>{formatLbtc(lbtcBalance)}</Text>
              <Text style={styles.assetUsd}>${lbtcUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* TradFi holdings */}
        <Text style={styles.sectionLabel}>Stocks & ETFs</Text>
        <View style={styles.card}>
          {tradfi.map((h) => (
            <View key={h.ticker} style={styles.assetRow}>
              <View style={[styles.assetIcon, { backgroundColor: "#1EC98A22" }]}>
                <Text style={[styles.assetIconText, { color: "#1EC98A" }]}>
                  {h.ticker.slice(0, 1)}
                </Text>
              </View>
              <View style={styles.assetLeft}>
                <Text style={styles.assetSymbol}>{h.ticker}</Text>
                <Text style={styles.assetName}>{h.name}</Text>
              </View>
              <Text style={styles.assetBalance}>
                ${(h.shares * h.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
          <View style={styles.tradfiTotalRow}>
            <Text style={styles.tradfiTotalLabel}>TradFi total</Text>
            <Text style={styles.tradfiTotalValue}>
              ${(data?.tradfiHoldings ? data.tradfiHoldings.reduce((s, h) => s + h.shares * h.price, 0) : TRADFI_TOTAL).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { color: "#F3F5F7", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 14, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: "#121B2E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2A3C",
    overflow: "hidden",
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A3C",
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  assetIconText: { fontSize: 16, fontWeight: "800" },
  assetLeft: { flex: 1 },
  assetRight: { alignItems: "flex-end" },
  assetSymbol: { color: "#F3F5F7", fontSize: 16, fontWeight: "700" },
  assetName: { color: "#96A4B8", fontSize: 12, marginTop: 2 },
  assetBalance: { color: "#F3F5F7", fontSize: 15, fontWeight: "600" },
  assetUsd: { color: "#64748B", fontSize: 12, marginTop: 2 },

  apyCard: {
    backgroundColor: "#0F2D1E",
    borderWidth: 1,
    borderColor: "#1EC98A44",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  apyCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  apyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  apyIconText: { fontSize: 18, fontWeight: "800" },
  apyCardTitleWrap: { flex: 1 },
  apyCardTitle: { color: "#1EC98A", fontWeight: "700", fontSize: 16 },
  apyCardSub: { color: "#96A4B8", fontSize: 13, marginTop: 2 },
  apyCardUsd: { color: "#64748B", fontSize: 12 },
  apyCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1F2A3C",
  },
  apyCardLabel: { color: "#64748B", fontSize: 13 },
  apyCardValue: { color: "#F3F5F7", fontSize: 15, fontWeight: "600" },
  apyCardNote: { color: "#64748B", fontSize: 11, marginTop: 8 },

  tradfiTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tradfiTotalLabel: { color: "#96A4B8", fontSize: 14, fontWeight: "600" },
  tradfiTotalValue: { color: "#F3F5F7", fontSize: 16, fontWeight: "700" },
});
