import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@config/theme";
import WineTypeChip from "@components/inventory/WineTypeChip";
import type { WineType } from "@/types/index";

interface SearchResultRowProps {
  wineName: string;
  wineType: WineType;
  quantity: number;
  location?: string;
  onPress: () => void;
}

export default function SearchResultRow({
  wineName,
  wineType,
  quantity,
  location,
  onPress,
}: SearchResultRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.left}>
        <Text variant="bodyLarge" style={styles.name} numberOfLines={1}>
          {wineName}
        </Text>
        <View style={styles.meta}>
          <WineTypeChip type={wineType} />
          {location ? (
            <Text variant="bodySmall" style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          ) : null}
        </View>
      </View>
      <Text variant="titleMedium" style={styles.quantity}>
        {quantity}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  left: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: colors.text,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  location: {
    color: colors.textSecondary,
  },
  quantity: {
    color: colors.primary,
    fontWeight: "bold",
    marginStart: 12,
  },
});
