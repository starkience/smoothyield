import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { cryptoMarkets } from "../constants";
import { useMarketData } from "../hooks/useMarketData";
import { AssetIcon } from "../components/AssetIcon";
import { YieldScreen } from "./YieldScreen";

const DEFAULT_BTC_STAKING_APY = 3.33;

/** Format raw balance for display (USDC 6 decimals). */
function formatUsdc(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "0.00";
  return (n / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format raw balance for display (LBTC 8 decimals). */
function formatLbtc(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "0.00000000";
  return (n / 1e8).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });
}

export const CryptoScreen = () => {
  const { sessionId } = useAuth();
  const [balances, setBalances] = useState({ usdc: "0", lbtc: "0" });
  const [btcStakingApy, setBtcStakingApy] = useState(DEFAULT_BTC_STAKING_APY);
  const [refreshing, setRefreshing] = useState(false);
  const [showYield, setShowYield] = useState(false);
  const { crypto: liveMarkets, refresh: refreshMarket } = useMarketData();

  const loadBalances = useCallback(async () => {
    if (!sessionId) return;
    setRefreshing(true);
    try {
      const api = createApi(sessionId);
      const [res] = await Promise.all([
        api.get<{ crypto?: { usdcBalance?: string; lbtcBalance?: string; btcStakingApy?: number } }>("/api/portfolio"),
        refreshMarket(),
      ]);
      setBalances({
        usdc: res.crypto?.usdcBalance ?? "0",
        lbtc: res.crypto?.lbtcBalance ?? "0",
      });
      if (res.crypto?.btcStakingApy != null) setBtcStakingApy(res.crypto.btcStakingApy);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [sessionId, refreshMarket]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const btcLive = liveMarkets.find((c) => c.symbol === "BTC");
  const usdcLive = liveMarkets.find((c) => c.symbol === "USDC");
  const btcPrice = btcLive?.price ?? cryptoMarkets.find((m) => m.symbol === "BTC")?.price ?? 0;
  const usdcUsd = (Number(balances.usdc) / 1e6) * 1;
  const lbtcUsd = (Number(balances.lbtc) / 1e8) * btcPrice;

  if (showYield) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBar} onPress={() => setShowYield(false)}>
          <Text style={styles.backBarText}>← Crypto</Text>
        </TouchableOpacity>
        <YieldScreen embedded />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Crypto</Text>
      </View>

      {/* ── 50% Top: User's current crypto assets (from address) ───────────────── */}
      <View style={styles.half}>
        <Text style={styles.sectionLabel}>My assets</Text>
        <ScrollView
          style={styles.scrollHalf}
          contentContainerStyle={styles.scrollHalfContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadBalances} tintColor="#1EC98A" />
          }
        >
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
              <Text style={styles.assetBalance}>{formatUsdc(balances.usdc)}</Text>
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
              <Text style={styles.assetBalance}>{formatLbtc(balances.lbtc)}</Text>
              <Text style={styles.assetUsd}>${lbtcUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </View>

          {/* Green button: BTC staking APY — kept as requested */}
          <TouchableOpacity
            style={styles.yieldBanner}
            onPress={() => setShowYield(true)}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.yieldBannerTitle}>Earn yield on your BTC</Text>
              <Text style={styles.yieldBannerSub}>Stake on Starknet · {btcStakingApy}% APY · Gasless</Text>
            </View>
            <Text style={styles.yieldBannerArrow}>→</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── 50% Bottom: Crypto markets ────────────────────────────────────────── */}
      <View style={styles.half}>
        <Text style={styles.sectionLabel}>Markets</Text>
        <ScrollView
          style={styles.scrollHalf}
          contentContainerStyle={styles.scrollHalfContent}
          showsVerticalScrollIndicator={false}
        >
          {(liveMarkets.length ? liveMarkets : cryptoMarkets).map((m) => {
            const img = (m as any).image ?? cryptoMarkets.find((c) => c.symbol === m.symbol)?.image;
            const color = (m as any).iconColor ?? cryptoMarkets.find((c) => c.symbol === m.symbol)?.iconColor ?? "#1EC98A";
            return (
              <View key={m.symbol} style={styles.marketRow}>
                <AssetIcon
                  uri={img}
                  fallbackLetter={m.symbol.slice(0, 1)}
                  fallbackColor={color}
                  style={styles.assetIcon}
                />
                <View style={styles.assetLeft}>
                  <Text style={styles.assetSymbol}>{m.symbol}</Text>
                  <Text style={styles.assetName}>{m.name}</Text>
                </View>
                <View style={styles.marketRight}>
                  <Text style={styles.marketPrice}>
                    ${m.price >= 1000 ? m.price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : m.price.toFixed(2)}
                  </Text>
                  <Text style={[styles.marketChange, m.changePct >= 0 ? styles.changeUp : styles.changeDown]}>
                    {m.changePct >= 0 ? "+" : ""}{m.changePct.toFixed(2)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { color: "#F3F5F7", fontSize: 26, fontWeight: "800" },

  backBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A3C",
  },
  backBarText: { color: "#1EC98A", fontWeight: "600", fontSize: 15 },

  half: {
    flex: 1,
    paddingHorizontal: 16,
    minHeight: 0,
  },
  sectionLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  scrollHalf: { flex: 1 },
  scrollHalfContent: { paddingBottom: 24 },

  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
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

  yieldBanner: {
    backgroundColor: "#0F2D1E",
    borderWidth: 1,
    borderColor: "#1EC98A44",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  yieldBannerTitle: { color: "#1EC98A", fontWeight: "700", fontSize: 15 },
  yieldBannerSub: { color: "#96A4B8", fontSize: 12, marginTop: 3 },
  yieldBannerArrow: { color: "#1EC98A", fontSize: 20, fontWeight: "700" },

  marketRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A3C",
  },
  marketRight: { alignItems: "flex-end", minWidth: 80 },
  marketPrice: { color: "#F3F5F7", fontSize: 14, fontWeight: "600" },
  marketChange: { fontSize: 12, marginTop: 2 },
  changeUp: { color: "#1EC98A" },
  changeDown: { color: "#F86A5C" },
});
