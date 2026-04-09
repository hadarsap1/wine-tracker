import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Dimensions } from "react-native";
import { Searchbar, ActivityIndicator, Text, Button, Portal, Dialog } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { useCellarStore } from "@stores/cellarStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType, getItemSlots } from "@/types/index";
import type { AppInventoryItem } from "@/types/index";
import StorageGrid, { TYPE_COLORS, type SlotData } from "@components/inventory/StorageGrid";
import type { StorageMapScreenProps } from "@navigation/types";

export default function StorageMapScreen({
  navigation,
}: StorageMapScreenProps): React.ReactElement {
  const profile = useAuthStore((s) => s.profile);
  const { items, loading: inventoryLoading, loadItems, openBottle } = useInventoryStore();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const { units, loading: cellarLoading, loadUnits } = useCellarStore();

  const [search, setSearch] = useState("");
  const [selectedUnitIdx, setSelectedUnitIdx] = useState(0);
  const [slotItem, setSlotItem] = useState<AppInventoryItem | null>(null);
  const [openBottleConfirm, setOpenBottleConfirm] = useState(false);
  const [openingBottle, setOpeningBottle] = useState(false);
  const [clickedSlot, setClickedSlot] = useState<{ unitId: string; row: number; col: number } | null>(null);

  const householdId = profile?.householdIds?.[0];

  useEffect(() => {
    if (!householdId) return;
    loadItems(householdId);
    loadUnits(householdId);
  }, [householdId, loadItems, loadUnits]);

  const selectedUnit = units[selectedUnitIdx];

  const { width: screenWidth } = Dimensions.get('window');
  const cellSize = useMemo(() => {
    if (!selectedUnit) return 64;
    const LABEL = 64;
    const PADDING = 32;
    const GAP = 3;
    const available = screenWidth - PADDING - LABEL - GAP * (selectedUnit.cols - 1);
    const size = Math.floor(available / selectedUnit.cols);
    return Math.min(Math.max(size, 54), 90);
  }, [screenWidth, selectedUnit?.cols]);

  const buildSlots = (): Record<string, SlotData> => {
    if (!selectedUnit) return {};
    const result: Record<string, SlotData> = {};
    for (const item of items) {
      for (const slot of getItemSlots(item)) {
        if (slot.unitId === selectedUnit.id) {
          const key = `${slot.row}-${slot.col}`;
          result[key] = { itemId: item.id, wineName: item.wineName, wineType: item.wineType as WineType };
        }
      }
    }
    return result;
  };

  // Find highlighted item based on search
  const trimmedSearch = search.trim().toLowerCase();
  let highlightItemId: string | undefined;
  if (trimmedSearch && selectedUnit) {
    const matches = items.filter(
      (item) =>
        item.wineName.toLowerCase().includes(trimmedSearch) &&
        getItemSlots(item).some((s) => s.unitId === selectedUnit.id)
    );
    if (matches.length === 1) {
      highlightItemId = matches[0].id;
    }
  }

  const slots = buildSlots();

  // Legend: wine types present in this unit
  const presentTypes = new Set<WineType>();
  for (const slot of Object.values(slots)) {
    presentTypes.add(slot.wineType);
  }

  const handleSlotPress = (row: number, col: number) => {
    const key = `${row}-${col}`;
    const slot = slots[key];
    if (!slot) return;
    const item = items.find((i) => i.id === slot.itemId);
    if (item) setSlotItem(item);
    setClickedSlot(selectedUnit ? { unitId: selectedUnit.id, row, col } : null);
  };

  const handleOpenBottle = async () => {
    if (!slotItem || !householdId) return;
    setOpeningBottle(true);
    try {
      await openBottle(householdId, slotItem.id, slotItem.wineId, slotItem.wineName, slotItem.wineType, clickedSlot ?? undefined);
      setOpenBottleConfirm(false);
      setSlotItem(null);
      setClickedSlot(null);
      showSnackbar(t.bottleOpened, "success");
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setOpeningBottle(false);
    }
  };

  const isLoading = inventoryLoading || cellarLoading;

  if (isLoading && units.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (units.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t.noStorageUnits}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t.searchWines}
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        iconColor={colors.textSecondary}
        placeholderTextColor={colors.textSecondary}
      />

      {/* Unit tabs */}
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
            onPress={() => setSelectedUnitIdx(idx)}
            style={styles.tabButton}
            buttonColor={idx === selectedUnitIdx ? colors.primary : undefined}
            textColor={idx === selectedUnitIdx ? colors.onPrimary : colors.text}
            compact
          >
            {unit.name}
          </Button>
        ))}
      </ScrollView>

      {/* Grid */}
      {selectedUnit && (
        <ScrollView style={styles.gridScroll} contentContainerStyle={styles.gridContent}>
          <Text style={styles.unitMeta}>
            {selectedUnit.type === "fridge" ? t.storageUnitFridge : t.storageUnitRack}{" "}
            — {selectedUnit.rows} × {selectedUnit.cols}
          </Text>
          <StorageGrid
            unit={selectedUnit}
            slots={slots}
            mode="view"
            highlightItemId={highlightItemId}
            onSlotPress={handleSlotPress}
            cellSize={cellSize}
          />

          {/* Legend */}
          {presentTypes.size > 0 && (
            <View style={styles.legend}>
              {Array.from(presentTypes).map((type) => (
                <View key={type} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendSwatch,
                      { backgroundColor: TYPE_COLORS[type] },
                    ]}
                  />
                  <Text style={styles.legendLabel}>
                    {t.wineTypeLabels[type] ?? type}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Slot detail dialog */}
      <Portal>
        <Dialog
          visible={!!slotItem && !openBottleConfirm}
          onDismiss={() => setSlotItem(null)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{slotItem?.wineName ?? ""}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text style={styles.dialogMeta}>
              {slotItem ? (t.wineTypeLabels[slotItem.wineType as WineType] ?? slotItem.wineType) : ""}
              {slotItem?.producerName ? `  ·  ${slotItem.producerName}` : ""}
            </Text>
            <Text style={styles.dialogQty}>
              {slotItem?.quantity ?? 0} {t.quantity.toLowerCase()}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              mode="outlined"
              onPress={() => {
                if (slotItem) navigation.navigate("WineDetail", { itemId: slotItem.id, wineId: slotItem.wineId });
                setSlotItem(null);
              }}
              textColor={colors.primary}
              style={styles.dialogBtn}
            >
              {t.details}
            </Button>
            <Button
              mode="contained"
              buttonColor={colors.primary}
              onPress={() => setOpenBottleConfirm(true)}
              style={styles.dialogBtn}
            >
              {t.openBottle}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Open bottle confirm */}
        <Dialog
          visible={openBottleConfirm}
          onDismiss={() => setOpenBottleConfirm(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.openBottleConfirm}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogMeta}>{t.openBottleMsg}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpenBottleConfirm(false)} textColor={colors.textSecondary}>
              {t.cancel}
            </Button>
            <Button onPress={handleOpenBottle} loading={openingBottle} textColor={colors.primary}>
              {t.openBottle}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.card,
    elevation: 0,
  },
  searchInput: {
    color: colors.text,
    textAlign: "right",
  },
  tabsScroll: {
    maxHeight: 52,
    marginBottom: 8,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  tabButton: {
    marginEnd: 0,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  unitMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    textAlign: "right",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
    justifyContent: "flex-end",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  dialog: {
    backgroundColor: colors.card,
  },
  dialogTitle: {
    color: colors.text,
    textAlign: "right",
  },
  dialogContent: {
    gap: 4,
  },
  dialogMeta: {
    color: colors.textSecondary,
    textAlign: "right",
    fontSize: 13,
  },
  dialogQty: {
    color: colors.gold,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  dialogActions: {
    gap: 8,
  },
  dialogBtn: {
    flex: 1,
  },
});
