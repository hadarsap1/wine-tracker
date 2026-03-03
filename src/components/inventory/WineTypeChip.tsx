import React from "react";
import { StyleSheet } from "react-native";
import { Chip } from "react-native-paper";
import { WineType } from "@/types/index";

const TYPE_COLORS: Record<WineType, string> = {
  [WineType.Red]: "#8B0000",
  [WineType.White]: "#DAA520",
  [WineType.Rosé]: "#FF69B4",
  [WineType.Sparkling]: "#87CEEB",
  [WineType.Dessert]: "#D2691E",
  [WineType.Fortified]: "#800080",
  [WineType.Orange]: "#FF8C00",
  [WineType.Other]: "#808080",
};

interface WineTypeChipProps {
  type: WineType;
  compact?: boolean;
}

export default function WineTypeChip({ type, compact }: WineTypeChipProps) {
  return (
    <Chip
      style={[styles.chip, { backgroundColor: TYPE_COLORS[type] }]}
      textStyle={[styles.text, compact && styles.textCompact]}
      compact={compact}
    >
      {type}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
  },
  text: {
    color: "#ffffff",
    fontSize: 12,
  },
  textCompact: {
    fontSize: 11,
  },
});
