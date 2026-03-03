import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import {
  Text,
  Button,
  IconButton,
  Dialog,
  Portal,
  ActivityIndicator,
  Divider,
} from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import * as inventoryService from "@services/inventory";
import { colors } from "@config/theme";
import WineTypeChip from "@components/inventory/WineTypeChip";
import type { WineDetailScreenProps } from "@navigation/types";
import type { AppWine } from "@/types/index";

export default function WineDetailScreen({
  route,
  navigation,
}: WineDetailScreenProps) {
  const { itemId, wineId } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const { items, updateItem, deleteItem } = useInventoryStore();

  const [wine, setWine] = useState<AppWine | null>(null);
  const [loadingWine, setLoadingWine] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const householdId = profile?.householdIds?.[0];
  const item = items.find((i) => i.id === itemId);

  const fetchWine = useCallback(async () => {
    if (!householdId) return;
    setLoadingWine(true);
    const w = await inventoryService.getWine(householdId, wineId);
    if (w) {
      setWine({
        ...w,
        createdAt: w.createdAt?.toDate?.() ?? new Date(),
        updatedAt: w.updatedAt?.toDate?.() ?? new Date(),
      } as AppWine);
    }
    setLoadingWine(false);
  }, [householdId, wineId]);

  useEffect(() => {
    fetchWine();
  }, [fetchWine]);

  const handleQuantityChange = async (delta: number) => {
    if (!householdId || !item) return;
    const newQty = Math.max(0, item.quantity + delta);
    await updateItem(householdId, itemId, { quantity: newQty });
  };

  const handleDelete = async () => {
    if (!householdId) return;
    setDeleteDialogVisible(false);
    await deleteItem(householdId, itemId);
    navigation.goBack();
  };

  if (loadingWine || !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.name}>
          {wine?.name ?? item.wineName}
        </Text>
        <WineTypeChip type={item.wineType} />
      </View>

      <Divider style={styles.divider} />

      {/* Quantity Controls */}
      <View style={styles.quantitySection}>
        <Text variant="titleMedium" style={styles.label}>
          Quantity
        </Text>
        <View style={styles.quantityControls}>
          <IconButton
            icon="minus"
            mode="outlined"
            onPress={() => handleQuantityChange(-1)}
            disabled={item.quantity <= 0}
            iconColor={colors.primary}
          />
          <Text variant="headlineMedium" style={styles.quantityText}>
            {item.quantity}
          </Text>
          <IconButton
            icon="plus"
            mode="outlined"
            onPress={() => handleQuantityChange(1)}
            iconColor={colors.primary}
          />
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Wine Details */}
      <View style={styles.detailsSection}>
        {wine?.producer && <DetailRow label="Producer" value={wine.producer} />}
        {wine?.region && <DetailRow label="Region" value={wine.region} />}
        {wine?.country && <DetailRow label="Country" value={wine.country} />}
        {wine?.vintage && (
          <DetailRow label="Vintage" value={String(wine.vintage)} />
        )}
        {wine?.grape && <DetailRow label="Grape" value={wine.grape} />}
        {item.location && <DetailRow label="Location" value={item.location} />}
        {item.purchasePrice != null && (
          <DetailRow
            label="Purchase Price"
            value={`$${item.purchasePrice.toFixed(2)}`}
          />
        )}
        {wine?.notes && <DetailRow label="Notes" value={wine.notes} />}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("EditWine", { wineId, itemId })}
          style={styles.editButton}
          buttonColor={colors.primary}
        >
          Edit
        </Button>
        <Button
          mode="outlined"
          onPress={() => setDeleteDialogVisible(true)}
          style={styles.deleteButton}
          textColor={colors.error}
        >
          Delete
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            Remove from cellar?
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              This will remove the inventory entry. The wine data will be kept
              for diary references.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleDelete} textColor={colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text variant="labelLarge" style={detailStyles.label}>
        {label}
      </Text>
      <Text variant="bodyLarge" style={detailStyles.value}>
        {value}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  label: {
    color: colors.textSecondary,
  },
  value: {
    color: colors.text,
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    gap: 12,
  },
  name: {
    color: colors.text,
    fontWeight: "bold",
  },
  divider: {
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  quantitySection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    color: colors.textSecondary,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityText: {
    color: colors.primary,
    fontWeight: "bold",
    minWidth: 40,
    textAlign: "center",
  },
  detailsSection: {
    gap: 4,
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  editButton: {},
  deleteButton: {
    borderColor: colors.error,
  },
  dialog: {
    backgroundColor: colors.card,
  },
  dialogTitle: {
    color: colors.text,
  },
  dialogText: {
    color: colors.textSecondary,
  },
});
