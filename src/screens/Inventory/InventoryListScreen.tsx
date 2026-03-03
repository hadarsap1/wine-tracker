import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { FAB, Searchbar } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { colors } from "@config/theme";
import EmptyState from "@components/common/EmptyState";
import InventoryCard from "@components/inventory/InventoryCard";
import type { InventoryListScreenProps } from "@navigation/types";
import type { AppInventoryItem } from "@/types/index";

export default function InventoryListScreen({
  navigation,
}: InventoryListScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { items, loading, loadItems } = useInventoryStore();
  const [search, setSearch] = useState("");

  const householdId = profile?.householdIds?.[0];

  useEffect(() => {
    if (householdId) {
      loadItems(householdId);
    }
  }, [householdId, loadItems]);

  const filteredItems = search
    ? items.filter((item) =>
        item.wineName.toLowerCase().includes(search.toLowerCase())
      )
    : items;

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

  return (
    <View style={styles.container}>
      {items.length > 0 && (
        <Searchbar
          placeholder="Search wines..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor={colors.textSecondary}
          placeholderTextColor={colors.textSecondary}
        />
      )}
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
            icon="bottle-wine-outline"
            title="Your cellar is empty"
            subtitle="Add your first wine to start tracking your collection"
            actionLabel="Add your first wine"
            onAction={() => navigation.navigate("AddWine")}
          />
        }
      />
      {items.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate("AddWine")}
          color={colors.onPrimary}
          customSize={56}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  list: {
    paddingVertical: 8,
    paddingBottom: 80,
  },
  emptyList: {
    flexGrow: 1,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
  },
});
