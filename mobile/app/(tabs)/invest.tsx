import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../src/theme";
import {
  tradfiMarketList,
  perpsMarketList,
  userHoldsTradfi,
} from "../../src/mockData";
import { useMarketData } from "../../src/hooks/useMarketData";
import { useCryptoBalances } from "../../src/hooks/useCryptoBalances";
import { SearchBar } from "../../src/components/SearchBar";
import { SegmentedToggle } from "../../src/components/SegmentedToggle";
import { AssetRow } from "../../src/components/AssetRow";
import { PerpsRow } from "../../src/components/PerpsRow";
import { StakingCard } from "../../src/components/StakingCard";

type Segment = "TradFi" | "Crypto";

export default function InvestScreen() {
  const [segment, setSegment] = useState<Segment>("TradFi");
  const [perpsOn, setPerpsOn] = useState(false);
  const [search, setSearch] = useState("");
  const { crypto: liveCrypto, stocks: liveStocks, loading } = useMarketData();
  const { holdings: cryptoHoldings, loading: cryptoLoading } = useCryptoBalances(liveCrypto);

  const q = search.toLowerCase();

  const tradfiWithLive = useMemo(() => {
    const stockMap = new Map(liveStocks.map((s) => [s.ticker, s]));
    return tradfiMarketList.map((m) => {
      const live = stockMap.get(m.symbol);
      return {
        ...m,
        priceUsd: live?.price ?? m.priceUsd,
        imageUrl: live?.logoUrl ?? m.imageUrl,
        changePct: live?.changePct,
      };
    });
  }, [liveStocks]);

  const filteredTradfi = useMemo(
    () => tradfiWithLive.filter(
      (m) => m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    ),
    [q, tradfiWithLive],
  );

  const filteredPerps = useMemo(
    () => perpsMarketList.filter(
      (m) => m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    ),
    [q],
  );

  const filteredCrypto = useMemo(
    () => cryptoHoldings.filter(
      (m) => m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    ),
    [q, cryptoHoldings],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Invest</Text>
        {(loading || cryptoLoading) && <ActivityIndicator size="small" color={colors.textTertiary} />}
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by symbol or name" />

      <SegmentedToggle
        options={["TradFi", "Crypto"]}
        selected={segment}
        onSelect={(s) => setSegment(s as Segment)}
      />

      {segment === "TradFi" && (
        <>
          <View style={styles.perpsToggle}>
            <Text style={styles.perpsLabel}>Perps contracts</Text>
            <Switch
              value={perpsOn}
              onValueChange={setPerpsOn}
              trackColor={{ false: colors.divider, true: colors.text }}
              thumbColor={colors.background}
            />
          </View>

          {!perpsOn ? (
            <FlatList
              data={filteredTradfi}
              keyExtractor={(item) => item.symbol}
              renderItem={({ item }) => (
                <AssetRow
                  imageUrl={item.imageUrl}
                  symbol={item.symbol}
                  name={item.name}
                  priceUsd={item.priceUsd}
                  changePct={item.changePct}
                  showBuySell={userHoldsTradfi(item.symbol)}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={filteredPerps}
              keyExtractor={(item) => item.symbol}
              renderItem={({ item }) => (
                <PerpsRow
                  symbol={item.symbol}
                  name={item.name}
                  priceUsd={item.priceUsd}
                  mode="market"
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {segment === "Crypto" && (
        <FlatList
          data={filteredCrypto}
          keyExtractor={(item) => item.symbol}
          ListFooterComponent={
            <View style={styles.stakingSection}>
              <Text style={styles.sectionTitle}>BTC Staking</Text>
              <StakingCard />
            </View>
          }
          renderItem={({ item }) => (
            <AssetRow
              imageUrl={item.imageUrl}
              symbol={item.symbol}
              name={item.name}
              qty={item.qty}
              valueUsd={item.qty > 0 ? item.valueUsd : undefined}
              priceUsd={item.qty === 0 ? item.priceUsd : undefined}
              changePct={item.changePct}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: 8,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  perpsToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  perpsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  listContent: { paddingBottom: 32 },
  stakingSection: { marginTop: spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
});
