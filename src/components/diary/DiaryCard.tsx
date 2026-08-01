import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, cardShadow } from "@config/theme";
import { t } from "@i18n/index";
import WineTypeChip from "@components/inventory/WineTypeChip";
import RatingInput from "./RatingInput";
import type { AppDiaryEntry } from "@/types/index";

interface DiaryCardProps {
  entry: AppDiaryEntry;
  onPress: () => void;
}

export default function DiaryCard({ entry, onPress }: DiaryCardProps): React.ReactElement {
  const dateStr =
    entry.tastingDate instanceof Date
      ? entry.tastingDate.toLocaleDateString()
      : "";

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={entry.wineName}
    >
      {entry.imageUrls?.[0] ? (
        <Image source={{ uri: entry.imageUrls[0] }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder}>
          <MaterialCommunityIcons
            name="bottle-wine"
            size={20}
            color={colors.textSecondary}
          />
        </View>
      )}
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
          {entry.wineName}
        </Text>
        <View style={styles.row}>
          <WineTypeChip type={entry.wineType} compact />
          <Text variant="bodySmall" style={styles.date}>
            {dateStr}
          </Text>
        </View>
        {entry.rating === null ? (
          <View style={styles.tapToRateRow}>
            <MaterialCommunityIcons
              name="star-outline"
              size={14}
              color={colors.gold}
            />
            <Text variant="labelSmall" style={styles.tapToRate}>
              {t.tapToRate}
            </Text>
          </View>
        ) : (
          <RatingInput value={entry.rating} size={18} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.cardElevated,
    borderRadius: radius.lg,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    gap: 12,
    alignItems: "center",
    // Gold outline — diary entries are the "keepsake" surface in the mockups.
    borderWidth: 1,
    borderColor: colors.goldHairline,
    ...cardShadow,
  },
  cardPressed: {
    opacity: 0.75,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.goldSoft,
  },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.crimsonSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.goldSoft,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.gold,
    fontWeight: "700",
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  date: {
    color: colors.textSecondary,
  },
  tapToRateRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  tapToRate: {
    color: colors.gold,
    fontStyle: "italic",
  },
});
