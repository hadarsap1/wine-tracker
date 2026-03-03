import React from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { colors } from "@config/theme";

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
