import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { markets } from "../constants";
import { MarketRow } from "../components/MarketRow";

export const MarketsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Markets</Text>
      <FlatList
        data={markets}
        keyExtractor={(item) => item.ticker}
        renderItem={({ item }) => (
          <MarketRow
            ticker={item.ticker}
            name={item.name}
            price={item.price}
            changePct={item.changePct}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 16 },
  title: { color: "#F3F5F7", fontSize: 24, fontWeight: "700", marginBottom: 16 }
});
