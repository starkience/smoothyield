import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { colors, spacing, cardStyle } from "../theme";
import { PrimaryButton } from "./PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { createApi } from "../api";

const LBTC_DECIMALS = 8;
function displayToRawLbtc(display: string): string {
  const n = parseFloat(display);
  if (!Number.isFinite(n) || n < 0) return "0";
  return Math.floor(n * 10 ** LBTC_DECIMALS).toString();
}

type Phase = "idle" | "staking" | "earning" | "unstaking" | "unstaked";
type ModalTab = "stake" | "unstake";

export const StakingCard: React.FC = () => {
  const { sessionId, getAccessToken } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("stake");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState("0.01");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [stakeTx, setStakeTx] = useState<{ hash: string; url: string } | null>(null);
  const [lbtcBalanceRaw, setLbtcBalanceRaw] = useState<string | null>(null);
  const [stakedAmountRaw, setStakedAmountRaw] = useState<string | null>(null);
  const [yieldStatus, setYieldStatus] = useState<string>("none");
  const [accruedUsd, setAccruedUsd] = useState(0);
  const [btcStakingApy, setBtcStakingApy] = useState(3.33);

  const api = useMemo(() => createApi(sessionId), [sessionId]);

  const loadBalance = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get<{
        crypto?: {
          lbtcBalance?: string;
          btcStakingApy?: number;
          btcYieldPosition?: {
            stakedAmountLbtc?: string | null;
            status?: string;
            accruedUsd?: number;
          };
        };
      }>("/api/portfolio");
      setLbtcBalanceRaw(res.crypto?.lbtcBalance ?? "0");
      if (res.crypto?.btcStakingApy != null) setBtcStakingApy(res.crypto.btcStakingApy);
      const pos = res.crypto?.btcYieldPosition;
      setStakedAmountRaw(pos?.stakedAmountLbtc ?? null);
      setYieldStatus(pos?.status ?? "none");
      setAccruedUsd(pos?.accruedUsd ?? 0);
    } catch {
      setLbtcBalanceRaw("0");
    }
  }, [sessionId, api]);

  // Load on mount + when modal opens
  useEffect(() => {
    if (sessionId) loadBalance();
  }, [sessionId, loadBalance]);

  useEffect(() => {
    if (modalVisible && sessionId) loadBalance();
  }, [modalVisible, sessionId, loadBalance]);

  const lbtcDisplay =
    lbtcBalanceRaw != null
      ? (Number(lbtcBalanceRaw) / 10 ** LBTC_DECIMALS).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        })
      : null;

  const stakedDisplay =
    stakedAmountRaw != null
      ? (Number(stakedAmountRaw) / 10 ** LBTC_DECIMALS).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        })
      : null;

  const handleStake = async () => {
    setError(null);
    if (!sessionId) {
      Alert.alert("Sign in required", "Please sign in from the Profile tab to stake BTC.");
      return;
    }
    const raw = displayToRawLbtc(stakeAmount);
    if (raw === "0") {
      setError("Enter an amount to stake");
      return;
    }
    try {
      setPhase("staking");
      const freshToken = await getAccessToken();
      await api.post("/api/wallet/init", freshToken ? { privyToken: freshToken } : {});
      const res = await api.post<{ txHash: string; explorerUrl: string }>(
        "/api/yield/stake",
        freshToken ? { amountLbtc: raw, privyToken: freshToken } : { amountLbtc: raw },
      );
      setStakeTx({ hash: res.txHash, url: res.explorerUrl });
      setPhase("earning");
      loadBalance();
    } catch (err: any) {
      setError(err?.message || "Staking failed");
      setPhase("idle");
    }
  };

  const handleUnstake = async () => {
    setError(null);
    if (!sessionId) {
      Alert.alert("Sign in required", "Please sign in from the Profile tab.");
      return;
    }
    const raw = displayToRawLbtc(unstakeAmount);
    if (raw === "0") {
      setError("Enter an amount to unstake");
      return;
    }
    try {
      setPhase("unstaking");
      const freshToken = await getAccessToken();
      await api.post("/api/wallet/init", freshToken ? { privyToken: freshToken } : {});
      const res = await api.post<{ txHash: string; explorerUrl: string }>(
        "/api/yield/unstake",
        freshToken ? { amountLbtc: raw, privyToken: freshToken } : { amountLbtc: raw },
      );
      setStakeTx({ hash: res.txHash, url: res.explorerUrl });
      setPhase("unstaked");
      loadBalance();
    } catch (err: any) {
      setError(err?.message || "Unstaking failed");
      setPhase("idle");
    }
  };

  const openModal = () => {
    if (!sessionId) {
      Alert.alert("Sign in required", "Please sign in from the Profile tab to manage BTC staking.");
      return;
    }
    setPhase("idle");
    setError(null);
    setStakeTx(null);
    setModalTab("stake");
    setUnstakeAmount("");
    setModalVisible(true);
  };

  const switchTab = (tab: ModalTab) => {
    if (phase === "staking" || phase === "unstaking") return;
    setModalTab(tab);
    setPhase("idle");
    setError(null);
    setStakeTx(null);
  };

  const stakedBal = stakedAmountRaw != null ? Number(stakedAmountRaw) / 10 ** LBTC_DECIMALS : 0;

  const statusLabel =
    yieldStatus === "earning" ? "Earning" :
    yieldStatus === "unstaking" ? "Unstaking" :
    stakedBal > 0 ? "Active" : "Inactive";

  const statusColor = yieldStatus === "earning" || stakedBal > 0 ? colors.accent : colors.textTertiary;

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.cardTitle}>BTC Staking</Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.apyBadge}>
            <Text style={styles.apyText}>{btcStakingApy}% APY</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Staked</Text>
            <Text style={styles.statValue}>
              {stakedBal > 0
                ? `${stakedBal.toLocaleString("en-US", { maximumFractionDigits: 6 })} LBTC`
                : "—"}
            </Text>
          </View>
          {accruedUsd > 0 && (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Rewards</Text>
              <Text style={styles.statValue}>
                ${accruedUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.manageBtn} onPress={openModal} activeOpacity={0.7}>
          <Text style={styles.manageBtnText}>Manage</Text>
        </TouchableOpacity>
      </View>

      {/* ── Staking modal ───────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalTab === "stake" ? "Stake BTC" : "Unstake BTC"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, modalTab === "stake" && styles.tabActive]}
              onPress={() => switchTab("stake")}
            >
              <Text style={[styles.tabText, modalTab === "stake" && styles.tabTextActive]}>
                Stake
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, modalTab === "unstake" && styles.tabActive]}
              onPress={() => switchTab("unstake")}
            >
              <Text style={[styles.tabText, modalTab === "unstake" && styles.tabTextActive]}>
                Unstake
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.apyDisplay}>
            <Text style={styles.apyDisplayLabel}>Current APY</Text>
            <Text style={styles.apyDisplayValue}>{btcStakingApy}%</Text>
            <Text style={styles.apyDisplayNote}>Gasless staking on Starknet</Text>
          </View>

          {/* ────── STAKE TAB ────── */}
          {modalTab === "stake" && phase === "idle" && (
            <View style={styles.formSection}>
              {lbtcDisplay != null && (
                <Text style={styles.balanceLabel}>Available: {lbtcDisplay} LBTC</Text>
              )}

              <View style={styles.pctRow}>
                {[10, 25, 50, 75, 100].map((pct) => {
                  const bal = lbtcBalanceRaw != null ? Number(lbtcBalanceRaw) / 10 ** LBTC_DECIMALS : 0;
                  return (
                    <TouchableOpacity
                      key={pct}
                      style={[styles.pctBtn, bal <= 0 && styles.pctBtnDisabled]}
                      disabled={bal <= 0}
                      onPress={() => setStakeAmount(((bal * pct) / 100).toString())}
                    >
                      <Text style={[styles.pctBtnText, bal <= 0 && styles.pctBtnTextDisabled]}>
                        {pct}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.amountInput}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                maxLength={18}
              />
              <Text style={styles.amountUnit}>LBTC</Text>

              <PrimaryButton title="Stake BTC now" onPress={handleStake} style={{ marginTop: 20, marginHorizontal: 0 }} />
            </View>
          )}

          {/* ────── UNSTAKE TAB ────── */}
          {modalTab === "unstake" && phase === "idle" && (
            <View style={styles.formSection}>
              {stakedDisplay != null && (
                <Text style={styles.balanceLabel}>Staked: {stakedDisplay} LBTC</Text>
              )}

              <View style={styles.pctRow}>
                {[25, 50, 75, 100].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.pctBtn, stakedBal <= 0 && styles.pctBtnDisabled]}
                    disabled={stakedBal <= 0}
                    onPress={() => setUnstakeAmount(((stakedBal * pct) / 100).toString())}
                  >
                    <Text style={[styles.pctBtnText, stakedBal <= 0 && styles.pctBtnTextDisabled]}>
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.amountInput}
                value={unstakeAmount}
                onChangeText={setUnstakeAmount}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                maxLength={18}
              />
              <Text style={styles.amountUnit}>LBTC</Text>

              <TouchableOpacity
                style={styles.unstakeBtn}
                onPress={handleUnstake}
                activeOpacity={0.7}
              >
                <Text style={styles.unstakeBtnText}>Unstake BTC</Text>
              </TouchableOpacity>

              <Text style={styles.unstakeNote}>
                Unstaking initiates an exit request. Funds are returned after a short cooldown period.
              </Text>
            </View>
          )}

          {/* ────── Progress states ────── */}
          {phase === "staking" && (
            <View style={styles.formSection}>
              <Text style={styles.progressTitle}>Staking in progress...</Text>
              {["Staking on Starknet", "Earning"].map((step) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepLabel}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {phase === "unstaking" && (
            <View style={styles.formSection}>
              <Text style={styles.progressTitle}>Unstaking in progress...</Text>
              {["Initiating exit request", "Processing"].map((step) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepLabel}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {phase === "earning" && (
            <View style={styles.formSection}>
              <Text style={styles.successTitle}>You are now earning</Text>
              <Text style={styles.successApy}>{btcStakingApy}% APY</Text>
              <Text style={styles.successNote}>on your BTC via Starknet</Text>
              {stakeTx && (
                <TouchableOpacity onPress={() => Linking.openURL(stakeTx.url)} style={{ marginTop: 16 }}>
                  <Text style={styles.txLink}>View transaction: {stakeTx.hash.slice(0, 12)}...</Text>
                </TouchableOpacity>
              )}
              <PrimaryButton
                title="Done"
                onPress={() => setModalVisible(false)}
                style={{ marginTop: 24, marginHorizontal: 0 }}
              />
            </View>
          )}

          {phase === "unstaked" && (
            <View style={styles.formSection}>
              <Text style={styles.successTitle}>Unstake requested</Text>
              <Text style={styles.successNote}>
                Your exit request has been submitted. Funds will be available after the cooldown period.
              </Text>
              {stakeTx && (
                <TouchableOpacity onPress={() => Linking.openURL(stakeTx.url)} style={{ marginTop: 16 }}>
                  <Text style={styles.txLink}>View transaction: {stakeTx.hash.slice(0, 12)}...</Text>
                </TouchableOpacity>
              )}
              <PrimaryButton
                title="Done"
                onPress={() => setModalVisible(false)}
                style={{ marginTop: 24, marginHorizontal: 0 }}
              />
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {},
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  statusText: { fontSize: 12, fontWeight: "600", color: colors.accent },
  apyBadge: {
    backgroundColor: colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  apyText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  statsRow: { flexDirection: "row", gap: 24 },
  stat: {},
  statLabel: { fontSize: 12, color: colors.textSecondary },
  statValue: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 2 },
  manageBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
  },
  manageBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },

  // ── Modal ──
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  closeText: { fontSize: 15, color: colors.textSecondary, fontWeight: "600" },

  // ── Tab switcher ──
  tabRow: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primaryText,
  },

  apyDisplay: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  apyDisplayLabel: { fontSize: 13, color: colors.textSecondary },
  apyDisplayValue: { fontSize: 42, fontWeight: "800", color: colors.accent, marginVertical: 4 },
  apyDisplayNote: { fontSize: 12, color: colors.textTertiary },
  formSection: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  balanceLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  pctRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  pctBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pctBtnDisabled: { opacity: 0.4 },
  pctBtnText: { fontSize: 13, fontWeight: "600", color: colors.text },
  pctBtnTextDisabled: { color: colors.textTertiary },
  amountInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  amountUnit: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },

  // ── Unstake button ──
  unstakeBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.danger,
    alignItems: "center",
  },
  unstakeBtnText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 16,
  },
  unstakeNote: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 17,
  },

  progressTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 10,
  },
  stepLabel: { fontSize: 15, color: colors.text },
  successTitle: { fontSize: 16, color: colors.textSecondary, textAlign: "center" },
  successApy: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.accent,
    textAlign: "center",
    marginVertical: 4,
  },
  successNote: { fontSize: 14, color: colors.textTertiary, textAlign: "center" },
  txLink: { color: "#2563EB", fontSize: 13, textAlign: "center" },
  error: { color: colors.danger, marginTop: 12, textAlign: "center", paddingHorizontal: spacing.md },
});
