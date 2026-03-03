import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, cardStyle } from "../../src/theme";
import {
  tradfiHoldings,
  perpsPositions,
} from "../../src/mockData";
import { useMarketData } from "../../src/hooks/useMarketData";
import { useCryptoBalances } from "../../src/hooks/useCryptoBalances";
import { AssetRow } from "../../src/components/AssetRow";
import { PerpsRow } from "../../src/components/PerpsRow";
import { StakingCard } from "../../src/components/StakingCard";

export default function PortfolioScreen() {
  const { crypto: liveCrypto, stocks: liveStocks } = useMarketData();
  const { holdings: cryptoHoldings, loading: cryptoLoading } = useCryptoBalances(liveCrypto);

  const tradfiWithLive = useMemo(() => {
    const stockMap = new Map(liveStocks.map((s) => [s.ticker, s]));
    return tradfiHoldings.map((h) => {
      const live = stockMap.get(h.symbol);
      return {
        ...h,
        priceUsd: live?.price ?? h.priceUsd,
        valueUsd: live ? live.price * h.qty : h.valueUsd,
        imageUrl: live?.logoUrl ?? h.imageUrl,
      };
    });
  }, [liveStocks]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Portfolio</Text>

        {/* TradFi holdings */}
        <Text style={styles.sectionTitle}>TradFi holdings</Text>
        <View style={styles.card}>
          {tradfiWithLive.map((h) => (
            <AssetRow
              key={h.symbol}
              imageUrl={h.imageUrl}
              symbol={h.symbol}
              name={h.name}
              qty={h.qty}
              valueUsd={h.valueUsd}
            />
          ))}
        </View>

        {/* Crypto holdings */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Crypto holdings</Text>
          {cryptoLoading && <ActivityIndicator size="small" color={colors.textTertiary} style={styles.sectionSpinner} />}
        </View>
        <View style={styles.card}>
          {cryptoHoldings.map((h) => (
            <AssetRow
              key={h.symbol}
              imageUrl={h.imageUrl}
              symbol={h.symbol}
              name={h.name}
              qty={h.qty > 0 ? h.qty : undefined}
              valueUsd={h.qty > 0 ? h.valueUsd : undefined}
              priceUsd={h.qty === 0 ? h.priceUsd : undefined}
              changePct={h.changePct}
            />
          ))}
        </View>

        {/* Perps positions */}
        {perpsPositions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Perps positions</Text>
            <View style={styles.card}>
              {perpsPositions.map((p) => (
                <PerpsRow
                  key={p.underlying}
                  symbol={p.underlying}
                  name={`${p.side} · $${p.notionalUsd.toLocaleString()}`}
                  priceUsd={p.mark}
                  side={p.side}
                  pnlUsd={p.pnlUsd}
                  mode="position"
                />
              ))}
            </View>
          </>
        )}

        {/* BTC staking */}
        <Text style={styles.sectionTitle}>BTC Staking</Text>
        <StakingCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionSpinner: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    ...cardStyle,
    marginHorizontal: spacing.md,
    overflow: "hidden",
  },
});
