import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, cardShadow } from "@config/theme";
import { t } from "@i18n/index";
import type { AppInventoryItem } from "@/types/index";
import WineTypeChip from "./WineTypeChip";

interface InventoryCardProps {
  item: AppInventoryItem;
  onPress: () => void;
}

export default function InventoryCard({ item, onPress }: InventoryCardProps): React.ReactElement {
  const onTheWay = (item.status ?? "in_stock") === "on_the_way";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.wineName}, ${item.quantity} ${item.quantity === 1 ? t.bottle : t.bottles}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.bottleWell}>
        <MaterialCommunityIcons name="bottle-wine" size={26} color={colors.gold} />
      </View>

      <View style={styles.left}>
        <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
          {item.wineName}
        </Text>
        {item.producerName ? (
          <Text variant="bodySmall" style={styles.producer} numberOfLines={1}>
            {item.producerName}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <WineTypeChip type={item.wineType} compact />
          {item.location ? (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={11}
                color={colors.textSecondary}
              />
              <Text variant="bodySmall" style={styles.locationText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {onTheWay ? (
          <View style={styles.onTheWayPill}>
            <MaterialCommunityIcons name="truck-fast-outline" size={12} color={colors.gold} />
            <Text variant="labelSmall" style={styles.onTheWayText}>
              {t.onTheWay}
            </Text>
          </View>
        ) : (
          <View style={styles.qtyPill}>
            <Text variant="labelLarge" style={styles.qtyText}>
              ×{item.quantity}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.cardElevated,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    // Gold rim-light — the signature outline from the design mockups.
    borderWidth: 1,
    borderColor: colors.goldHairline,
    // Crimson accent on the leading edge. borderStart* is direction-aware, so
    // it lands on the right in RTL (absolute positioning did not).
    borderStartWidth: 4,
    borderStartColor: colors.primary,
    overflow: "hidden",
    ...cardShadow,
  },
  cardPressed: {
    opacity: 0.75,
  },
  bottleWell: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.crimsonSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldSoft,
  },
  left: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: colors.text,
    textAlign: "right",
    fontWeight: "700",
  },
  producer: {
    color: colors.textSecondary,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 1,
  },
  locationText: {
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: "right",
    fontSize: 11,
  },
  right: {
    alignItems: "center",
  },
  qtyPill: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 44,
    alignItems: "center",
  },
  qtyText: {
    color: "#2a1e05",
    fontWeight: "800",
  },
  onTheWayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.goldSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.goldHairline,
  },
  onTheWayText: {
    color: colors.gold,
  },
});
