import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<Props> = ({ value, onChangeText, placeholder = "Search" }) => (
  <View style={styles.container}>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
});
