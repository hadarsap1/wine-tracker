import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, StyleSheet, ScrollView, Dimensions, Image } from "react-native";
import { FAB, Searchbar, ActivityIndicator, SegmentedButtons, Chip, IconButton, Button, Text, Portal, Dialog } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { useCellarStore } from "@stores/cellarStore";
import * as inventoryService from "@services/inventory";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import EmptyState from "@components/common/EmptyState";
import InventoryCard from "@components/inventory/InventoryCard";
import StorageGrid, { TYPE_COLORS, type SlotData } from "@components/inventory/StorageGrid";
import type { InventoryListScreenProps } from "@navigation/types";
import type { AppInventoryItem, InventoryStatus } from "@/types/index";
import { WineType, getItemSlots } from "@/types/index";

type ViewMode = "map" | "list";

export default function InventoryListScreen({
  navigation,
}: InventoryListScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { items, loading, loadItems } = useInventoryStore();
  const { units, loading: cellarLoading, loadUnits } = useCellarStore();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<InventoryStatus>("in_stock");
  const [wineTypeFilter, setWineTypeFilter] = useState<WineType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [selectedUnitIdx, setSelectedUnitIdx] = useState(0);
  const [wineImages, setWineImages] = useState<Record<string, string>>({});
  const loadedWineIds = useRef(new Set<string>());
  const [mapSlotItem, setMapSlotItem] = useState<AppInventoryItem | null>(null);
  const [mapSlotVivinoScore, setMapSlotVivinoScore] = useState<number | null | undefined>(undefined);
  const mapSlotFetchId = useRef(0);

  const householdId = profile?.householdIds?.[0];

  const showMap = viewMode === "map" && tab === "in_stock";

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon={showMap ? "format-list-bulleted" : "map-outline"}
          iconColor={colors.text}
          size={22}
          accessibilityLabel={showMap ? "החלף לתצוגת רשימה" : "החלף לתצוגת מפה"}
          onPress={() => setViewMode((v) => (v === "map" ? "list" : "map"))}
        />
      ),
    });
  }, [navigation, showMap]);

  useEffect(() => {
    if (householdId) {
      loadItems(householdId);
      loadUnits(householdId);
      // Reset image cache on household change
      loadedWineIds.current.clear();
      setWineImages({});
    }
  }, [householdId, loadItems, loadUnits]);

  // Clamp selectedUnitIdx when units change (e.g. unit deleted)
  useEffect(() => {
    if (units.length > 0 && selectedUnitIdx >= units.length) {
      setSelectedUnitIdx(Math.max(0, units.length - 1));
    }
  }, [units, selectedUnitIdx]);

  const tabItems = items.filter((item) => (item.status ?? "in_stock") === tab);
  const typeFilteredItems = wineTypeFilter
    ? tabItems.filter((item) => item.wineType === wineTypeFilter)
    : tabItems;
  const filteredItems = search
    ? typeFilteredItems.filter((item) =>
        item.wineName.toLowerCase().includes(search.toLowerCase())
      )
    : typeFilteredItems;

  const inStockCount = items.filter((i) => (i.status ?? "in_stock") === "in_stock").length;
  const onTheWayCount = items.filter((i) => (i.status ?? "in_stock") === "on_the_way").length;

  useEffect(() => {
    setWineTypeFilter(null);
  }, [tab]);

  const handleRefresh = useCallback(() => {
    if (householdId) loadItems(householdId);
  }, [householdId, loadItems]);

  // Load wine imageUrls for all slotted in-stock items (map view only)
  useEffect(() => {
    if (!householdId || viewMode !== "map") return;
    const slottedItems = items.filter(
      (i) => (i.status ?? "in_stock") === "in_stock" && getItemSlots(i).length > 0
    );
    const toLoad = slottedItems
      .map((i) => i.wineId)
      .filter((id) => !loadedWineIds.current.has(id));
    if (toLoad.length === 0) return;
    toLoad.forEach((id) => loadedWineIds.current.add(id));
    Promise.all(
      toLoad.map((wineId) =>
        inventoryService
          .getWine(householdId, wineId)
          .then((wine) => (wine?.imageUrl ? { wineId, url: wine.imageUrl } : null))
          .catch(() => null)
      )
    ).then((results) => {
      const next: Record<string, string> = {};
      for (const r of results) {
        if (r) next[r.wineId] = r.url;
      }
      if (Object.keys(next).length > 0) {
        setWineImages((prev) => ({ ...prev, ...next }));
      }
    });
  }, [householdId, viewMode, items]);

  const renderItem = useCallback(
    ({ item }: { item: AppInventoryItem }) => (
      <InventoryCard
        item={item}
        onPress={() =>
          navigation.navigate("WineDetail", {
            itemId: item.id,
            wineId: item.wineId,
          })
        }
      />
    ),
    [navigation]
  );

  // ── Map view helpers ──────────────────────────────────────────────────────────
  const { width: screenWidth } = Dimensions.get("window");
  const selectedUnit = units[selectedUnitIdx];

  const cellSize = useMemo(() => {
    if (!selectedUnit) return 64;
    const LABEL = 24;
    const PADDING = 32;
    const GAP = 3;
    const available = screenWidth - PADDING - LABEL - GAP * (selectedUnit.cols - 1);
    const size = Math.floor(available / selectedUnit.cols);
    return Math.min(Math.max(size, 48), 90);
  }, [screenWidth, selectedUnit]);

  const inStockItems = items.filter((i) => (i.status ?? "in_stock") === "in_stock");

  const mapSlots = useMemo((): Record<string, SlotData> => {
    if (!selectedUnit) return {};
    const result: Record<string, SlotData> = {};
    for (const item of inStockItems) {
      for (const slot of getItemSlots(item)) {
        if (slot.unitId === selectedUnit.id) {
          const key = `${slot.row}-${slot.col}`;
          const matchesFilter = !wineTypeFilter || item.wineType === wineTypeFilter;
          const matchesSearch = !search || item.wineName.toLowerCase().includes(search.toLowerCase());
          result[key] = {
            itemId: item.id,
            wineName: item.wineName,
            wineType: item.wineType as WineType,
            dimmed: !matchesFilter || !matchesSearch,
            imageUrl: wineImages[item.wineId],
          };
        }
      }
    }
    return result;
  }, [selectedUnit, inStockItems, wineTypeFilter, search, wineImages]);

  const isLoading = loading && items.length === 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const filterBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContent}
    >
      <Chip
        selected={wineTypeFilter === null}
        onPress={() => setWineTypeFilter(null)}
        style={[styles.filterChip, wineTypeFilter === null && styles.filterChipSelected]}
        selectedColor={colors.primary}
        showSelectedCheck={false}
        compact
      >
        {t.all}
      </Chip>
      {Object.values(WineType).map((type) => (
        <Chip
          key={type}
          selected={wineTypeFilter === type}
          onPress={() => setWineTypeFilter(wineTypeFilter === type ? null : type)}
          style={[styles.filterChip, wineTypeFilter === type && styles.filterChipSelected]}
          selectedColor={colors.primary}
          showSelectedCheck={false}
          compact
        >
          {t.wineTypeLabels[type]}
        </Chip>
      ))}
    </ScrollView>
  );

  const tabs = (
    <SegmentedButtons
      value={tab}
      onValueChange={(v) => setTab(v as InventoryStatus)}
      buttons={[
        { value: "on_the_way", label: `${t.onTheWay}${onTheWayCount > 0 ? ` (${onTheWayCount})` : ""}` },
        { value: "in_stock", label: `${t.inStock}${inStockCount > 0 ? ` (${inStockCount})` : ""}` },
      ]}
      style={styles.tabs}
    />
  );

  return (
    <View style={styles.container}>
      {tabs}
      <Searchbar
        placeholder={t.inventorySearch}
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        iconColor={colors.textSecondary}
        placeholderTextColor={colors.textSecondary}
        editable={!loading || items.length > 0}
      />
      {filterBar}

      {showMap ? (
        <View style={styles.mapContainer}>
          {cellarLoading && units.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : units.length === 0 ? (
            <EmptyState
              icon="fridge-outline"
              title={t.noStorageUnits}
              subtitle=""
            />
          ) : (
            <>
              {/* Unit tabs */}
              {units.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.unitTabsScroll}
                  contentContainerStyle={styles.unitTabsContent}
                >
                  {units.map((unit, idx) => (
                    <Button
                      key={unit.id}
                      mode={idx === selectedUnitIdx ? "contained" : "outlined"}
                      onPress={() => setSelectedUnitIdx(idx)}
                      buttonColor={idx === selectedUnitIdx ? colors.primary : undefined}
                      textColor={idx === selectedUnitIdx ? colors.onPrimary : colors.text}
                      compact
                      style={styles.unitTab}
                    >
                      {unit.name}
                    </Button>
                  ))}
                </ScrollView>
              )}
              <ScrollView
                contentContainerStyle={styles.gridContent}
              >
                {selectedUnit && (
                  <>
                    <Text style={styles.unitMeta}>
                      {selectedUnit.rows} × {selectedUnit.cols}
                    </Text>
                    <StorageGrid
                      unit={selectedUnit}
                      slots={mapSlots}
                      mode="view"
                      onSlotPress={(row, col) => {
                        const key = `${row}-${col}`;
                        const slot = mapSlots[key];
                        if (slot) {
                          const item = items.find((i) => i.id === slot.itemId);
                          if (item) {
                            setMapSlotItem(item);
                            setMapSlotVivinoScore(undefined);
                            if (householdId) {
                              const fetchId = ++mapSlotFetchId.current;
                              inventoryService.getWine(householdId, item.wineId).then((wine) => {
                                if (mapSlotFetchId.current !== fetchId) return;
                                setMapSlotVivinoScore(wine?.vivinoData?.score ?? null);
                              }).catch(() => {
                                if (mapSlotFetchId.current === fetchId) setMapSlotVivinoScore(null);
                              });
                            }
                          }
                        }
                      }}
                      cellSize={cellSize}
                    />
                    {/* Color legend */}
                    {Object.keys(mapSlots).length > 0 && (() => {
                      const presentTypes = [...new Set(Object.values(mapSlots).map((s) => s.wineType))];
                      return (
                        <View style={styles.legend}>
                          {presentTypes.map((type) => (
                            <View key={type} style={styles.legendItem}>
                              <View style={[styles.legendSwatch, { backgroundColor: TYPE_COLORS[type] }]} />
                              <Text style={styles.legendLabel}>{t.wineTypeLabels[type] ?? type}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    })()}
                  </>
                )}
              </ScrollView>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            filteredItems.length === 0 ? styles.emptyList : styles.list
          }
          refreshing={loading}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            search || wineTypeFilter ? (
              <EmptyState
                icon="magnify-close"
                title={t.noSearchResults}
                subtitle={t.noSearchResultsSubtitle}
              />
            ) : (
              <EmptyState
                icon={tab === "in_stock" ? "bottle-wine-outline" : "truck-delivery-outline"}
                title={tab === "in_stock" ? t.inventoryEmpty : t.onTheWayEmpty}
                subtitle={tab === "in_stock" ? t.inventoryEmptySubtitle : t.onTheWayEmptySubtitle}
              />
            )
          }
        />
      )}

      {/* Map slot detail popup */}
      <Portal>
        <Dialog
          visible={!!mapSlotItem}
          onDismiss={() => { setMapSlotItem(null); setMapSlotVivinoScore(undefined); }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{mapSlotItem?.wineName ?? ""}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {mapSlotItem && wineImages[mapSlotItem.wineId] && (
              <Image
                source={{ uri: wineImages[mapSlotItem.wineId] }}
                style={styles.dialogThumb}
                resizeMode="cover"
              />
            )}
            <Text style={styles.dialogMeta}>
              {mapSlotItem ? (t.wineTypeLabels[mapSlotItem.wineType as WineType] ?? mapSlotItem.wineType) : ""}
              {mapSlotItem?.producerName ? `  ·  ${mapSlotItem.producerName}` : ""}
            </Text>
            {mapSlotVivinoScore !== undefined ? (
              mapSlotVivinoScore !== null ? (
                <Text style={styles.dialogScore}>⭐ {mapSlotVivinoScore.toFixed(1)}</Text>
              ) : null
            ) : (
              <Text style={[styles.dialogScore, { opacity: 0.4 }]}>...</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => { setMapSlotItem(null); setMapSlotVivinoScore(undefined); }}
              textColor={colors.textSecondary}
            >
              {t.close}
            </Button>
            <Button
              mode="contained"
              buttonColor={colors.primary}
              onPress={() => {
                if (mapSlotItem) {
                  navigation.navigate("WineDetail", { itemId: mapSlotItem.id, wineId: mapSlotItem.wineId });
                  setMapSlotItem(null);
                }
              }}
            >
              {t.details}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <View style={styles.fabGroup}>
        {tab === "on_the_way" && (
          <FAB
            icon="file-import-outline"
            style={styles.fabSecondary}
            onPress={() => navigation.navigate("ImportOrder")}
            color={colors.primary}
            customSize={46}
          />
        )}
        {tab === "in_stock" && (
          <FAB
            icon="file-excel-outline"
            style={styles.fabSecondary}
            onPress={() => navigation.navigate("ImportExcel")}
            color={colors.primary}
            customSize={46}
          />
        )}
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate("AddWine")}
          color={colors.onPrimary}
          customSize={56}
        />
      </View>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  tabs: {
    margin: 16,
    marginBottom: 0,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.card,
    elevation: 0,
  },
  filterScroll: {
    marginBottom: 4,
    maxHeight: 40,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    backgroundColor: colors.card,
    height: 32,
  },
  filterChipSelected: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    height: 32,
  },
  searchInput: {
    color: colors.text,
    textAlign: "right",
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 120,
  },
  emptyList: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  mapContainer: {
    flex: 1,
  },
  unitTabsScroll: {
    maxHeight: 48,
    marginBottom: 4,
  },
  unitTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  unitTab: {
    marginEnd: 0,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 120,
    alignItems: "center",
  },
  unitMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    textAlign: "right",
  },
  fabGroup: {
    position: "absolute",
    end: 16,
    bottom: 16,
    alignItems: "flex-end",
    gap: 12,
  },
  fab: {
    backgroundColor: colors.primary,
  },
  fabSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dialog: {
    backgroundColor: colors.card,
  },
  dialogTitle: {
    color: colors.text,
    textAlign: "right",
  },
  dialogContent: {
    gap: 6,
    alignItems: "flex-end",
  },
  dialogThumb: {
    width: 80,
    height: 110,
    borderRadius: 6,
    marginBottom: 4,
    alignSelf: "center",
  },
  dialogMeta: {
    color: colors.textSecondary,
    textAlign: "right",
    fontSize: 13,
  },
  dialogScore: {
    color: colors.gold,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "600",
  },
  dialogActions: {
    gap: 8,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
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
