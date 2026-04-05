import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import {
  Text,
  Searchbar,
  TextInput,
  Button,
  SegmentedButtons,
  ActivityIndicator,
  Divider,
} from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import * as inventoryService from "@services/inventory";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import WineTypeChip from "@components/inventory/WineTypeChip";
import type { SelectWineScreenProps, SelectedWine } from "@navigation/types";
import { WineType } from "@/types/index";
import type { Wine } from "@/types/index";

const WINE_TYPES: WineType[] = [
  WineType.Red,
  WineType.White,
  WineType["Rosé"],
  WineType.Sparkling,
  WineType.Dessert,
  WineType.Fortified,
  WineType.Orange,
  WineType.Other,
];

export default function SelectWineScreen({
  navigation,
}: SelectWineScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { items } = useInventoryStore();
  const householdId = profile?.householdIds?.[0];

  const [wines, setWines] = useState<Wine[]>([]);
  const [loadingWines, setLoadingWines] = useState(true);
  const [search, setSearch] = useState("");

  // Quick-add state
  const [quickName, setQuickName] = useState("");
  const [quickType, setQuickType] = useState<WineType>(WineType.Red);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (householdId) {
      loadWines();
    }
  }, [householdId]);

  const loadWines = async () => {
    if (!householdId) return;
    setLoadingWines(true);
    try {
      const result = await inventoryService.getWines(householdId);
      setWines(result);
    } catch {
      Alert.alert(t.error, t.failedToLoadWines);
    } finally {
      setLoadingWines(false);
    }
  };

  const filteredWines = search
    ? wines.filter((w) =>
        w.name.toLowerCase().includes(search.toLowerCase())
      )
    : wines;

  const handleSelectWine = (wine: Wine) => {
    const inventoryItem = items.find((i) => i.wineId === wine.id);
    const selectedWine: SelectedWine = {
      wineId: wine.id,
      wineName: wine.name,
      wineType: wine.type,
      inventoryItemId: inventoryItem?.id,
    };
    navigation.navigate("AddEntry", { selectedWine });
  };

  const handleQuickAdd = async () => {
    if (!householdId || !quickName.trim()) return;
    setAdding(true);
    try {
      const wineId = await inventoryService.createWineOnly(householdId, {
        name: quickName.trim(),
        type: quickType,
        producer: "",
        region: "",
        country: "",
        vintage: undefined,
        grape: "",
        notes: "",
      });
      const selectedWine: SelectedWine = {
        wineId,
        wineName: quickName.trim(),
        wineType: quickType,
      };
      navigation.navigate("AddEntry", { selectedWine });
    } catch {
      Alert.alert(t.error, t.failedToCreateWine);
    } finally {
      setAdding(false);
    }
  };

  const renderWineItem = ({ item }: { item: Wine }) => (
    <Pressable style={styles.wineItem} onPress={() => handleSelectWine(item)}>
      <Text variant="bodyLarge" style={styles.wineName} numberOfLines={1}>
        {item.name}
      </Text>
      <WineTypeChip type={item.type} compact />
    </Pressable>
  );

  const ListHeader = () => (
    <View style={styles.quickAddSection}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {t.quickAddWine}
      </Text>
      <TextInput
        label={t.wineNamePlain}
        value={quickName}
        onChangeText={setQuickName}
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputContent}
        textColor={colors.text}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
      />
      <SegmentedButtons
        value={quickType}
        onValueChange={(val) => setQuickType(val as WineType)}
        buttons={WINE_TYPES.slice(0, 4).map((type) => ({
          value: type,
          label: t.wineTypeLabels[type] ?? type,
        }))}
        style={styles.segmented}
      />
      <SegmentedButtons
        value={quickType}
        onValueChange={(val) => setQuickType(val as WineType)}
        buttons={WINE_TYPES.slice(4).map((type) => ({
          value: type,
          label: t.wineTypeLabels[type] ?? type,
        }))}
        style={styles.segmented}
      />
      <Button
        mode="contained"
        onPress={handleQuickAdd}
        loading={adding}
        disabled={!quickName.trim() || adding}
        style={styles.addButton}
        buttonColor={colors.primary}
        textColor={colors.onPrimary}
      >
        {t.addAndSelect}
      </Button>
      <Divider style={styles.divider} />
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {t.orSelectExisting}
      </Text>
    </View>
  );

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
      {loadingWines ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={filteredWines}
          renderItem={renderWineItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.list}
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
  loader: {
    marginTop: 32,
  },
  list: {
    paddingBottom: 24,
  },
  quickAddSection: {
    padding: 16,
  },
  sectionTitle: {
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: "right",
  },
  input: {
    backgroundColor: colors.card,
    marginBottom: 12,
  },
  inputContent: {
    textAlign: "right",
  },
  segmented: {
    marginBottom: 8,
  },
  addButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  divider: {
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  wineItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wineName: {
    color: colors.text,
    flex: 1,
    marginLeft: 12,
  },
});
