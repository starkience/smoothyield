import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { createApi } from "../api";
import { useAuth } from "../context/AuthContext";

const phases = ["Onramping", "Swapping", "Staking", "Earning"] as const;

type Phase = "idle" | "onramping" | "swapping" | "staking" | "earning";

export const YieldScreen = () => {
  const { sessionId, loginWithGmail, mockLogin, loading } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [onrampUrl, setOnrampUrl] = useState<string | null>(null);
  const [swapTx, setSwapTx] = useState<{ hash: string; url: string } | null>(null);
  const [stakeTx, setStakeTx] = useState<{ hash: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => createApi(sessionId), [sessionId]);

  const start = async () => {
    setError(null);
    if (!sessionId) return;
    try {
      await api.post("/api/wallet/init", {});
      setPhase("onramping");
    } catch (err: any) {
      setError(err?.message || "Failed to initialize wallet");
    }
  };

  const generateOnramp = async () => {
    setError(null);
    if (!sessionId) return;
    try {
      const res = await api.post<{ onrampUrl: string }>("/api/onramp/session", {});
      setOnrampUrl(res.onrampUrl);
    } catch (err: any) {
      setError(err?.message || "Onramp session failed");
    }
  };

  const confirmPayment = async () => {
    setError(null);
    if (!sessionId) return;
    try {
      setPhase("swapping");
      await api.post("/api/onramp/confirm", {});
      const swap = await api.post<{ txHash: string; explorerUrl: string }>("/api/yield/convert", {
        amountUsdc: "1000000"
      });
      setSwapTx({ hash: swap.txHash, url: swap.explorerUrl });
      setPhase("staking");
      const stake = await api.post<{ txHash: string; explorerUrl: string }>("/api/yield/stake", {
        amountLbtc: "1000000"
      });
      setStakeTx({ hash: stake.txHash, url: stake.explorerUrl });
      setPhase("earning");
    } catch (err: any) {
      setError(err?.message || "Yield flow failed");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Passive Bitcoin yield</Text>
      <Text style={styles.subtitle}>USDC in, LBTC staked on Starknet. No wallets, no seed phrases.</Text>

      {!sessionId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login to continue</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={loginWithGmail} disabled={loading}>
            <Text style={styles.primaryButtonText}>Sign in with Gmail</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={mockLogin}>
            <Text style={styles.secondaryButtonText}>Mock login (DEV_MODE)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <TouchableOpacity style={styles.primaryButton} onPress={start}>
            <Text style={styles.primaryButtonText}>Start earning yield</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        {phases.map((p) => (
          <View key={p} style={styles.stepRow}>
            <View style={[styles.stepDot, phase === p.toLowerCase() ? styles.stepDotActive : null]} />
            <Text style={styles.stepText}>{p}</Text>
          </View>
        ))}
        {phase === "earning" && (
          <Text style={styles.earning}>Earning 4.8% APY (mocked)</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Onramp</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={generateOnramp}>
          <Text style={styles.secondaryButtonText}>Generate onramp QR</Text>
        </TouchableOpacity>
        {onrampUrl && (
          <View style={styles.qrWrap}>
            <QRCode value={onrampUrl} size={180} backgroundColor="#0B1220" color="#F3F5F7" />
            <Text style={styles.qrText}>Scan to complete payment</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={confirmPayment}>
              <Text style={styles.primaryButtonText}>I've completed payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transactions</Text>
        {swapTx && (
          <TouchableOpacity onPress={() => Linking.openURL(swapTx.url)}>
            <Text style={styles.link}>Swap tx: {swapTx.hash}</Text>
          </TouchableOpacity>
        )}
        {stakeTx && (
          <TouchableOpacity onPress={() => Linking.openURL(stakeTx.url)}>
            <Text style={styles.link}>Stake tx: {stakeTx.hash}</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 16 },
  title: { color: "#F3F5F7", fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#96A4B8", marginTop: 6, marginBottom: 16 },
  card: {
    backgroundColor: "#121B2E",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  cardTitle: { color: "#F3F5F7", fontWeight: "700", marginBottom: 10 },
  primaryButton: {
    backgroundColor: "#1EC98A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonText: { color: "#0B1220", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2B3C52",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8
  },
  secondaryButtonText: { color: "#F3F5F7" },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#334155",
    marginRight: 8
  },
  stepDotActive: { backgroundColor: "#1EC98A" },
  stepText: { color: "#F3F5F7" },
  earning: { marginTop: 8, color: "#1EC98A", fontWeight: "700" },
  qrWrap: { alignItems: "center", marginTop: 12 },
  qrText: { color: "#96A4B8", marginTop: 8, marginBottom: 12 },
  link: { color: "#7DD3FC", marginTop: 6 },
  error: { color: "#F86A5C", marginTop: 8 }
});
