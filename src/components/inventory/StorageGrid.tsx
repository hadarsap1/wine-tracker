import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@config/theme";
import { WineType } from "@/types/index";
import type { AppStorageUnit } from "@/types/index";

const CELL_SIZE = 36;
const CELL_GAP = 2;

const TYPE_COLORS: Record<WineType, string> = {
  [WineType.Red]: "#7b1c2e",
  [WineType.White]: "#c8a84b",
  [WineType["Rosé"]]: "#e8a0b0",
  [WineType.Sparkling]: "#8fb8d0",
  [WineType.Dessert]: "#9b6b2a",
  [WineType.Fortified]: "#6b4a8a",
  [WineType.Orange]: "#c4622d",
  [WineType.Other]: "#4a5568",
};

export interface SlotData {
  itemId: string;
  wineName: string;
  wineType: WineType;
}

interface StorageGridProps {
  unit: AppStorageUnit;
  slots: Record<string, SlotData>;
  mode: "view" | "pick";
  selectedSlot?: { row: number; col: number } | null;
  highlightItemId?: string;
  onSlotPress?: (row: number, col: number) => void;
}

export default function StorageGrid({
  unit,
  slots,
  mode,
  selectedSlot,
  highlightItemId,
  onSlotPress,
}: StorageGridProps): React.ReactElement {
  const colLabels = Array.from({ length: unit.cols }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Column headers */}
          <View style={styles.headerRow}>
            {/* spacer for row label */}
            <View style={styles.rowLabelSpacer} />
            {colLabels.map((label) => (
              <View key={label} style={styles.colHeader}>
                <Text style={styles.headerText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Grid rows */}
          {Array.from({ length: unit.rows }, (_, rowIdx) => {
            const rowNum = rowIdx + 1;
            return (
              <View key={rowIdx} style={styles.gridRow}>
                {Array.from({ length: unit.cols }, (_, colIdx) => {
                  const key = `${rowIdx}-${colIdx}`;
                  const slotData = slots[key];
                  const isOccupied = slotData !== undefined;
                  const isHighlighted =
                    highlightItemId !== undefined &&
                    slotData?.itemId === highlightItemId;
                  const isSelected =
                    selectedSlot?.row === rowIdx &&
                    selectedSlot?.col === colIdx;

                  const cellBg = isOccupied
                    ? TYPE_COLORS[slotData.wineType]
                    : colors.card;

                  const borderColor = isHighlighted
                    ? colors.gold
                    : isSelected
                    ? colors.primary
                    : colors.border;

                  const borderWidth = isHighlighted || isSelected ? 2 : 1;

                  const canPress = mode === "pick" && !isOccupied;

                  return (
                    <Pressable
                      key={colIdx}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: cellBg,
                          borderColor,
                          borderWidth,
                        },
                      ]}
                      onPress={
                        canPress ? () => onSlotPress?.(rowIdx, colIdx) : undefined
                      }
                      disabled={mode === "pick" && isOccupied}
                    >
                      {isOccupied ? (
                        <Text
                          style={styles.cellText}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {slotData.wineName.slice(0, 6)}
                        </Text>
                      ) : (
                        <Text style={styles.emptyDot}>·</Text>
                      )}
                    </Pressable>
                  );
                })}
                {/* Row label on the right (RTL) */}
                <View style={styles.rowLabel}>
                  <Text style={styles.headerText}>{rowNum}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

export { TYPE_COLORS };

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: CELL_GAP,
  },
  rowLabelSpacer: {
    width: CELL_SIZE,
    marginEnd: CELL_GAP,
  },
  colHeader: {
    width: CELL_SIZE,
    height: 18,
    marginEnd: CELL_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginEnd: CELL_GAP,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cellText: {
    color: "#ffffff",
    fontSize: 7,
    textAlign: "center",
    lineHeight: 9,
  },
  emptyDot: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 16,
  },
  rowLabel: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
