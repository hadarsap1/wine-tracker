import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { View, FlatList, StyleSheet, ScrollView } from "react-native";
import { FAB, Searchbar, ActivityIndicator, SegmentedButtons, Chip, IconButton } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import EmptyState from "@components/common/EmptyState";
import InventoryCard from "@components/inventory/InventoryCard";
import type { InventoryListScreenProps } from "@navigation/types";
import type { AppInventoryItem, InventoryStatus } from "@/types/index";
import { WineType } from "@/types/index";

export default function InventoryListScreen({
  navigation,
}: InventoryListScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { items, loading, loadItems } = useInventoryStore();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<InventoryStatus>("in_stock");
  const [wineTypeFilter, setWineTypeFilter] = useState<WineType | null>(null);

  const householdId = profile?.householdIds?.[0];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="map-outline"
          iconColor={colors.text}
          size={22}
          onPress={() => navigation.navigate("StorageMap")}
        />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (householdId) {
      loadItems(householdId);
    }
  }, [householdId, loadItems]);

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

  const handleRefresh = useCallback(() => {
    if (householdId) loadItems(householdId);
  }, [householdId, loadItems]);

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

  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as InventoryStatus)}
        buttons={[
          { value: "on_the_way", label: `${t.onTheWay}${onTheWayCount > 0 ? ` (${onTheWayCount})` : ""}` },
          { value: "in_stock", label: `${t.inStock}${inStockCount > 0 ? ` (${inStockCount})` : ""}` },
        ]}
        style={styles.tabs}
      />
      <Searchbar
        placeholder={t.searchWines}
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        iconColor={colors.textSecondary}
        placeholderTextColor={colors.textSecondary}
        editable={!loading || items.length > 0}
      />
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
          <EmptyState
            icon={tab === "in_stock" ? "bottle-wine-outline" : "truck-delivery-outline"}
            title={tab === "in_stock" ? t.inventoryEmpty : t.onTheWayEmpty}
            subtitle={tab === "in_stock" ? t.inventoryEmptySubtitle : t.onTheWayEmptySubtitle}
          />
        }
      />
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
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    backgroundColor: colors.card,
  },
  filterChipSelected: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
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
  fabGroup: {
    position: "absolute",
    right: 16,
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
});
