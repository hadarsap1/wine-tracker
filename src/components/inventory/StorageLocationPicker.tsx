import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Text, Button, IconButton } from "react-native-paper";
import { useCellarStore } from "@stores/cellarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import StorageGrid, { type SlotData } from "./StorageGrid";
import type { AppInventoryItem, WineType } from "@/types/index";
import { getItemSlots } from "@/types/index";

interface StorageLocationPickerProps {
  visible: boolean;
  householdId: string;
  currentSlot?: { unitId: string; row: number; col: number } | null;
  inventoryItems: AppInventoryItem[];
  excludeItemId?: string;
  onSelect: (slot: {
    unitId: string;
    row: number;
    col: number;
    unitName: string;
  }) => void;
  onClear: () => void;
  onDismiss: () => void;
}

export default function StorageLocationPicker({
  visible,
  householdId,
  currentSlot,
  inventoryItems,
  excludeItemId,
  onSelect,
  onClear,
  onDismiss,
}: StorageLocationPickerProps): React.ReactElement {
  const units = useCellarStore((s) => s.units);
  const loadUnits = useCellarStore((s) => s.loadUnits);

  const [selectedUnitIdx, setSelectedUnitIdx] = useState(0);
  const [pendingSlot, setPendingSlot] = useState<{
    row: number;
    col: number;
  } | null>(null);

  React.useEffect(() => {
    if (visible && units.length === 0 && householdId) {
      loadUnits(householdId);
    }
  }, [visible, householdId, units.length, loadUnits]);

  React.useEffect(() => {
    if (visible) {
      setPendingSlot(null);
      // If there's a current slot, open the unit tab it's in
      if (currentSlot) {
        const idx = units.findIndex((u) => u.id === currentSlot.unitId);
        if (idx >= 0) setSelectedUnitIdx(idx);
      } else {
        setSelectedUnitIdx(0);
      }
    }
  }, [visible, currentSlot, units]);

  const selectedUnit = units[selectedUnitIdx];

  const buildSlots = (): Record<string, SlotData> => {
    if (!selectedUnit) return {};
    const result: Record<string, SlotData> = {};
    for (const item of inventoryItems) {
      if (item.id === excludeItemId) continue;
      for (const slot of getItemSlots(item)) {
        if (slot.unitId === selectedUnit.id) {
          const key = `${slot.row}-${slot.col}`;
          result[key] = {
            itemId: item.id,
            wineName: item.wineName,
            wineType: item.wineType as WineType,
          };
        }
      }
    }
    return result;
  };

  const handleConfirm = () => {
    if (!pendingSlot || !selectedUnit) return;
    onSelect({
      unitId: selectedUnit.id,
      row: pendingSlot.row,
      col: pendingSlot.col,
      unitName: selectedUnit.name,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <IconButton
            icon="close"
            iconColor={colors.text}
            onPress={onDismiss}
          />
          <Text variant="titleMedium" style={styles.title}>
            {t.chooseSlot}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {units.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t.noStorageUnits}</Text>
          </View>
        ) : (
          <>
            {/* Unit tab selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContent}
            >
              {units.map((unit, idx) => (
                <Button
                  key={unit.id}
                  mode={idx === selectedUnitIdx ? "contained" : "outlined"}
                  onPress={() => {
                    setSelectedUnitIdx(idx);
                    setPendingSlot(null);
                  }}
                  style={styles.tabButton}
                  buttonColor={
                    idx === selectedUnitIdx ? colors.primary : undefined
                  }
                  textColor={
                    idx === selectedUnitIdx ? colors.onPrimary : colors.text
                  }
                  compact
                >
                  {unit.name}
                </Button>
              ))}
            </ScrollView>

            {selectedUnit && (
              <View style={styles.gridContainer}>
                <Text style={styles.unitTypeLabel}>
                  {selectedUnit.type === "fridge"
                    ? t.storageUnitFridge
                    : t.storageUnitRack}{" "}
                  — {selectedUnit.rows} × {selectedUnit.cols}
                </Text>
                <StorageGrid
                  unit={selectedUnit}
                  slots={buildSlots()}
                  mode="pick"
                  selectedSlot={pendingSlot}
                  onSlotPress={(row, col) => setPendingSlot({ row, col })}
                />
              </View>
            )}

            <View style={styles.actions}>
              {currentSlot && (
                <Button
                  mode="outlined"
                  onPress={onClear}
                  textColor={colors.error}
                  style={styles.clearButton}
                >
                  {t.clearSlot}
                </Button>
              )}
              <Button
                mode="contained"
                onPress={handleConfirm}
                disabled={!pendingSlot}
                buttonColor={colors.primary}
                style={styles.confirmButton}
              >
                {t.storageUnitSave}
              </Button>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    color: colors.text,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  tabsScroll: {
    maxHeight: 52,
    marginVertical: 8,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  tabButton: {
    marginEnd: 0,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  unitTypeLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearButton: {
    borderColor: colors.error,
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
