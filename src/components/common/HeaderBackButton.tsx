import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";
import { t } from "@i18n/index";

interface HeaderBackButtonProps {
  onPress: () => void;
  tintColor?: string;
}

export default function HeaderBackButton({ onPress, tintColor }: HeaderBackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t.back}
    >
      <MaterialCommunityIcons
        name="chevron-right"
        size={28}
        color={tintColor ?? colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
});
