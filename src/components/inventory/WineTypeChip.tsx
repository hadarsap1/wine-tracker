import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { radius } from "@config/theme";
import { WineType } from "@/types/index";
import { t } from "@i18n/index";

interface WineTypeColors {
  bg: string;
  text: string;
}

const TYPE_COLORS: Record<WineType, WineTypeColors> = {
  [WineType.Red]:       { bg: "#5c1a1a", text: "#ff8a80" },
  [WineType.White]:     { bg: "#3a3510", text: "#ffd740" },
  [WineType.Rosé]:      { bg: "#4a1a2e", text: "#f48fb1" },
  [WineType.Sparkling]: { bg: "#1a2e4a", text: "#82b1ff" },
  [WineType.Dessert]:   { bg: "#2e2010", text: "#ffcc80" },
  [WineType.Fortified]: { bg: "#2a1a0a", text: "#bcaaa4" },
  [WineType.Orange]:    { bg: "#3a1f00", text: "#ffab40" },
  [WineType.Other]:     { bg: "#1e1e3a", text: "#a0a0c0" },
};

interface WineTypeChipProps {
  type: WineType;
  compact?: boolean;
}

/**
 * Compact type pill. Replaces Paper's <Chip>, whose built-in padding and touch
 * target made list rows feel bulky and inconsistent with the design mockups.
 */
export default function WineTypeChip({ type, compact }: WineTypeChipProps): React.ReactElement {
  const c = TYPE_COLORS[type] ?? TYPE_COLORS[WineType.Other];
  return (
    <View style={[styles.pill, compact && styles.pillCompact, { backgroundColor: c.bg }]}>
      <Text
        style={[styles.text, compact && styles.textCompact, { color: c.text }]}
        numberOfLines={1}
      >
        {t.wineTypeLabels[type] ?? type}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
  textCompact: {
    fontSize: 11,
  },
});
