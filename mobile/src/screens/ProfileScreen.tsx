import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { FlipCard } from "../components/FlipCard";
import { useAuth } from "../context/AuthContext";
import { createApi } from "../api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "john.doe@gmail.com" → "John Doe" */
const emailToName = (email?: string): string => {
  if (!email) return "Guest";
  const prefix = email.split("@")[0];
  return prefix
    .split(/[._\-+]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
};

/** "John Doe" → "JD" */
const nameToInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/** "0x04abc…def9" → "0x04ab…f9" (truncated for display) */
const truncateAddress = (addr: string): string => {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfileScreen = () => {
  const { sessionId, email, logout } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const displayName = emailToName(email);
  const initials = nameToInitials(displayName);

  // ── Fetch or create the wallet address once the user is logged in ──────────
  const loadWallet = useCallback(async () => {
    if (!sessionId) return;
    const api = createApi(sessionId);
    try {
      // First, try to get existing address
      const res = await api.get<{ address: string | null }>("/api/wallet/address");
      if (res.address) {
        setWalletAddress(res.address);
        return;
      }
      // Not yet created — initialize
      setInitLoading(true);
      await api.post("/api/wallet/init", {});
      const res2 = await api.get<{ address: string | null }>("/api/wallet/address");
      setWalletAddress(res2.address);
    } catch {
      // Silently fail — user can retry by coming back
    } finally {
      setInitLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // ── Copy address ───────────────────────────────────────────────────────────
  const copyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Flip card faces ───────────────────────────────────────────────────────

  const cardFront = (
    <View style={styles.cardFace}>
      <View style={styles.avatarLarge}>
        <Text style={styles.avatarLargeText}>{initials}</Text>
      </View>
      <Text style={styles.cardName}>{displayName}</Text>
      {email ? (
        <Text style={styles.cardEmail}>{email}</Text>
      ) : null}
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap to reveal receive address →</Text>
      </View>
    </View>
  );

  const cardBack = (
    <View style={[styles.cardFace, styles.cardFaceBack]}>
      <Text style={styles.backLabel}>Your BTC Receive Address</Text>
      {initLoading ? (
        <Text style={styles.backAddress}>Setting up wallet…</Text>
      ) : walletAddress ? (
        <>
          <View style={styles.addressBox}>
            <Text style={styles.backAddress} selectable>
              {walletAddress}
            </Text>
          </View>
          <TouchableOpacity style={styles.copyButton} onPress={copyAddress}>
            <Text style={styles.copyButtonText}>
              {copied ? "✓ Copied!" : "Copy address"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.backNote}>
            Send BTC to this address to start earning yield
          </Text>
        </>
      ) : (
        <Text style={styles.backAddress}>No wallet found — sign in first</Text>
      )}
      <View style={[styles.tapHint, { marginTop: 8 }]}>
        <Text style={styles.tapHintText}>← Tap to flip back</Text>
      </View>
    </View>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Profile</Text>

        {/* ── Profile content (always shown — login gate is in App.tsx) ── */}
        {sessionId ? (
          <>
            {/* ── Avatar row ───────────────────────────────────────── */}
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.nameText}>{displayName}</Text>
                <Text style={styles.emailText}>{email}</Text>
              </View>
            </View>

            {/* ── Flip card ─────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Receive address</Text>
            <FlipCard
              front={cardFront}
              back={cardBack}
              height={200}
              style={styles.flipCardOuter}
            />
            <Text style={styles.sectionHint}>
              Flip the card to reveal your Starknet address. Send BTC here, then
              stake it in the Crypto tab to earn yield.
            </Text>

            {/* ── Settings ──────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.card}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsKey}>Network</Text>
                <Text style={styles.settingsValue}>Starknet Mainnet</Text>
              </View>
              <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.settingsKey}>Wallet type</Text>
                <Text style={styles.settingsValue}>ArgentX (Embedded)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  pageTitle: {
    color: "#F3F5F7",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
  },

  // ── Avatar row ─────────────────────────────────────────────────────────────
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1EC98A22",
    borderWidth: 2,
    borderColor: "#1EC98A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#1EC98A", fontSize: 20, fontWeight: "800" },
  nameText: { color: "#F3F5F7", fontSize: 18, fontWeight: "700" },
  emailText: { color: "#64748B", fontSize: 13, marginTop: 2 },

  // ── Flip card ──────────────────────────────────────────────────────────────
  flipCardOuter: {
    borderRadius: 16,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    marginBottom: 8,
  },
  cardFace: {
    height: 200,
    width: "100%",
    backgroundColor: "#121B2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2A3C",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFaceBack: {
    backgroundColor: "#0F1E35",
    borderColor: "#1EC98A33",
  },

  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1EC98A22",
    borderWidth: 2,
    borderColor: "#1EC98A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarLargeText: { color: "#1EC98A", fontSize: 24, fontWeight: "800" },

  cardName: {
    color: "#F3F5F7",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  cardEmail: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
  },
  tapHint: { marginTop: 14 },
  tapHintText: { color: "#2B3C52", fontSize: 12 },

  // Back face
  backLabel: {
    color: "#96A4B8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  addressBox: {
    backgroundColor: "#0B1220",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: "100%",
    marginBottom: 10,
  },
  backAddress: {
    color: "#1EC98A",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    textAlign: "center",
  },
  copyButton: {
    backgroundColor: "#1EC98A",
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 6,
  },
  copyButtonText: { color: "#0B1220", fontWeight: "700", fontSize: 13 },
  backNote: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },

  sectionHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 24,
    marginTop: 4,
  },

  // ── Sections ───────────────────────────────────────────────────────────────
  sectionLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#121B2E",
    borderRadius: 14,
    marginBottom: 20,
    overflow: "hidden",
  },
  cardTitle: {
    color: "#F3F5F7",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 14,
    padding: 16,
    paddingBottom: 0,
  },

  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A3C",
  },
  settingsKey: { color: "#96A4B8", fontSize: 14 },
  settingsValue: { color: "#F3F5F7", fontSize: 14, fontWeight: "500" },

  // ── Buttons ────────────────────────────────────────────────────────────────
  logoutButton: {
    borderWidth: 1,
    borderColor: "#F86A5C44",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  logoutText: { color: "#F86A5C", fontWeight: "600" },
});
