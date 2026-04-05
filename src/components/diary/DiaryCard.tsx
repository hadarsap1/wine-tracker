import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";
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
    <Pressable style={styles.card} onPress={onPress}>
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
    flexDirection: "row-reverse",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 12,
    alignItems: "center",
    borderStartWidth: 3,
    borderStartColor: colors.primary,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  date: {
    color: colors.textSecondary,
  },
  tapToRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tapToRate: {
    color: colors.gold,
    fontStyle: "italic",
  },
});
