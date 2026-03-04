import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@config/theme";
import WineTypeChip from "@components/inventory/WineTypeChip";
import RatingInput from "./RatingInput";
import type { AppDiaryEntry } from "@/types/index";

interface DiaryCardProps {
  entry: AppDiaryEntry;
  onPress: () => void;
}

export default function DiaryCard({ entry, onPress }: DiaryCardProps) {
  const dateStr = entry.tastingDate instanceof Date
    ? entry.tastingDate.toLocaleDateString()
    : "";

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {entry.imageUrls?.[0] && (
        <Image source={{ uri: entry.imageUrls[0] }} style={styles.thumb} />
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
        <RatingInput value={entry.rating} size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 12,
    alignItems: "center",
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.border,
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
});
