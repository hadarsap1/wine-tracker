import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { colors } from "@config/theme";
import type { AppInventoryItem } from "@/types/index";
import WineTypeChip from "./WineTypeChip";

interface InventoryCardProps {
  item: AppInventoryItem;
  onPress: () => void;
}

export default function InventoryCard({ item, onPress }: InventoryCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <View style={styles.left}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
              {item.wineName}
            </Text>
            <WineTypeChip type={item.wineType} compact />
          </View>
          <View style={styles.right}>
            <Text variant="headlineSmall" style={styles.quantity}>
              {item.quantity}
            </Text>
            <Text variant="labelSmall" style={styles.quantityLabel}>
              {item.quantity === 1 ? "bottle" : "bottles"}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
    gap: 8,
    marginRight: 12,
  },
  name: {
    color: colors.text,
  },
  right: {
    alignItems: "center",
  },
  quantity: {
    color: colors.primary,
    fontWeight: "bold",
  },
  quantityLabel: {
    color: colors.textSecondary,
  },
});
