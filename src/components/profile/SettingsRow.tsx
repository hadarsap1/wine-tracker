import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { colors } from "@config/theme";

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

export default function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
}: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? styles.pressed : undefined,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={colors.textSecondary}
        style={styles.icon}
      />
      <Text variant="bodyLarge" style={styles.label}>
        {label}
      </Text>
      <View style={styles.right}>
        {value ? (
          <Text variant="bodyMedium" style={styles.value}>
            {value}
          </Text>
        ) : null}
        {showChevron && onPress ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={colors.textSecondary}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    minHeight: 56,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 12,
  },
  label: {
    flex: 1,
    color: colors.text,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  value: {
    color: colors.textSecondary,
  },
});
