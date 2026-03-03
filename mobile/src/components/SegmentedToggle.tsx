import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

export const SegmentedToggle: React.FC<Props> = ({ options, selected, onSelect }) => (
  <View style={styles.container}>
    {options.map((opt) => {
      const active = opt === selected;
      return (
        <TouchableOpacity
          key={opt}
          style={[styles.pill, active && styles.pillActive]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 3,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primaryText,
  },
});
