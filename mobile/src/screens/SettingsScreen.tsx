import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";

export const SettingsScreen = () => {
  const { email, logout } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Logged in as</Text>
        <Text style={styles.value}>{email || "Guest"}</Text>
      </View>
      <TouchableOpacity style={styles.secondaryButton} onPress={logout}>
        <Text style={styles.secondaryButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 16 },
  title: { color: "#F3F5F7", fontSize: 24, fontWeight: "700", marginBottom: 16 },
  card: { backgroundColor: "#121B2E", padding: 16, borderRadius: 12, marginBottom: 16 },
  label: { color: "#96A4B8", marginBottom: 6 },
  value: { color: "#F3F5F7", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2B3C52",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center"
  },
  secondaryButtonText: { color: "#F3F5F7" }
});
