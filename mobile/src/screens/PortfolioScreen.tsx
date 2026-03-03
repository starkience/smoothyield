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
import { useMarketData } from "../hooks/useMarketData";
import { AssetIcon } from "../components/AssetIcon";

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
  const { crypto: liveCrypto, refresh: refreshMarket } = useMarketData();

  const load = useCallback(async () => {
    if (!sessionId) return;
    setRefreshing(true);
    try {
      const api = createApi(sessionId);
      const [res] = await Promise.all([
        api.get<PortfolioRes>("/api/portfolio"),
        refreshMarket(),
      ]);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setRefreshing(false);
    }
  }, [sessionId, refreshMarket]);

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

  const btcLive = liveCrypto.find((c) => c.symbol === "BTC");
  const usdcLive = liveCrypto.find((c) => c.symbol === "USDC");
  const btcPrice = btcLive?.price ?? cryptoMarkets.find((m) => m.symbol === "BTC")?.price ?? 0;
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
        {/* ── Active Staking Position ──────────────────────────── */}
        {isEarning && (
          <View style={styles.stakingCard}>
            {/* Header */}
            <View style={styles.stakingHeader}>
              <AssetIcon
                uri={btcLive?.image ?? cryptoMarkets.find((m) => m.symbol === "BTC")?.image}
                fallbackLetter="B"
                fallbackColor="#F7931A"
                size={44}
                style={{ marginRight: 12 }}
              />
              <View style={styles.stakingHeaderText}>
                <Text style={styles.stakingTitle}>BTC Staking</Text>
                <View style={styles.stakingStatusRow}>
                  <View style={styles.stakingDot} />
                  <Text style={styles.stakingStatusText}>Earning yield</Text>
                </View>
              </View>
              <View style={styles.apyBadge}>
                <Text style={styles.apyBadgeText}>{apy}% APY</Text>
              </View>
            </View>

            {/* Staked amount */}
            <View style={styles.stakingBody}>
              <View style={styles.stakingStatRow}>
                <Text style={styles.stakingStatLabel}>Staked</Text>
                <View style={styles.stakingStatRight}>
                  <Text style={styles.stakingStatValue}>{formatLbtcShort(stakedRaw)} LBTC</Text>
                  {stakedLbtcUsd > 0 && (
                    <Text style={styles.stakingStatUsd}>
                      ${stakedLbtcUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.stakingStatRow}>
                <Text style={styles.stakingStatLabel}>Accrued (est.)</Text>
                <Text style={styles.stakingStatValue}>${Number(accruedUsd).toFixed(2)}</Text>
              </View>

              <View style={styles.stakingStatRow}>
                <Text style={styles.stakingStatLabel}>Est. daily</Text>
                <Text style={styles.stakingStatValue}>
                  ${(stakedLbtcUsd * (apy / 100) / 365).toFixed(4)}
                </Text>
              </View>
            </View>

            {/* Pool info */}
            <View style={styles.stakingFooter}>
              <Text style={styles.stakingPoolLabel}>Starknet Native Staking Pool</Text>
              <Text style={styles.stakingPoolNote}>LBTC delegation pool  ·  Gasless via AVNU</Text>
            </View>
          </View>
        )}

        {/* Crypto assets */}
        <Text style={styles.sectionLabel}>Crypto</Text>
        <View style={styles.card}>
          <View style={styles.assetRow}>
            <AssetIcon
              uri={usdcLive?.image ?? cryptoMarkets.find((m) => m.symbol === "USDC")?.image}
              fallbackLetter="U"
              fallbackColor="#2775CA"
              style={styles.assetIcon}
            />
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
            <AssetIcon
              uri={btcLive?.image ?? cryptoMarkets.find((m) => m.symbol === "BTC")?.image}
              fallbackLetter="B"
              fallbackColor="#F7931A"
              style={styles.assetIcon}
            />
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
              <AssetIcon
                uri={(h as any).logoUrl ?? `https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons/${h.ticker}.png`}
                fallbackLetter={h.ticker.slice(0, 1)}
                fallbackColor="#1EC98A"
                style={styles.assetIcon}
              />
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
  assetLeft: { flex: 1 },
  assetRight: { alignItems: "flex-end" },
  assetSymbol: { color: "#F3F5F7", fontSize: 16, fontWeight: "700" },
  assetName: { color: "#96A4B8", fontSize: 12, marginTop: 2 },
  assetBalance: { color: "#F3F5F7", fontSize: 15, fontWeight: "600" },
  assetUsd: { color: "#64748B", fontSize: 12, marginTop: 2 },

  // ── Staking position card ──────────────────────────────────────────────────
  stakingCard: {
    backgroundColor: "#0F2D1E",
    borderWidth: 1,
    borderColor: "#1EC98A44",
    borderRadius: 14,
    marginTop: 8,
    overflow: "hidden",
  },
  stakingHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 14,
  },
  stakingHeaderText: { flex: 1 },
  stakingTitle: { color: "#F3F5F7", fontWeight: "700", fontSize: 16 },
  stakingStatusRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  stakingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#1EC98A",
    marginRight: 6,
  },
  stakingStatusText: { color: "#1EC98A", fontSize: 12, fontWeight: "600" },
  apyBadge: {
    backgroundColor: "#1EC98A22",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  apyBadgeText: { color: "#1EC98A", fontSize: 13, fontWeight: "700" },
  stakingBody: {
    borderTopWidth: 1,
    borderTopColor: "#1A3D2C",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stakingStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  stakingStatLabel: { color: "#64748B", fontSize: 13 },
  stakingStatRight: { alignItems: "flex-end" },
  stakingStatValue: { color: "#F3F5F7", fontSize: 14, fontWeight: "600" },
  stakingStatUsd: { color: "#64748B", fontSize: 11, marginTop: 1 },
  stakingFooter: {
    borderTopWidth: 1,
    borderTopColor: "#1A3D2C",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stakingPoolLabel: { color: "#96A4B8", fontSize: 12, fontWeight: "600" },
  stakingPoolNote: { color: "#4A5568", fontSize: 11, marginTop: 2 },

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
