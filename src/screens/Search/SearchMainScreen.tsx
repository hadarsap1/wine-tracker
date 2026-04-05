import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Searchbar, Chip, Text, ActivityIndicator } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { SearchResultRow } from "@components/search";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType } from "@/types/index";
import type { SearchMainScreenProps } from "@navigation/types";
import type { AppInventoryItem } from "@/types/index";

const WINE_TYPES = Object.values(WineType);

export default function SearchMainScreen({
  navigation,
}: SearchMainScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { items, loading, loadItems } = useInventoryStore();
  const householdId = profile?.householdIds?.[0];

  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<WineType | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 300);
  }, []);

  useEffect(() => {
    if (householdId && items.length === 0) {
      loadItems(householdId);
    }
  }, [householdId]);

  const handleRefresh = useCallback(() => {
    if (householdId) loadItems(householdId);
  }, [householdId, loadItems]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      result = result.filter((item) => item.wineName.toLowerCase().includes(q));
    }
    if (selectedType) {
      result = result.filter((item) => item.wineType === selectedType);
    }
    return result;
  }, [items, debouncedQuery, selectedType]);

  const handlePress = useCallback(
    (item: AppInventoryItem) => {
      navigation.navigate("SearchWineDetail", {
        itemId: item.id,
        wineId: item.wineId,
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: AppInventoryItem }) => (
      <SearchResultRow
        wineName={item.wineName}
        wineType={item.wineType}
        quantity={item.quantity}
        location={item.location}
        onPress={() => handlePress(item)}
      />
    ),
    [handlePress]
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
      <Searchbar
        placeholder={t.searchWines}
        onChangeText={handleQueryChange}
        value={query}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor={colors.textSecondary}
        placeholderTextColor={colors.textSecondary}
      />

      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={WINE_TYPES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipsList}
          renderItem={({ item: type }) => (
            <Chip
              selected={selectedType === type}
              onPress={() =>
                setSelectedType((prev) => (prev === type ? null : type))
              }
              style={[
                styles.chip,
                selectedType === type && styles.chipSelected,
              ]}
              textStyle={[
                styles.chipText,
                selectedType === type && styles.chipTextSelected,
              ]}
            >
              {t.wineTypeLabels[type] ?? type}
            </Chip>
          )}
        />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={handleRefresh}
        contentContainerStyle={
          filteredItems.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {items.length === 0
                ? t.noWinesYet
                : t.noWinesMatch}
            </Text>
          </View>
        }
      />
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
  searchBar: {
    margin: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  searchInput: {
    color: colors.text,
  },
  chipsContainer: {
    paddingBottom: 8,
  },
  chipsList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "right",
  },
});
