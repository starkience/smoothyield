import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { cryptoAssets, CRYPTO_TOTAL } from "../constants";
import { CryptoAssetRow } from "../components/CryptoAssetRow";
import { YieldScreen } from "./YieldScreen";

type SubTab = "assets" | "yield";

export const CryptoScreen = () => {
  const [activeTab, setActiveTab] = useState<SubTab>("assets");

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Crypto</Text>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Portfolio value</Text>
          <Text style={styles.totalValue}>
            ${CRYPTO_TOTAL.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* ── Sub-tab pills ────────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.pill, activeTab === "assets" && styles.pillActive]}
          onPress={() => setActiveTab("assets")}
        >
          <Text style={[styles.pillText, activeTab === "assets" && styles.pillTextActive]}>
            Assets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, activeTab === "yield" && styles.pillActive]}
          onPress={() => setActiveTab("yield")}
        >
          <Text style={[styles.pillText, activeTab === "yield" && styles.pillTextActive]}>
            ₿ BTC Yield
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {activeTab === "assets" ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* BTC badge — entry point to yield */}
          <TouchableOpacity
            style={styles.yieldBanner}
            onPress={() => setActiveTab("yield")}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.yieldBannerTitle}>Earn yield on your BTC</Text>
              <Text style={styles.yieldBannerSub}>
                Stake on Starknet · 4.8% APY · Gasless
              </Text>
            </View>
            <Text style={styles.yieldBannerArrow}>→</Text>
          </TouchableOpacity>

          {/* Asset rows */}
          {cryptoAssets.map((asset) => (
            <CryptoAssetRow
              key={asset.symbol}
              symbol={asset.symbol}
              name={asset.name}
              price={asset.price}
              changePct={asset.changePct}
              iconColor={asset.iconColor}
              holding={asset.holding}
              holdingValueUsd={asset.holding * asset.price}
            />
          ))}
        </ScrollView>
      ) : (
        /* Yield sub-tab — renders YieldScreen content inline */
        <YieldScreen embedded />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: { color: "#F3F5F7", fontSize: 26, fontWeight: "800" },
  totalWrap: { alignItems: "flex-end" },
  totalLabel: { color: "#64748B", fontSize: 11 },
  totalValue: { color: "#1EC98A", fontSize: 18, fontWeight: "700" },

  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#121B2E",
    borderRadius: 12,
    padding: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  pillActive: { backgroundColor: "#1EC98A" },
  pillText: { color: "#64748B", fontWeight: "600", fontSize: 14 },
  pillTextActive: { color: "#0B1220" },

  scroll: { flex: 1, paddingHorizontal: 16 },

  yieldBanner: {
    backgroundColor: "#0F2D1E",
    borderWidth: 1,
    borderColor: "#1EC98A44",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  yieldBannerTitle: {
    color: "#1EC98A",
    fontWeight: "700",
    fontSize: 15,
  },
  yieldBannerSub: {
    color: "#96A4B8",
    fontSize: 12,
    marginTop: 3,
  },
  yieldBannerArrow: {
    color: "#1EC98A",
    fontSize: 20,
    fontWeight: "700",
  },
});
