import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
}: SettingsRowProps): React.ReactElement {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? styles.pressed : undefined,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* In RTL row: first child = rightmost (right side) */}
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color={colors.textSecondary}
        />
      </View>

      {/* flex:1 fills remaining space */}
      <Text variant="bodyLarge" style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      {/* Value sits directly between label and chevron — no inner row to flip */}
      {value ? (
        <Text variant="bodyMedium" style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {/* In RTL row: last child = leftmost (left side) */}
      {showChevron && onPress ? (
        <MaterialCommunityIcons
          name="chevron-left"
          size={22}
          color={colors.textSecondary}
          style={styles.chevron}
        />
      ) : null}
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
    borderRadius: 10,
    marginBottom: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  iconContainer: {
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 6,
    marginEnd: 12,
  },
  label: {
    flex: 1,
    color: colors.text,
    textAlign: "right",
  },
  value: {
    color: colors.textSecondary,
    marginStart: 12,
    maxWidth: 140,
    textAlign: "left",
  },
  chevron: {
    marginStart: 6,
  },
});
