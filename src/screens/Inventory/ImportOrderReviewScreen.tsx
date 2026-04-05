import React, { useState } from "react";
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
} from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType } from "@/types/index";
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
      try {
        await addWine(
          householdId,
          {
            name: item.name.trim(),
            type: item.type ?? WineType.Red,
            vintage: item.vintage,
          },
          {
            quantity: item.quantity,
            status: "on_the_way",
            purchasePrice: item.price,
          }
        );
        added++;
      } catch (e) {
        errors.push(item.name);
      }
    }
    setSaving(false);

    if (added > 0) {
      const msg = t.importOrderAdded.replace("{{count}}", String(added));
      showSnackbar(msg, "success");
    }
    if (errors.length > 0) {
      showSnackbar(`${t.failedToCreateWine}: ${errors.join(", ")}`, "error");
    }
    if (added > 0) {
      navigation.popToTop();
    }
  };

  const renderItem = ({ item }: { item: EditableItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text variant="labelSmall" style={styles.itemIndex}>
          #{items.indexOf(item) + 1}
        </Text>
        <IconButton
          icon="close"
          size={18}
          onPress={() => removeItem(item.key)}
          iconColor={colors.error}
          style={styles.removeBtn}
        />
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text variant="bodySmall" style={styles.subtitle}>
        {t.importOrderReviewSubtitle}
      </Text>

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
  subtitle: {
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    textAlign: "right",
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
  itemIndex: {
    color: colors.textSecondary,
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
