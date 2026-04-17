import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import type { AppInventoryItem } from "@/types/index";
import WineTypeChip from "./WineTypeChip";

interface InventoryCardProps {
  item: AppInventoryItem;
  onPress: () => void;
}

export default function InventoryCard({ item, onPress }: InventoryCardProps): React.ReactElement {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <View style={styles.left}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
              {item.wineName}
            </Text>
            {item.producerName ? (
              <Text variant="bodySmall" style={styles.producer} numberOfLines={1}>
                {item.producerName}
              </Text>
            ) : null}
            <WineTypeChip type={item.wineType} compact />
            {item.location ? (
              <View style={styles.locationRow}>
                <Text variant="bodySmall" style={styles.locationText} numberOfLines={1}>
                  {item.location}
                </Text>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={12}
                  color={colors.textSecondary}
                />
              </View>
            ) : null}
          </View>
          <View style={styles.right}>
            {(item.status ?? "in_stock") === "on_the_way" ? (
              <Text variant="labelSmall" style={styles.onTheWay}>
                {t.onTheWay}
              </Text>
            ) : (
              <>
                <Text variant="headlineSmall" style={styles.quantity}>
                  {item.quantity}
                </Text>
                <Text variant="labelSmall" style={styles.quantityLabel}>
                  {item.quantity === 1 ? t.bottle : t.bottles}
                </Text>
              </>
            )}
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
    borderRadius: 10,
    borderStartWidth: 3,
    borderStartColor: colors.primary,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  left: {
    flex: 1,
    gap: 6,
    marginEnd: 12,
  },
  name: {
    color: colors.text,
    textAlign: "right",
  },
  producer: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: -2,
  },
  locationRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  locationText: {
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: "right",
  },
  right: {
    alignItems: "center",
    minWidth: 48,
  },
  quantity: {
    color: colors.gold,
    fontWeight: "bold",
  },
  quantityLabel: {
    color: colors.textSecondary,
  },
  onTheWay: {
    color: colors.gold,
    fontStyle: "italic",
  },
});
