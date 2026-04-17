import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";
import { WineType } from "@/types/index";
import type { AppStorageUnit } from "@/types/index";

const CELL_W = 52;
const CELL_H = 72; // portrait — wine bottle ratio
const CELL_GAP = 4;
const SHELF_HEIGHT = 4;

export const TYPE_COLORS: Record<WineType, string> = {
  [WineType.Red]: "#6b1020",
  [WineType.White]: "#b8922a",
  [WineType["Rosé"]]: "#c0607a",
  [WineType.Sparkling]: "#4a8ab0",
  [WineType.Dessert]: "#8a5a1a",
  [WineType.Fortified]: "#5a3878",
  [WineType.Orange]: "#b04818",
  [WineType.Other]: "#3a4558",
};

const TYPE_BOTTLE_COLORS: Record<WineType, string> = {
  [WineType.Red]: "#e8a0b0",
  [WineType.White]: "#f5e090",
  [WineType["Rosé"]]: "#f9c8d4",
  [WineType.Sparkling]: "#b8e0f0",
  [WineType.Dessert]: "#f0c870",
  [WineType.Fortified]: "#c0a0e0",
  [WineType.Orange]: "#f0b888",
  [WineType.Other]: "#9ab0c8",
};

export interface SlotData {
  itemId: string;
  wineName: string;
  wineType: WineType;
  dimmed?: boolean;
  imageUrl?: string;
}

interface StorageGridProps {
  unit: AppStorageUnit;
  slots: Record<string, SlotData>;
  mode: "view" | "pick";
  selectedSlot?: { row: number; col: number } | null;
  highlightItemId?: string;
  onSlotPress?: (row: number, col: number) => void;
  cellSize?: number;
}

/** Renders a wine thumbnail with graceful fallback to the bottle icon on image error */
function CellImage({ uri, wineType, wineName, CW, CH }: {
  uri: string;
  wineType: WineType;
  wineName: string;
  CW: number;
  CH: number;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <>
        <MaterialCommunityIcons name="bottle-wine" size={CW * 0.52} color={TYPE_BOTTLE_COLORS[wineType]} />
        <Text style={[styles.cellLabel, { color: TYPE_BOTTLE_COLORS[wineType] }]} numberOfLines={1}>
          {wineName.slice(0, 8)}
        </Text>
      </>
    );
  }
  return (
    <>
      <Image
        source={{ uri }}
        style={{ width: CW - 2, height: CH - 2, borderRadius: 4 }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
      <View style={styles.thumbLabel}>
        <Text style={styles.thumbLabelText} numberOfLines={1}>{wineName.slice(0, 8)}</Text>
      </View>
    </>
  );
}

export default function StorageGrid({
  unit,
  slots,
  mode,
  selectedSlot,
  highlightItemId,
  onSlotPress,
  cellSize,
}: StorageGridProps): React.ReactElement {
  const CW = cellSize ?? CELL_W;
  const CH = cellSize ? Math.round(cellSize * 1.38) : CELL_H;
  const colLabels = Array.from({ length: unit.cols }, (_, i) => String(i + 1));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.fridgeFrame}>
        {/* Column headers */}
        <View style={styles.headerRow}>
          <View style={{ width: 24 }} />
          {colLabels.map((label) => (
            <View key={label} style={[styles.colHeader, { width: CW }]}>
              <Text style={styles.headerText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Grid rows */}
        {Array.from({ length: unit.rows }, (_, rowIdx) => (
          <View key={rowIdx}>
            <View style={styles.gridRow}>
              {Array.from({ length: unit.cols }, (_, colIdx) => {
                const key = `${rowIdx}-${colIdx}`;
                const slotData = slots[key];
                const isOccupied = slotData !== undefined;
                const isDimmed = slotData?.dimmed === true;
                const isHighlighted =
                  highlightItemId !== undefined &&
                  slotData?.itemId === highlightItemId;
                const isSelected =
                  selectedSlot?.row === rowIdx &&
                  selectedSlot?.col === colIdx;
                const canPress = mode === "pick" ? !isOccupied : isOccupied;

                const slotBg = isOccupied
                  ? TYPE_COLORS[slotData.wineType]
                  : "#12121e";

                const borderColor = isHighlighted || isSelected
                  ? colors.gold
                  : "#2a2a40";

                const borderWidth = isHighlighted || isSelected ? 2 : 1;

                return (
                  <TouchableOpacity
                    key={colIdx}
                    activeOpacity={canPress ? 0.65 : 1}
                    style={[
                      styles.cell,
                      {
                        width: CW,
                        height: CH,
                        backgroundColor: slotBg,
                        borderColor,
                        borderWidth,
                        opacity: isDimmed ? 0.2 : 1,
                      },
                      (isHighlighted || isSelected) && styles.cellGlow,
                    ]}
                    onPress={canPress ? () => onSlotPress?.(rowIdx, colIdx) : undefined}
                  >
                    {isOccupied ? (
                      slotData.imageUrl ? (
                        <CellImage
                          uri={slotData.imageUrl}
                          wineType={slotData.wineType}
                          wineName={slotData.wineName}
                          CW={CW}
                          CH={CH}
                        />
                      ) : (
                        <>
                          <MaterialCommunityIcons
                            name="bottle-wine"
                            size={CW * 0.52}
                            color={TYPE_BOTTLE_COLORS[slotData.wineType]}
                          />
                          <Text
                            style={[styles.cellLabel, { color: TYPE_BOTTLE_COLORS[slotData.wineType] }]}
                            numberOfLines={1}
                          >
                            {slotData.wineName.slice(0, 8)}
                          </Text>
                        </>
                      )
                    ) : (
                      <MaterialCommunityIcons
                        name="bottle-wine-outline"
                        size={CW * 0.44}
                        color="#2e2e4a"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
              {/* Row number label */}
              <View style={[styles.rowLabel, { height: CH }]}>
                <Text style={styles.headerText}>{rowIdx + 1}</Text>
              </View>
            </View>
            {/* Shelf divider */}
            <View style={styles.shelf} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// TYPE_COLORS is exported at declaration above

const styles = StyleSheet.create({
  fridgeFrame: {
    backgroundColor: "#0d0d1a",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2a2a40",
    padding: 8,
    margin: 4,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "center",
  },
  colHeader: {
    height: 18,
    marginEnd: CELL_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    color: "#4a4a6a",
    fontSize: 10,
    fontWeight: "600",
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: 0,
  },
  cell: {
    marginEnd: CELL_GAP,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cellGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  cellLabel: {
    fontSize: 7,
    textAlign: "center",
    marginTop: 2,
    fontWeight: "600",
  },
  thumbLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  thumbLabelText: {
    fontSize: 6,
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  rowLabel: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  shelf: {
    height: SHELF_HEIGHT,
    backgroundColor: "#1e1e30",
    borderRadius: 2,
    marginBottom: CELL_GAP,
  },
});
