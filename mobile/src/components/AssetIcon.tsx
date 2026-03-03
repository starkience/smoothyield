import React, { useState } from "react";
import { Image, View, Text, StyleSheet, ViewStyle } from "react-native";

type Props = {
  uri?: string;
  fallbackLetter: string;
  fallbackColor?: string;
  size?: number;
  style?: ViewStyle;
};

export const AssetIcon: React.FC<Props> = ({
  uri,
  fallbackLetter,
  fallbackColor = "#1EC98A",
  size = 40,
  style,
}) => {
  const [failed, setFailed] = useState(false);
  const radius = size / 2;

  if (!uri || failed) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius, backgroundColor: fallbackColor + "22" },
          style,
        ]}
      >
        <Text style={[styles.letter, { color: fallbackColor, fontSize: size * 0.4 }]}>
          {fallbackLetter}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: radius }, style]}
      onError={() => setFailed(true)}
    />
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    fontWeight: "800",
  },
});
