import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  SafeAreaView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { createApi } from "../api";
import { useAuth } from "../context/AuthContext";

const PHASES = ["Deposit BTC", "Staking on Starknet", "Earning"] as const;
type Phase = "idle" | "staking" | "earning";

interface Props {
  /** When true the screen is embedded inside CryptoScreen — no SafeAreaView wrapper */
  embedded?: boolean;
}

export const YieldScreen: React.FC<Props> = ({ embedded = false }) => {
  const { sessionId } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [onrampUrl, setOnrampUrl] = useState<string | null>(null);
  const [swapTx, setSwapTx] = useState<{ hash: string; url: string } | null>(null);
  const [stakeTx, setStakeTx] = useState<{ hash: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => createApi(sessionId), [sessionId]);

  const initAndStake = async () => {
    setError(null);
    if (!sessionId) return;
    try {
      setPhase("staking");
      // Ensure wallet is ready
      await api.post("/api/wallet/init", {});
      // Swap USDC → LBTC (mocked in DEV_MODE)
      const swap = await api.post<{ txHash: string; explorerUrl: string }>(
        "/api/yield/convert",
        { amountUsdc: "1000000" },
      );
      setSwapTx({ hash: swap.txHash, url: swap.explorerUrl });
      // Stake LBTC on Starknet
      const stake = await api.post<{ txHash: string; explorerUrl: string }>(
        "/api/yield/stake",
        { amountLbtc: "1000000" },
      );
      setStakeTx({ hash: stake.txHash, url: stake.explorerUrl });
      setPhase("earning");
    } catch (err: any) {
      setError(err?.message || "Staking failed");
      setPhase("idle");
    }
  };

  const generateQR = async () => {
    setError(null);
    if (!sessionId) return;
    try {
      const res = await api.post<{ onrampUrl: string }>("/api/onramp/session", {});
      setOnrampUrl(res.onrampUrl);
    } catch (err: any) {
      setError(err?.message || "Could not generate QR");
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
            Deposit BTC · stake on Starknet · earn 4.8% APY. No seed phrases, no gas.
          </Text>
        </>
      )}

      {/* ── APY card ─────────────────────────────────────────────────── */}
      <View style={styles.apyCard}>
        <Text style={styles.apyLabel}>Current APY</Text>
        <Text style={styles.apyValue}>4.8%</Text>
        <Text style={styles.apyNote}>Powered by Starknet · Gasless via AVNU Paymaster</Text>
      </View>

      {/* ── Main content (auth gate is in App.tsx) ───────────────────── */}
      {sessionId ? (
        <>
          {/* ── Receive address QR ───────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 1 — Deposit BTC</Text>
            <Text style={styles.cardBody}>
              Go to your Profile tab, flip the card to reveal your receive address,
              and send BTC to it. Then come back here to stake.
            </Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={generateQR}>
              <Text style={styles.secondaryButtonText}>Generate deposit QR</Text>
            </TouchableOpacity>
            {onrampUrl && (
              <View style={styles.qrWrap}>
                <QRCode
                  value={onrampUrl}
                  size={180}
                  backgroundColor="#121B2E"
                  color="#F3F5F7"
                />
                <Text style={styles.qrText}>Scan to deposit BTC</Text>
              </View>
            )}
          </View>

          {/* ── Stake CTA ─────────────────────────────────────────────── */}
          {phase === "idle" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Step 2 — Stake on Starknet</Text>
              <Text style={styles.cardBody}>
                Once BTC is in your wallet, tap below. The app swaps it to LBTC
                and stakes it gaslessly on Starknet.
              </Text>
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
              <Text style={styles.earningValue}>4.8% APY</Text>
              <Text style={styles.earningNote}>on your BTC via Starknet</Text>
              {swapTx && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(swapTx.url)}
                  style={{ marginTop: 12 }}
                >
                  <Text style={styles.link}>
                    Swap tx: {swapTx.hash.slice(0, 12)}…
                  </Text>
                </TouchableOpacity>
              )}
              {stakeTx && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(stakeTx.url)}
                  style={{ marginTop: 6 }}
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

  primaryButton: {
    backgroundColor: "#1EC98A",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#0B1220", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2B3C52",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { color: "#F3F5F7" },

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

  qrWrap: { alignItems: "center", marginTop: 16, marginBottom: 4 },
  qrText: { color: "#96A4B8", marginTop: 10, fontSize: 13 },

  link: { color: "#7DD3FC", fontSize: 13 },
  error: { color: "#F86A5C", marginTop: 8, textAlign: "center" },
});
