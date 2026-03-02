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
import { DEFAULT_BTC_STAKING_APY } from "../constants";

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
              <Text style={styles.logoIcon}>₿</Text>
            </View>
            <Text style={styles.appName}>SmoothYield</Text>
            <Text style={styles.tagline}>
              Your TradFi portfolio.{"\n"}With Bitcoin yield on top.
            </Text>
          </View>

          {/* ── Feature bullets ───────────────────────────────────── */}
          <View style={styles.bullets}>
            {[
              { icon: "📈", text: "Track your stocks & ETFs" },
              { icon: "₿",  text: "Hold BTC, ETH, SOL" },
              { icon: "⚡", text: `Earn ${DEFAULT_BTC_STAKING_APY}% APY on BTC · gasless` },
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
              <ActivityIndicator color="#1EC98A" size="large" style={{ marginBottom: 24 }} />
            ) : (
              <>
                {/* Email OTP — show as form or code entry */}
                {!showEmail && !codeSent ? (
                  <>
                    {/* Email + Google as equal primary options */}
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => setShowEmail(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryButtonText}>Continue with email</Text>
                    </TouchableOpacity>
                    <Text style={styles.emailHint}>We’ll send a 6-digit code to your inbox</Text>
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
                  /* code entry */
                  <View style={styles.otpWrap}>
                    <Text style={styles.otpHint}>Enter the 6-digit code sent to {email}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="000000"
                      placeholderTextColor="#4A5568"
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
                        ? <ActivityIndicator color="#0B1220" />
                        : <Text style={styles.primaryButtonText}>Verify code</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.emailToggle}
                      onPress={() => {
                        setShowEmail(false);
                        setCode("");
                      }}
                    >
                      <Text style={styles.emailToggleText}>Use a different email</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* email entry */
                  <View style={styles.otpWrap}>
                    <Text style={styles.otpHint}>We’ll send a one-time code to this address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="#4A5568"
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
                        ? <ActivityIndicator color="#0B1220" />
                        : <Text style={styles.primaryButtonText}>Send code</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.emailToggle}
                      onPress={() => setShowEmail(false)}
                    >
                      <Text style={styles.emailToggleText}>Back</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {emailError && (
              <Text style={styles.errorText}>{emailError}</Text>
            )}
            <Text style={styles.hint}>No wallet setup required.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },
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
    backgroundColor: "#1EC98A22",
    borderWidth: 2,
    borderColor: "#1EC98A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoIcon: { fontSize: 32, color: "#1EC98A" },
  appName: { color: "#F3F5F7", fontSize: 30, fontWeight: "800", marginBottom: 8 },
  tagline: { color: "#64748B", fontSize: 15, textAlign: "center", lineHeight: 22 },

  bullets: {
    backgroundColor: "#121B2E",
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  bulletRow: { flexDirection: "row", alignItems: "center" },
  bulletIcon: { fontSize: 20, width: 34 },
  bulletText: { color: "#96A4B8", fontSize: 14, flex: 1 },

  cta: { alignItems: "center" },

  googleButton: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  googleButtonText: { color: "#1A1A1A", fontWeight: "700", fontSize: 15 },

  dividerRow: { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1F2A3C" },
  dividerText: { color: "#4A5568", paddingHorizontal: 12, fontSize: 13 },

  emailToggle: { width: "100%", alignItems: "center", paddingVertical: 12 },
  emailToggleText: { color: "#1EC98A", fontSize: 15, fontWeight: "600" },

  otpWrap: { width: "100%", gap: 10, marginBottom: 8 },
  otpHint: { color: "#64748B", fontSize: 13, textAlign: "center", marginBottom: 4 },
  input: {
    backgroundColor: "#121B2E",
    borderWidth: 1,
    borderColor: "#1F2A3C",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#F3F5F7",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#1EC98A",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "#0B1220", fontWeight: "800", fontSize: 15 },

  emailHint: { color: "#64748B", fontSize: 12, textAlign: "center", marginTop: 4, marginBottom: 8 },
  hint: { color: "#4A5568", fontSize: 12, textAlign: "center", marginTop: 16 },
  errorText: { color: "#FF6B6B", fontSize: 13, textAlign: "center", marginTop: 8 },
});
