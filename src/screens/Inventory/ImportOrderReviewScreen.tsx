import React, { useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  TextInput,
  IconButton,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import * as vivinoService from "@services/vivino";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType, type VivinoData } from "@/types/index";
import type { ParsedOrderItem } from "@/utils/parseOrderText";
import type { ImportOrderReviewScreenProps } from "@navigation/types";

interface EditableItem extends ParsedOrderItem {
  key: string;
}

export default function ImportOrderReviewScreen({
  route,
  navigation,
}: ImportOrderReviewScreenProps) {
  const { items: initialItems } = route.params;
  const { addWine, loading } = useInventoryStore();
  const profile = useAuthStore((s) => s.profile);
  const showSnackbar = useSnackbarStore((s) => s.show);
  const householdId = profile?.householdIds?.[0];

  const [items, setItems] = useState<EditableItem[]>(
    initialItems.map((item, i) => ({ ...item, key: `item-${i}` }))
  );
  const [saving, setSaving] = useState(false);

  // Per-item Vivino results: undefined = not yet fetched, null = not found, data = found
  const [vivinoResults, setVivinoResults] = useState<Record<string, VivinoData | null | undefined>>({});
  const [fetchingVivino, setFetchingVivino] = useState(false);
  const viviFetchedRef = useRef(false);

  // Fetch Vivino for all items on mount (best-effort, in parallel)
  useEffect(() => {
    if (viviFetchedRef.current || initialItems.length === 0) return;
    viviFetchedRef.current = true;
    setFetchingVivino(true);

    Promise.allSettled(
      initialItems.map(async (item, i) => {
        const key = `item-${i}`;
        const data = await vivinoService.fetchVivinoData(
          item.name.trim(),
          item.vintage
        );
        setVivinoResults((prev) => ({ ...prev, [key]: data ?? null }));

        // Auto-set wine type from Vivino
        if (data?.wineType) {
          const mapped = data.wineType as WineType;
          if (Object.values(WineType).includes(mapped)) {
            setItems((prev) =>
              prev.map((it) => (it.key === key ? { ...it, type: mapped } : it))
            );
          }
        }
      })
    ).finally(() => setFetchingVivino(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateItem = (key: string, patch: Partial<ParsedOrderItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleConfirm = async () => {
    if (!householdId) return;
    if (items.length === 0) {
      showSnackbar(t.importOrderNoItemsMsg, "error");
      return;
    }

    setSaving(true);
    let added = 0;
    const errors: string[] = [];
    for (const item of items) {
      const vivino = vivinoResults[item.key];
      const resolvedType: WineType = (() => {
        if (item.type && Object.values(WineType).includes(item.type as WineType)) {
          return item.type as WineType;
        }
        if (vivino?.wineType && Object.values(WineType).includes(vivino.wineType as WineType)) {
          return vivino.wineType as WineType;
        }
        return WineType.Red;
      })();

      try {
        await addWine(
          householdId,
          {
            name: item.name.trim(),
            type: resolvedType,
            vintage: item.vintage,
            vivinoData: vivino ?? undefined,
          },
          {
            quantity: item.quantity,
            status: "on_the_way",
            purchasePrice: item.price,
          }
        );
        added++;
      } catch {
        errors.push(item.name);
      }
    }
    setSaving(false);

    if (added > 0) {
      showSnackbar(t.importOrderAdded.replace("{{count}}", String(added)), "success");
    }
    if (errors.length > 0) {
      showSnackbar(`${t.failedToCreateWine}: ${errors.join(", ")}`, "error");
    }
    if (added > 0) {
      navigation.popToTop();
    }
  };

  const renderItem = ({ item }: { item: EditableItem }) => {
    const vivino = vivinoResults[item.key];
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text variant="labelSmall" style={styles.itemIndex}>
            #{items.indexOf(item) + 1}
          </Text>
          <View style={styles.itemHeaderRight}>
            {/* Inline Vivino score */}
            {vivino ? (
              <View style={styles.vivinoInline}>
                <Text style={styles.vivinoLogo}>V</Text>
                <Text style={styles.vivinoScore}>{vivino.score.toFixed(1)}</Text>
              </View>
            ) : vivino === undefined && fetchingVivino ? (
              <ActivityIndicator size={12} color={colors.textSecondary} />
            ) : null}
            <IconButton
              icon="close"
              size={18}
              onPress={() => removeItem(item.key)}
              iconColor={colors.error}
              style={styles.removeBtn}
            />
          </View>
        </View>

        <TextInput
          label={t.wineNamePlain}
          value={item.name}
          onChangeText={(v) => updateItem(item.key, { name: v })}
          style={styles.nameInput}
          contentStyle={styles.inputContent}
          textColor={colors.text}
          dense
        />

        <View style={styles.row}>
          <TextInput
            label={t.itemQuantity}
            value={String(item.quantity)}
            onChangeText={(v) => {
              const qty = parseInt(v, 10);
              updateItem(item.key, { quantity: isNaN(qty) || qty < 1 ? 1 : qty });
            }}
            keyboardType="numeric"
            style={[styles.smallInput, styles.flex]}
            textColor={colors.text}
            dense
          />
          <View style={styles.gap} />
          <TextInput
            label={t.itemVintage}
            value={item.vintage ? String(item.vintage) : ""}
            onChangeText={(v) => {
              const yr = parseInt(v, 10);
              updateItem(item.key, {
                vintage: v === "" ? undefined : isNaN(yr) ? undefined : yr,
              });
            }}
            keyboardType="numeric"
            style={[styles.smallInput, styles.flex]}
            textColor={colors.text}
            dense
          />
          <View style={styles.gap} />
          <TextInput
            label={t.itemPrice}
            value={item.price != null ? String(item.price) : ""}
            onChangeText={(v) => {
              const p = parseFloat(v);
              updateItem(item.key, { price: v === "" ? undefined : isNaN(p) ? undefined : p });
            }}
            keyboardType="decimal-pad"
            style={[styles.smallInput, styles.flex]}
            textColor={colors.text}
            dense
          />
        </View>

        <Divider style={styles.divider} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.headerBar}>
        <Text variant="bodySmall" style={styles.subtitle}>
          {t.importOrderReviewSubtitle}
        </Text>
        {fetchingVivino && (
          <View style={styles.vivinoStatus}>
            <ActivityIndicator size={12} color={colors.primary} />
            <Text variant="labelSmall" style={styles.vivinoStatusText}>
              {t.vivinoFetchingBatch}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.emptyText}>
            {t.importOrderNoItems}
          </Text>
        }
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={saving || loading}
          disabled={saving || loading || items.length === 0}
          buttonColor={colors.primary}
          style={styles.confirmBtn}
          icon="truck-delivery"
        >
          {t.importOrderConfirm} ({items.length})
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "right",
  },
  vivinoStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  vivinoStatusText: {
    color: colors.primary,
  },
  list: {
    paddingBottom: 16,
  },
  itemCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemIndex: {
    color: colors.textSecondary,
  },
  vivinoInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#9b1c3120",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vivinoLogo: {
    color: "#9b1c31",
    fontWeight: "bold",
    fontSize: 11,
  },
  vivinoScore: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  removeBtn: {
    margin: 0,
  },
  nameInput: {
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  inputContent: {
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  smallInput: {
    backgroundColor: colors.card,
  },
  flex: {
    flex: 1,
  },
  gap: {
    width: 8,
  },
  divider: {
    backgroundColor: colors.border,
    marginTop: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 40,
    paddingHorizontal: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmBtn: {
    borderRadius: 8,
  },
});
