import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLoginWithEmail } from "@privy-io/expo";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

const BTC_APY = "3.33";

export const LoginScreen = () => {
  const { loginWithGoogle, loading } = useAuth();
  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const codeSent = emailState.status === "awaiting-code-input";
  const emailBusy = emailState.status === "sending-code" || emailState.status === "submitting-code";
  const emailError = emailState.status === "error" ? emailState.error?.message ?? "Something went wrong" : null;

  const handleSendCode = async () => {
    if (!email.trim()) return;
    try {
      await sendCode({ email: email.trim() });
    } catch (e: any) {
      console.error("[Login] sendCode error:", e);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    try {
      await loginWithCode({ code: code.trim() });
    } catch (e: any) {
      console.error("[Login] loginWithCode error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand ─────────────────────────────────────────────── */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>S</Text>
            </View>
            <Text style={styles.appName}>SmoothYield</Text>
            <Text style={styles.tagline}>
              Your brokerage account.{"\n"}Stocks, crypto & BTC yield.
            </Text>
          </View>

          {/* ── Feature bullets ───────────────────────────────────── */}
          <View style={styles.bullets}>
            {[
              { icon: "📈", text: "Track your stocks & ETFs" },
              { icon: "₿", text: "Hold BTC, ETH, SOL & more" },
              { icon: "⚡", text: `Earn ${BTC_APY}% APY on BTC` },
            ].map((b) => (
              <View key={b.text} style={styles.bulletRow}>
                <Text style={styles.bulletIcon}>{b.icon}</Text>
                <Text style={styles.bulletText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* ── CTA ───────────────────────────────────────────────── */}
          <View style={styles.cta}>
            {loading ? (
              <ActivityIndicator color={colors.text} size="large" style={{ marginBottom: 24 }} />
            ) : (
              <>
                {!showEmail && !codeSent ? (
                  <>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => setShowEmail(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryButtonText}>Continue with email</Text>
                    </TouchableOpacity>
                    <Text style={styles.emailHint}>We'll send a 6-digit code to your inbox</Text>

                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      style={styles.googleButton}
                      onPress={loginWithGoogle}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                  </>
                ) : codeSent ? (
                  <View style={styles.otpWrap}>
                    <Text style={styles.otpHint}>Enter the 6-digit code sent to {email}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="000000"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="number-pad"
                      value={code}
                      onChangeText={setCode}
                      maxLength={6}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.primaryButton, emailBusy && styles.buttonDisabled]}
                      onPress={handleVerifyCode}
                      disabled={emailBusy}
                    >
                      {emailBusy
                        ? <ActivityIndicator color={colors.primaryText} />
                        : <Text style={styles.primaryButtonText}>Verify code</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => { setShowEmail(false); setCode(""); }}
                    >
                      <Text style={styles.linkText}>Use a different email</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.otpWrap}>
                    <Text style={styles.otpHint}>We'll send a one-time code to this address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.primaryButton, emailBusy && styles.buttonDisabled]}
                      onPress={handleSendCode}
                      disabled={emailBusy}
                    >
                      {emailBusy
                        ? <ActivityIndicator color={colors.primaryText} />
                        : <Text style={styles.primaryButtonText}>Send code</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => setShowEmail(false)}
                    >
                      <Text style={styles.linkText}>Back</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            <Text style={styles.hint}>No seed phrases. No gas fees.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 36,
    justifyContent: "space-between",
  },

  brand: { alignItems: "center" },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoIcon: { fontSize: 30, fontWeight: "800", color: colors.text },
  appName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  bullets: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    gap: 14,
  },
  bulletRow: { flexDirection: "row", alignItems: "center" },
  bulletIcon: { fontSize: 20, width: 34 },
  bulletText: { color: colors.text, fontSize: 14, flex: 1 },

  cta: { alignItems: "center" },

  primaryButton: {
    backgroundColor: colors.primary,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: colors.primaryText, fontWeight: "700", fontSize: 15 },

  googleButton: {
    backgroundColor: colors.background,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.text,
  },
  googleButtonText: { color: colors.text, fontWeight: "700", fontSize: 15 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  dividerText: { color: colors.textTertiary, paddingHorizontal: 12, fontSize: 13 },

  emailHint: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },

  otpWrap: { width: "100%", gap: 10, marginBottom: 8 },
  otpHint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 15,
  },

  linkButton: { width: "100%", alignItems: "center", paddingVertical: 12 },
  linkText: { color: colors.text, fontSize: 15, fontWeight: "600" },

  hint: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
