import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { usePrivy } from "@privy-io/expo";
import { colors, spacing, cardStyle } from "../../src/theme";
import { useAuth } from "../../src/context/AuthContext";
import { createApi } from "../../src/api";
import { FlipCard } from "../../src/components/FlipCard";

const SETTINGS_ITEMS = ["Security", "Notifications", "Documents", "Help"];
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - spacing.md * 2;

const emailToDisplayName = (email?: string | null): string => {
  if (!email) return "User";
  const prefix = email.split("@")[0];
  return prefix
    .split(/[._\-+]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
};

const normalizeAddress = (addr: string): string => {
  if (!addr) return addr;
  const hex = addr.startsWith("0x") ? addr.slice(2) : addr;
  const trimmed = hex.replace(/^0+/, "") || "0";
  if (trimmed.length > 64) return addr;
  return "0x" + trimmed.padStart(64, "0");
};

const truncateAddr = (addr: string): string => {
  if (addr.length <= 16) return addr;
  return addr.slice(0, 10) + "···" + addr.slice(-8);
};

export default function ProfileScreen() {
  const { user } = usePrivy();
  const { sessionId, email: authEmail, logout } = useAuth();
  const email = authEmail ?? user?.email?.address ?? user?.google?.email ?? null;
  const displayName = emailToDisplayName(email);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    if (!sessionId) return;
    setWalletLoading(true);
    setWalletError(null);
    const api = createApi(sessionId);
    try {
      const res = await api.get<{ address?: string | null }>("/api/wallet/address");
      if (res?.address) setWalletAddress(normalizeAddress(res.address));

      const initRes = await api.post<{
        address?: string;
        deployed?: boolean;
        alreadyDeployed?: boolean;
        txHash?: string;
        explorerUrl?: string;
        deployError?: string;
      }>("/api/wallet/init", {});

      if (initRes?.address) setWalletAddress(normalizeAddress(initRes.address));

      if (initRes?.deployError) {
        setWalletError(`Deploy issue: ${initRes.deployError}`);
      } else if (!initRes?.address && !res?.address) {
        const retry = await api.get<{ address?: string | null }>("/api/wallet/address");
        if (retry?.address) setWalletAddress(normalizeAddress(retry.address));
        else setWalletError("Could not load address. Check backend logs.");
      }
    } catch (err: any) {
      try {
        const api2 = createApi(sessionId);
        const fallback = await api2.get<{ address?: string | null }>("/api/wallet/address");
        if (fallback?.address) {
          setWalletAddress(normalizeAddress(fallback.address));
          return;
        }
      } catch {}
      setWalletError(err?.message || "Failed to load address");
    } finally {
      setWalletLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const copyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deployAccount = async () => {
    if (!sessionId || !walletAddress) return;
    setDeployLoading(true);
    setDeployMessage(null);
    const api = createApi(sessionId);
    try {
      const res = await api.post<{
        alreadyDeployed?: boolean;
        txHash?: string;
        explorerUrl?: string;
        error?: string;
      }>("/api/wallet/deploy", {});
      if (res?.alreadyDeployed) {
        setDeployMessage("Account already deployed on-chain.");
      } else if (res?.txHash && res?.explorerUrl) {
        setDeployMessage("Deploy sent!");
        Linking.openURL(res.explorerUrl);
      } else if (res?.error) {
        setDeployMessage(`Deploy failed: ${res.error}`);
      }
    } catch (err: any) {
      setDeployMessage(err?.message || "Deploy failed");
    } finally {
      setDeployLoading(false);
    }
  };

  /* ── Card front ────────────────────────────────────────── */
  const cardFront = (
    <View style={styles.creditCard}>
      <View style={styles.ccFrontCenter}>
        <Text style={styles.ccSeeAddress}>See address</Text>
      </View>
      <Text style={styles.ccFlipHint}>Tap to flip</Text>
    </View>
  );

  /* ── Card back ─────────────────────────────────────────── */
  const cardBack = (
    <View style={styles.creditCardBack}>
      <View style={styles.ccStripe} />

      <View style={styles.ccBackContent}>
        {walletLoading ? (
          <View style={styles.ccLoadingRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.ccBackTextMuted}>Loading address...</Text>
          </View>
        ) : walletAddress ? (
          <>
            <Text style={styles.ccBackLabel}>DEPOSIT ADDRESS</Text>
            <Text style={styles.ccAddrFull} selectable numberOfLines={2}>
              {walletAddress}
            </Text>

            <View style={styles.ccActionRow}>
              <TouchableOpacity
                style={[styles.ccActionBtn, copied && styles.ccActionBtnDone]}
                onPress={copyAddress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={copied ? "checkmark-circle" : "copy-outline"}
                  size={14}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.ccActionText}>{copied ? "Copied" : "Copy"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ccActionBtn, deployLoading && { opacity: 0.4 }]}
                onPress={deployAccount}
                disabled={deployLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="rocket-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.ccActionText}>
                  {deployLoading ? "Deploying..." : "Deploy on-chain"}
                </Text>
              </TouchableOpacity>
            </View>

            {deployMessage && (
              <Text style={styles.ccBackTextMuted}>{deployMessage}</Text>
            )}

            <View style={styles.ccInfoRow}>
              <Text style={styles.ccBackTextMuted}>Network: Starknet Mainnet</Text>
              <Text style={styles.ccBackTextMuted}>Provider: Privy (embedded)</Text>
            </View>
          </>
        ) : sessionId ? (
          <>
            <Text style={styles.ccBackLabel}>ADDRESS UNAVAILABLE</Text>
            {walletError && <Text style={styles.ccErrorText}>{walletError}</Text>}
            <TouchableOpacity style={styles.ccActionBtn} onPress={loadWallet} activeOpacity={0.7}>
              <Text style={styles.ccActionText}>Retry</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.ccBackTextMuted}>Sign in to view your deposit address.</Text>
        )}
      </View>

      <Text style={styles.ccFlipHintBack}>Tap to flip back</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Profile</Text>

        {/* ── User info card ────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.infoText}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{email ?? "Not signed in"}</Text>
          </View>
        </View>

        {/* ── Flippable credit card ────────────────────────────── */}
        <FlipCard front={cardFront} back={cardBack} />

        {/* ── Settings ──────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          {SETTINGS_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item}
              style={[styles.settingsRow, idx < SETTINGS_ITEMS.length - 1 && styles.settingsBorder]}
              activeOpacity={0.6}
              onPress={() => Alert.alert(item, `${item} settings`)}
            >
              <Text style={styles.settingsLabel}>{item}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Log out ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutRow}
          activeOpacity={0.6}
          onPress={() =>
            Alert.alert("Log out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Log out", style: "destructive", onPress: logout },
            ])
          }
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // ── User info ──
  infoCard: {
    ...cardStyle,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { color: colors.primaryText, fontSize: 18, fontWeight: "700" },
  infoText: { flex: 1 },
  name: { fontSize: 17, fontWeight: "600", color: colors.text },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // ── Credit card (front) ──
  creditCard: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  ccFrontCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ccSeeAddress: {
    color: "#e0e0e0",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  ccFlipHint: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
  },

  // ── Credit card (back) ──
  creditCardBack: {
    flex: 1,
    backgroundColor: "#16213e",
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  ccStripe: {
    height: 36,
    backgroundColor: "#0f0f23",
    marginTop: 18,
  },
  ccBackContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: "center",
  },
  ccLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ccBackLabel: {
    color: "#8a8a9a",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  ccAddrFull: {
    color: "#e0e0e0",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 10,
    lineHeight: 16,
    marginBottom: 10,
  },
  ccActionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  ccActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  ccActionBtnDone: { opacity: 0.5 },
  ccActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  ccInfoRow: {
    marginTop: 4,
    gap: 2,
  },
  ccBackTextMuted: {
    color: "#7a7a90",
    fontSize: 10,
    lineHeight: 15,
  },
  ccErrorText: {
    color: "#EF4444",
    fontSize: 11,
    marginBottom: 6,
  },
  ccFlipHintBack: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
  },

  // ── Sections ──
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // ── Settings ──
  settingsCard: {
    ...cardStyle,
    marginHorizontal: spacing.md,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  settingsBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  settingsLabel: { fontSize: 15, color: colors.text },

  // ── Logout ──
  logoutRow: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: "center",
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: "600" },
});
