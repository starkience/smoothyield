import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../src/theme";
import { userSummary, transactions } from "../../src/mockData";
import { BalanceCard } from "../../src/components/BalanceCard";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { TransactionRow } from "../../src/components/TransactionRow";

const FUNDING_OPTIONS = [
  { label: "Bank transfer", caption: null },
  { label: "Card", caption: "Card payments via Read" },
  { label: "Apple Pay", caption: "Apple Pay powered by MoonPay" },
];

export default function HomeScreen() {
  const [fundingModal, setFundingModal] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Home</Text>

        <BalanceCard
          totalBalanceUsd={userSummary.totalBalanceUsd}
          cashUsd={userSummary.cashUsd}
        />

        <PrimaryButton title="Add money" onPress={() => setFundingModal(true)} />

        <View style={styles.chips}>
          {["Bank transfer", "Card", "Apple Pay"].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.chip}
              onPress={() => setFundingModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Latest transactions</Text>
        <View style={styles.txCard}>
          {transactions.slice(0, 5).map((tx) => (
            <TransactionRow
              key={tx.id}
              title={tx.title}
              subtitle={tx.subtitle}
              amountUsd={tx.amountUsd}
            />
          ))}
        </View>
      </ScrollView>

      {/* ── Funding modal ────────────────────────────────────────── */}
      <Modal visible={fundingModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add money</Text>
            <TouchableOpacity onPress={() => setFundingModal(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          {FUNDING_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.fundingRow}
              activeOpacity={0.7}
              onPress={() => setFundingModal(false)}
            >
              <Text style={styles.fundingLabel}>{opt.label}</Text>
              {opt.caption && (
                <Text style={styles.fundingCaption}>{opt.caption}</Text>
              )}
            </TouchableOpacity>
          ))}
        </SafeAreaView>
      </Modal>
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
  },
  chips: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: spacing.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.text },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  txCard: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },

  // ── Modal ──
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  closeText: { fontSize: 15, color: colors.textSecondary, fontWeight: "600" },
  fundingRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  fundingLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  fundingCaption: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },
});
