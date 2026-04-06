import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Searchbar, ActivityIndicator, Text, Button } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { useCellarStore } from "@stores/cellarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType } from "@/types/index";
import StorageGrid, { TYPE_COLORS, type SlotData } from "@components/inventory/StorageGrid";
import type { StorageMapScreenProps } from "@navigation/types";

export default function StorageMapScreen({
  navigation,
}: StorageMapScreenProps): React.ReactElement {
  const profile = useAuthStore((s) => s.profile);
  const { items, loading: inventoryLoading, loadItems } = useInventoryStore();
  const { units, loading: cellarLoading, loadUnits } = useCellarStore();

  const [search, setSearch] = useState("");
  const [selectedUnitIdx, setSelectedUnitIdx] = useState(0);

  const householdId = profile?.householdIds?.[0];

  useEffect(() => {
    if (!householdId) return;
    loadItems(householdId);
    loadUnits(householdId);
  }, [householdId, loadItems, loadUnits]);

  const selectedUnit = units[selectedUnitIdx];

  const buildSlots = (): Record<string, SlotData> => {
    if (!selectedUnit) return {};
    const result: Record<string, SlotData> = {};
    for (const item of items) {
      if (
        item.storageUnitId === selectedUnit.id &&
        item.storageRow !== undefined &&
        item.storageCol !== undefined
      ) {
        const key = `${item.storageRow}-${item.storageCol}`;
        result[key] = {
          itemId: item.id,
          wineName: item.wineName,
          wineType: item.wineType as WineType,
        };
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
        item.storageUnitId === selectedUnit.id
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
    if (item) {
      navigation.navigate("WineDetail", { itemId: item.id, wineId: item.wineId });
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
});
