import React from "react";
import { StyleSheet } from "react-native";
import { Chip } from "react-native-paper";
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

export default function WineTypeChip({ type, compact }: WineTypeChipProps): React.ReactElement {
  const colors = TYPE_COLORS[type] ?? TYPE_COLORS[WineType.Other];
  return (
    <Chip
      style={[styles.chip, { backgroundColor: colors.bg }]}
      textStyle={[styles.text, { color: colors.text }, compact && styles.textCompact]}
      compact={compact}
    >
      {t.wineTypeLabels[type] ?? type}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
  },
  textCompact: {
    fontSize: 11,
  },
});
