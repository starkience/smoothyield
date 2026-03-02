import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { cryptoMarkets } from "../constants";

const DEFAULT_BTC_STAKING_APY = 3.33; // fallback when API does not return btcStakingApy
const PHASES = ["Staking on Starknet", "Earning"] as const;
type Phase = "idle" | "staking" | "earning";

const LBTC_DECIMALS = 8;
function displayToRawLbtc(display: string): string {
  const n = parseFloat(display);
  if (!Number.isFinite(n) || n < 0) return "0";
  return Math.floor(n * 10 ** LBTC_DECIMALS).toString();
}

interface Props {
  /** When true the screen is embedded inside CryptoScreen — no SafeAreaView wrapper */
  embedded?: boolean;
}

export const YieldScreen: React.FC<Props> = ({ embedded = false }) => {
  const { sessionId, getAccessToken } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [stakeTx, setStakeTx] = useState<{ hash: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stakeAmountDisplay, setStakeAmountDisplay] = useState("1");
  const [lbtcBalanceRaw, setLbtcBalanceRaw] = useState<string | null>(null);
  const [btcStakingApy, setBtcStakingApy] = useState<number>(DEFAULT_BTC_STAKING_APY);

  const api = useMemo(() => createApi(sessionId), [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ crypto?: { lbtcBalance?: string; btcStakingApy?: number } }>("/api/portfolio");
        if (!cancelled) {
          setLbtcBalanceRaw(res.crypto?.lbtcBalance ?? "0");
          if (res.crypto?.btcStakingApy != null) setBtcStakingApy(res.crypto.btcStakingApy);
        }
      } catch {
        if (!cancelled) setLbtcBalanceRaw("0");
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, api]);

  const lbtcBalanceFormatted =
    lbtcBalanceRaw != null
      ? (Number(lbtcBalanceRaw) / 10 ** LBTC_DECIMALS).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        })
      : null;

  const btcPrice = cryptoMarkets.find((m) => m.symbol === "BTC")?.price ?? 0;
  const lbtcUsd =
    lbtcBalanceRaw != null
      ? (Number(lbtcBalanceRaw) / 10 ** LBTC_DECIMALS) * btcPrice
      : 0;

  const initAndStake = async () => {
    setError(null);
    if (!sessionId) return;
    const amountRaw = displayToRawLbtc(stakeAmountDisplay);
    if (amountRaw === "0") {
      setError("Enter an amount to stake");
      return;
    }
    try {
      setPhase("staking");
      const freshToken = await getAccessToken();
      await api.post("/api/wallet/init", freshToken ? { privyToken: freshToken } : {});
      const stake = await api.post<{ txHash: string; explorerUrl: string }>(
        "/api/yield/stake",
        freshToken ? { amountLbtc: amountRaw, privyToken: freshToken } : { amountLbtc: amountRaw },
      );
      setStakeTx({ hash: stake.txHash, url: stake.explorerUrl });
      setPhase("earning");
    } catch (err: any) {
      setError(err?.message || "Staking failed");
      setPhase("idle");
    }
  };

  const inner = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      {!embedded && (
        <>
          <Text style={styles.title}>BTC Yield</Text>
          <Text style={styles.subtitle}>
            Deposit BTC · stake on Starknet · earn {btcStakingApy}% APY. No seed phrases, no gas.
          </Text>
        </>
      )}

      {/* ── APY card ─────────────────────────────────────────────────── */}
      <View style={styles.apyCard}>
        <Text style={styles.apyLabel}>Current APY</Text>
        <Text style={styles.apyValue}>{btcStakingApy}%</Text>
        <Text style={styles.apyNote}>Powered by Starknet · Gasless via AVNU Paymaster</Text>
      </View>

      {/* ── Main content (auth gate is in App.tsx) ───────────────────── */}
      {sessionId ? (
        <>
          {/* ── Stake CTA ─────────────────────────────────────────────── */}
          {phase === "idle" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Stake on Starknet</Text>
              <Text style={styles.cardBody}>
                Enter how much LBTC to stake. You need LBTC in your wallet (e.g. from depositing BTC).
                Staking is gasless on Starknet.
              </Text>
              {lbtcBalanceFormatted != null && (
                <Text style={styles.balanceLabel}>
                  Available: {lbtcBalanceFormatted} LBTC
                  {lbtcUsd > 0 && (
                    <Text style={styles.balanceUsd}> (${lbtcUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</Text>
                  )}
                </Text>
              )}
              <View style={styles.percentRow}>
                {([10, 25, 50, 75, 100] as const).map((pct) => {
                  const balanceNum = lbtcBalanceRaw != null ? Number(lbtcBalanceRaw) / 10 ** LBTC_DECIMALS : 0;
                  const hasBalance = balanceNum > 0;
                  return (
                    <TouchableOpacity
                      key={pct}
                      onPress={() => {
                        const amount = hasBalance
                          ? (balanceNum * pct / 100).toString()
                          : "0";
                        setStakeAmountDisplay(amount);
                      }}
                      style={[styles.percentButton, !hasBalance && styles.percentButtonDisabled]}
                      disabled={!hasBalance}
                    >
                      <Text style={[styles.percentButtonText, !hasBalance && styles.percentButtonTextDisabled]}>
                        {pct}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={styles.amountInput}
                value={stakeAmountDisplay}
                onChangeText={setStakeAmountDisplay}
                placeholder="0"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                maxLength={18}
              />
              <View style={styles.amountRow}>
                <Text style={styles.amountUnit}>LBTC</Text>
                {lbtcBalanceRaw != null && Number(lbtcBalanceRaw) > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      const max = (Number(lbtcBalanceRaw) / 10 ** LBTC_DECIMALS).toString();
                      setStakeAmountDisplay(max);
                    }}
                    style={styles.maxButton}
                  >
                    <Text style={styles.maxButtonText}>Max</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={initAndStake}>
                <Text style={styles.primaryButtonText}>Stake BTC now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── In-progress ───────────────────────────────────────────── */}
          {phase === "staking" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Staking in progress…</Text>
              {PHASES.map((p) => (
                <View key={p} style={styles.stepRow}>
                  <View style={styles.stepDotActive} />
                  <Text style={styles.stepText}>{p}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Earning ───────────────────────────────────────────────── */}
          {phase === "earning" && (
            <View style={[styles.card, styles.earningCard]}>
              <Text style={styles.earningLabel}>You are now earning</Text>
              <Text style={styles.earningValue}>{btcStakingApy}% APY</Text>
              <Text style={styles.earningNote}>on your BTC via Starknet</Text>
              {stakeTx && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(stakeTx.url)}
                  style={{ marginTop: 12 }}
                >
                  <Text style={styles.link}>
                    Stake tx: {stakeTx.hash.slice(0, 12)}…
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      ) : null}

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );

  if (embedded) return <View style={{ flex: 1 }}>{inner}</View>;

  return <SafeAreaView style={styles.safe}>{inner}</SafeAreaView>;
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 48, paddingTop: 16 },

  title: {
    color: "#F3F5F7",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#96A4B8",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },

  apyCard: {
    backgroundColor: "#0F2D1E",
    borderWidth: 1,
    borderColor: "#1EC98A44",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  apyLabel: { color: "#96A4B8", fontSize: 13 },
  apyValue: {
    color: "#1EC98A",
    fontSize: 42,
    fontWeight: "800",
    marginVertical: 4,
  },
  apyNote: { color: "#64748B", fontSize: 12, textAlign: "center" },

  card: {
    backgroundColor: "#121B2E",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#F3F5F7",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 8,
  },
  cardBody: {
    color: "#96A4B8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  balanceLabel: {
    color: "#64748B",
    fontSize: 12,
    marginBottom: 6,
  },
  balanceUsd: { color: "#96A4B8", fontSize: 12 },
  percentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  percentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#2B3C52",
    alignItems: "center",
  },
  percentButtonDisabled: {
    opacity: 0.5,
  },
  percentButtonText: {
    color: "#F3F5F7",
    fontSize: 13,
    fontWeight: "600",
  },
  percentButtonTextDisabled: {
    color: "#64748B",
  },
  amountInput: {
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#2B3C52",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: "#F3F5F7",
    marginBottom: 6,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  amountUnit: { color: "#96A4B8", fontSize: 14 },
  maxButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#2B3C52",
  },
  maxButtonText: { color: "#7DD3FC", fontSize: 13, fontWeight: "600" },

  primaryButton: {
    backgroundColor: "#1EC98A",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#0B1220", fontWeight: "700", fontSize: 15 },

  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  stepDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1EC98A",
    marginRight: 10,
  },
  stepText: { color: "#F3F5F7" },

  earningCard: {
    borderWidth: 1,
    borderColor: "#1EC98A55",
    alignItems: "center",
  },
  earningLabel: { color: "#96A4B8", fontSize: 13 },
  earningValue: {
    color: "#1EC98A",
    fontSize: 38,
    fontWeight: "800",
    marginVertical: 4,
  },
  earningNote: { color: "#64748B", fontSize: 13 },

  link: { color: "#7DD3FC", fontSize: 13 },
  error: { color: "#F86A5C", marginTop: 8, textAlign: "center" },
});
