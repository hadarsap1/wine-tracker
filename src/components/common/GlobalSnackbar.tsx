import React from "react";
import { StyleSheet } from "react-native";
import { Snackbar } from "react-native-paper";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";

export default function GlobalSnackbar() {
  const { visible, message, type, hide } = useSnackbarStore();

  const backgroundColor =
    type === "error"
      ? colors.error
      : type === "success"
        ? "#2e7d32"
        : colors.card;

  return (
    <Snackbar
      visible={visible}
      onDismiss={hide}
      duration={type === "error" ? 5000 : 3000}
      style={[styles.snackbar, { backgroundColor }]}
      action={{ label: "✕", onPress: hide, textColor: colors.text }}
    >
      {message}
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
});
