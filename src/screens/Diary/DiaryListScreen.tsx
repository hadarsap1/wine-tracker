import React, { useCallback, useEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { FAB, Searchbar, ActivityIndicator } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useDiaryStore } from "@stores/diaryStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import EmptyState from "@components/common/EmptyState";
import { DiaryCard } from "@components/diary";
import type { DiaryListScreenProps } from "@navigation/types";
import type { AppDiaryEntry } from "@/types/index";

export default function DiaryListScreen({
  navigation,
}: DiaryListScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { entries, loading, loadEntries } = useDiaryStore();
  const [search, setSearch] = useState("");

  const householdId = profile?.householdIds?.[0];

  useEffect(() => {
    if (householdId) {
      loadEntries(householdId);
    }
  }, [householdId, loadEntries]);

  const filteredEntries = search
    ? entries.filter((entry) =>
        entry.wineName.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const handleRefresh = useCallback(() => {
    if (householdId) loadEntries(householdId);
  }, [householdId, loadEntries]);

  const renderItem = useCallback(
    ({ item }: { item: AppDiaryEntry }) => (
      <DiaryCard
        entry={item}
        onPress={() =>
          navigation.navigate("EntryDetail", { entryId: item.id })
        }
      />
    ),
    [navigation]
  );

  if (loading && entries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t.searchDiary}
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        iconColor={colors.textSecondary}
        placeholderTextColor={colors.textSecondary}
        editable={!loading || entries.length > 0}
      />
      <FlatList
        data={filteredEntries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filteredEntries.length === 0 ? styles.emptyList : styles.list
        }
        refreshing={loading}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState
            icon="book-open-variant"
            title={t.diaryEmpty}
            subtitle={t.diaryEmptySubtitle}
            actionLabel={t.addFirstEntry}
            onAction={() => navigation.navigate("AddEntry")}
          />
        }
      />
      {entries.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate("AddEntry")}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
