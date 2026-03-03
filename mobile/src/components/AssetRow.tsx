import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { colors, spacing } from "../theme";

interface Props {
  icon?: string;
  imageUrl?: string;
  symbol: string;
  name: string;
  priceUsd?: number;
  qty?: number;
  valueUsd?: number;
  changePct?: number;
  showBuySell?: boolean;
}

export const AssetRow: React.FC<Props> = ({
  icon,
  imageUrl,
  symbol,
  name,
  priceUsd,
  qty,
  valueUsd,
  changePct,
  showBuySell,
}) => {
  const [imgError, setImgError] = useState(false);
  const fallbackLetter = symbol[0];

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.iconImage}
            onError={() => setImgError(true)}
          />
        ) : icon ? (
          <Text style={styles.iconText}>{icon}</Text>
        ) : (
          <Text style={styles.fallbackLetter}>{fallbackLetter}</Text>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
      </View>

      <View style={styles.right}>
        {qty != null && (
          <Text style={styles.qty}>
            {qty % 1 === 0 ? `${qty} shares` : qty.toLocaleString("en-US", { maximumFractionDigits: 6 })}
          </Text>
        )}
        {valueUsd != null && (
          <Text style={styles.value}>
            {valueUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          </Text>
        )}
        {priceUsd != null && valueUsd == null && (
          <Text style={styles.value}>
            {priceUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          </Text>
        )}
        {changePct != null && (
          <Text style={[styles.change, changePct >= 0 ? styles.changePos : styles.changeNeg]}>
            {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
          </Text>
        )}
      </View>

      {showBuySell && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => Alert.alert(`Buy ${symbol}`, `Place a buy order for ${symbol}?`)}
          >
            <Text style={styles.buyText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sellBtn}
            onPress={() => Alert.alert(`Sell ${symbol}`, `Place a sell order for ${symbol}?`)}
          >
            <Text style={styles.sellText}>Sell</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  iconImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconText: { fontSize: 16 },
  fallbackLetter: { fontSize: 15, fontWeight: "700", color: colors.textSecondary },
  info: { flex: 1, marginRight: 8 },
  symbol: { fontSize: 15, fontWeight: "600", color: colors.text },
  name: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  right: { alignItems: "flex-end", marginRight: 4 },
  qty: { fontSize: 12, color: colors.textSecondary },
  value: { fontSize: 14, fontWeight: "600", color: colors.text },
  change: { fontSize: 11, marginTop: 1 },
  changePos: { color: colors.positive },
  changeNeg: { color: colors.negative },
  actions: { flexDirection: "row", gap: 6, marginLeft: 8 },
  buyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  buyText: { color: colors.primaryText, fontSize: 12, fontWeight: "600" },
  sellBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sellText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
});
