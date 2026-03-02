import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { usePrivy } from "@privy-io/expo";
import { useAuth } from "../context/AuthContext";
import { createApi } from "../api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "john.doe@gmail.com" → "John Doe" */
const emailToDisplayName = (email?: string | null): string => {
  if (!email) return "Logged in user";
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

/** Truncate address for display: "0x04abc…def9" */
const truncateAddress = (addr: string, head = 10, tail = 8): string => {
  if (!addr || addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
};

/** Normalize to 66-char form (0x + 64 hex digits) so Ready and other wallets accept it when sending funds. */
const normalizeStarknetAddress = (address: string): string => {
  if (!address || typeof address !== "string") return address;
  const hex = address.startsWith("0x") ? address.slice(2) : address;
  const trimmed = hex.replace(/^0+/, "") || "0";
  if (trimmed.length > 64) return address;
  return "0x" + trimmed.padStart(64, "0");
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfileScreen = () => {
  const { user } = usePrivy();
  const { sessionId, email: authEmail, logout } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);

  // Derive email from Privy user (AuthContext may have it too, but user is source of truth).
  const email = authEmail ?? user?.email?.address ?? user?.google?.email ?? null;
  const username = emailToDisplayName(email);
  const initials = nameToInitials(username);
  const isLoggedIn = !!user;

  // Load Starknet wallet address from backend and trigger deploy so the account exists on-chain (Voyager).
  // We always call POST /api/wallet/init when we have a session so the backend runs deploy for existing wallets too.
  const loadWallet = useCallback(async () => {
    if (!sessionId) {
      console.warn("[Profile] loadWallet skipped: no sessionId (backend may be unreachable)");
      return;
    }
    setWalletLoading(true);
    setWalletError(null);
    const api = createApi(sessionId);
    try {
      // Optional: quick display from GET so UI isn't empty while init runs
      const res = await api.get<{ address?: string | null }>("/api/wallet/address");
      const addr = res?.address ?? null;
      if (addr && typeof addr === "string") {
        setWalletAddress(normalizeStarknetAddress(addr));
      }

      // Always call init so backend runs deploy (for new and existing wallets). This is what makes the address show on Voyager.
      const initRes = await api.post<{
        address?: string;
        ready?: boolean;
        deployed?: boolean;
        alreadyDeployed?: boolean;
        txHash?: string;
        explorerUrl?: string;
        deployError?: string;
      }>("/api/wallet/init", {});

      const addressFromInit = initRes && typeof initRes.address === "string" ? initRes.address : null;
      if (addressFromInit) {
        setWalletAddress(normalizeStarknetAddress(addressFromInit));
      }

      if (initRes?.deployError) {
        setWalletError(`Deploy failed: ${initRes.deployError}. Your address is valid; you can retry or use Stake/Convert to deploy.`);
      } else if (initRes?.deployed && initRes?.txHash) {
        setWalletError(null);
        // Optionally log so user can open explorer: initRes.explorerUrl
      } else if (!addressFromInit && !addr) {
        const res2 = await api.get<{ address?: string | null }>("/api/wallet/address");
        const addr2 = res2?.address ?? null;
        if (addr2 && typeof addr2 === "string") {
          setWalletAddress(normalizeStarknetAddress(addr2));
        } else {
          setWalletError("Server did not return an address. Check backend logs for [wallet/init] errors.");
        }
      }
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "Request failed");
      console.warn("[Profile] loadWallet error:", msg);

      // Recover: address may already exist (e.g. init succeeded but response was lost).
      try {
        const retryRes = await api.get<{ address?: string | null }>("/api/wallet/address");
        const retryAddr = retryRes?.address ?? null;
        if (retryAddr && typeof retryAddr === "string") {
          setWalletAddress(normalizeStarknetAddress(retryAddr));
          if (msg.includes("Resources bounds") || msg.includes("starknet_addDeployAccountTransaction")) {
            setWalletError("Address loaded. The error below is from a transaction (e.g. Stake), not from loading your address.");
          } else {
            setWalletError(null);
          }
          return;
        }
      } catch {
        // ignore
      }

      setWalletAddress(null);
      if (msg.includes("Resources bounds") || msg.includes("starknet_addDeployAccountTransaction") || msg.includes("exceed balance")) {
        setWalletError("Transaction failed (wallet not yet sponsored for gas). Your address may still load above after retry. For Stake/Convert, ensure AVNU paymaster is configured on the backend.");
      } else {
        setWalletError(msg);
      }
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
      const res = await api.post<{ alreadyDeployed?: boolean; txHash?: string; explorerUrl?: string; error?: string }>("/api/wallet/deploy", {});
      if (res?.alreadyDeployed) {
        setDeployMessage("Account already on-chain. View on Voyager: voyager.online");
      } else if (res?.txHash && res?.explorerUrl) {
        setDeployMessage("Deploy sent! View transaction:");
        if (res.explorerUrl) Linking.openURL(res.explorerUrl);
      } else if (res?.error) {
        setDeployMessage(`Deploy failed: ${res.error}`);
      }
    } catch (err: any) {
      setDeployMessage(err?.message || "Deploy failed");
    } finally {
      setDeployLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Profile</Text>

        {isLoggedIn ? (
          <>
            {/* ── Profile card: username, email, Starknet address ───────────────── */}
            <View style={styles.profileCard}>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.avatarInfo}>
                  <Text style={[styles.label, styles.labelFirst]}>Username</Text>
                  <Text style={styles.username}>{username}</Text>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.valueText}>{email || "—"}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.addressSection}>
                <Text style={styles.label}>Your 0x wallet address</Text>
                <Text style={styles.addressHint}>
                  Send USDC (or BTC) to this address. Copy it when depositing from an exchange or another wallet.
                </Text>
                {walletLoading ? (
                  <Text style={styles.addressValue}>Loading…</Text>
                ) : walletAddress ? (
                  <>
                    <View style={styles.addressBox}>
                      <Text style={styles.addressValueFull} selectable>
                        {walletAddress}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.copyButtonLarge, copied && styles.copyButtonDone]}
                      onPress={copyAddress}
                    >
                      <Text style={styles.copyButtonText}>
                        {copied ? "✓ Copied to clipboard" : "Copy address"}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.deployHint}>
                      Your address is not on-chain until the account is deployed. Deploy once so it appears on Voyager.
                    </Text>
                    <TouchableOpacity
                      style={[styles.deployButton, deployLoading && styles.deployButtonDisabled]}
                      onPress={deployAccount}
                      disabled={deployLoading}
                    >
                      <Text style={styles.deployButtonText}>
                        {deployLoading ? "Deploying…" : "Deploy account on-chain"}
                      </Text>
                    </TouchableOpacity>
                    {deployMessage ? (
                      <Text style={styles.deployMessage}>{deployMessage}</Text>
                    ) : null}
                  </>
                ) : sessionId ? (
                  <>
                    <Text style={styles.addressValue}>Unable to load address</Text>
                    {walletError ? (
                      <Text style={styles.walletErrorText}>{walletError}</Text>
                    ) : null}
                    <Text style={styles.addressHint}>
                      Ensure the backend is running (e.g. <Text style={styles.backendUnreachableCode}>cd backend && npm run dev</Text>) and <Text style={styles.backendUnreachableCode}>EXPO_PUBLIC_API_URL</Text> points to it (e.g. your machine’s IP:3001). Then tap Retry.
                    </Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => loadWallet()}
                      disabled={walletLoading}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.backendUnreachableBox}>
                    <Text style={styles.backendUnreachableTitle}>Backend not connected</Text>
                    <Text style={styles.backendUnreachableText}>
                      Your wallet address is loaded from the server. To see it here:
                    </Text>
                    <Text style={styles.backendUnreachableStep}>1. Start the backend: <Text style={styles.backendUnreachableCode}>cd backend && npm run dev</Text></Text>
                    <Text style={styles.backendUnreachableStep}>2. In .env set <Text style={styles.backendUnreachableCode}>EXPO_PUBLIC_API_URL=http://YOUR_IP:3001</Text> (use your computer’s IP if on device)</Text>
                    <Text style={styles.backendUnreachableStep}>3. Restart the app with <Text style={styles.backendUnreachableCode}>npx expo start --clear</Text></Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Account info ─────────────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.card}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsKey}>Network</Text>
                <Text style={styles.settingsValue}>Starknet Mainnet</Text>
              </View>
              <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.settingsKey}>Wallet</Text>
                <Text style={styles.settingsValue}>Privy embedded (Starkzap)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
            <Text style={styles.logoutHint}>
              Log out to see the Privy login screen again (email or Google).
            </Text>
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

  profileCard: {
    backgroundColor: "#121B2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2A3C",
    padding: 20,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
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
  avatarInfo: { marginLeft: 16, flex: 1 },
  label: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 10,
  },
  labelFirst: { marginTop: 0 },
  username: {
    color: "#F3F5F7",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  valueText: {
    color: "#96A4B8",
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#1F2A3C",
    marginVertical: 16,
  },
  addressSection: {},
  addressHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  addressBox: {
    backgroundColor: "#0B1220",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2A3C",
  },
  addressValueFull: {
    color: "#1EC98A",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addressValue: {
    color: "#1EC98A",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    flex: 1,
  },
  walletErrorText: {
    color: "#F86A5C",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1F2A3C",
  },
  retryButtonText: {
    color: "#1EC98A",
    fontWeight: "600",
    fontSize: 13,
  },
  copyButtonLarge: {
    backgroundColor: "#1EC98A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  copyButton: {
    backgroundColor: "#1EC98A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonDone: { backgroundColor: "#1EC98A88" },
  copyButtonText: { color: "#0B1220", fontWeight: "700", fontSize: 13 },

  deployHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  deployButton: {
    backgroundColor: "#1F2A3C",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1EC98A44",
  },
  deployButtonDisabled: { opacity: 0.7 },
  deployButtonText: { color: "#1EC98A", fontWeight: "700", fontSize: 13 },
  deployMessage: {
    color: "#96A4B8",
    fontSize: 12,
    marginTop: 10,
  },

  unavailableHint: {
    color: "#96A4B8",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  backendUnreachableBox: {
    backgroundColor: "#1F2A3C",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2B3C52",
  },
  backendUnreachableTitle: {
    color: "#F3F5F7",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  backendUnreachableText: {
    color: "#96A4B8",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  backendUnreachableStep: {
    color: "#96A4B8",
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 6,
  },
  backendUnreachableCode: {
    color: "#1EC98A",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
  },

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
    borderWidth: 1,
    borderColor: "#1F2A3C",
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

  logoutButton: {
    borderWidth: 1,
    borderColor: "#F86A5C44",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: { color: "#F86A5C", fontWeight: "600" },
  logoutHint: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 24,
  },
});
