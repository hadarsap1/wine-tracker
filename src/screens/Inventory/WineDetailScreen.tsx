import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, Image } from "react-native";
import {
  Text,
  Button,
  IconButton,
  Dialog,
  Portal,
  ActivityIndicator,
  Divider,
  TextInput,
} from "react-native-paper";
import { Timestamp } from "firebase/firestore";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import * as inventoryService from "@services/inventory";
import * as vivinoService from "@services/vivino";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import WineTypeChip from "@components/inventory/WineTypeChip";
import VivinoBadge from "@components/inventory/VivinoBadge";
import type { WineDetailScreenProps } from "@navigation/types";
import type { AppWine, VivinoData } from "@/types/index";

export default function WineDetailScreen({
  route,
  navigation,
}: WineDetailScreenProps) {
  const { itemId, wineId } = route.params;
  const profile = useAuthStore((s) => s.profile);

  const { items, updateItem, deleteItem, openBottle } = useInventoryStore();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [wine, setWine] = useState<AppWine | null>(null);
  const [loadingWine, setLoadingWine] = useState(true);
  const [quantityLoading, setQuantityLoading] = useState(false);
  const [vivinoData, setVivinoData] = useState<VivinoData | null | undefined>(undefined);
  const [loadingVivino, setLoadingVivino] = useState(false);
  const vivinoFetchIdRef = useRef(0);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [openBottleDialogVisible, setOpenBottleDialogVisible] = useState(false);
  const [arrivedDialogVisible, setArrivedDialogVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualVivinoVisible, setManualVivinoVisible] = useState(false);
  const [manualScore, setManualScore] = useState("");
  const [manualRatings, setManualRatings] = useState("");
  const [savingVivino, setSavingVivino] = useState(false);

  const householdId = profile?.householdIds?.[0];
  const item = items.find((i) => i.id === itemId);

  const fetchWine = useCallback(async () => {
    if (!householdId) return;
    setLoadingWine(true);
    try {
      const w = await inventoryService.getWine(householdId, wineId);
      if (w) {
        const appWine: AppWine = {
          ...w,
          createdAt: w.createdAt?.toDate?.() ?? new Date(),
          updatedAt: w.updatedAt?.toDate?.() ?? new Date(),
        } as AppWine;
        setWine(appWine);

        // Use cached Vivino data if fresh (< 7 days), otherwise fetch
        const cached = w.vivinoData;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const searchUrl = `https://www.vivino.com/search/wines?q=${encodeURIComponent(w.name)}`;
        if (cached && cached.fetchedAt.toMillis() > sevenDaysAgo) {
          setVivinoData({ ...cached, wineUrl: cached.wineUrl ?? searchUrl });
        } else {
          const fetchId = ++vivinoFetchIdRef.current;
          setLoadingVivino(true);
          const fetched = await vivinoService.fetchVivinoData(w.name, w.vintage);
          if (vivinoFetchIdRef.current !== fetchId) return; // stale — newer fetch in progress
          const withUrl = fetched ? { ...fetched, wineUrl: fetched.wineUrl ?? searchUrl } : null;
          setVivinoData(withUrl);
          setLoadingVivino(false);
          // Only write to Firestore when we got a result and it differs from cache
          if (withUrl && withUrl.score !== cached?.score) {
            await inventoryService.updateWine(householdId, wineId, { vivinoData: withUrl });
          }
        }
      }
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setLoadingWine(false);
    }
  }, [householdId, wineId]);

  useEffect(() => {
    fetchWine();
  }, [fetchWine]);

  const handleQuantityChange = async (delta: number) => {
    if (!householdId || !item || quantityLoading) return;
    const newQty = Math.max(0, item.quantity + delta);
    setQuantityLoading(true);
    try {
      await updateItem(householdId, itemId, { quantity: newQty });
    } finally {
      setQuantityLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!householdId) return;
    setDeleteDialogVisible(false);
    await deleteItem(householdId, itemId);
    navigation.goBack();
  };

  const handleOpenBottle = async () => {
    if (!householdId || !item) return;
    setOpenBottleDialogVisible(false);
    setActionLoading(true);
    try {
      await openBottle(householdId, itemId, item.wineId, item.wineName, item.wineType);
      showSnackbar(t.bottleOpened, "success");
      navigation.goBack();
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkArrived = async () => {
    if (!householdId) return;
    setArrivedDialogVisible(false);
    setActionLoading(true);
    try {
      await updateItem(householdId, itemId, { status: "in_stock" });
      showSnackbar(t.markAsArrived, "success");
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveManualVivino = async () => {
    const score = parseFloat(manualScore);
    if (isNaN(score) || score < 1 || score > 5) {
      showSnackbar(t.manualVivinoInvalidScore, "error");
      return;
    }
    if (!householdId) return;
    setSavingVivino(true);
    try {
      const data: VivinoData = {
        score,
        ratings: manualRatings ? parseInt(manualRatings, 10) || 0 : 0,
        fetchedAt: Timestamp.now(),
      };
      await inventoryService.updateWine(householdId, wineId, { vivinoData: data });
      setVivinoData(data);
      setManualVivinoVisible(false);
      setManualScore("");
      setManualRatings("");
      showSnackbar(t.manualVivinoSaved, "success");
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setSavingVivino(false);
    }
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

      {wine?.imageUrl ? (
        <Image
          source={{ uri: wine.imageUrl }}
          style={styles.labelImage}
          resizeMode="contain"
        />
      ) : null}

      <Divider style={styles.divider} />

      {/* Status badge */}
      {(item.status ?? "in_stock") === "on_the_way" && (
        <Text variant="labelLarge" style={styles.onTheWayBadge}>
          {t.onTheWay}
        </Text>
      )}

      {/* Quantity Controls — only for in-stock */}
      {(item.status ?? "in_stock") === "in_stock" && (
        <>
          <View style={styles.quantitySection}>
            <Text variant="titleMedium" style={styles.sectionLabel}>
              {t.quantity}
            </Text>
            <View style={styles.quantityControls}>
              <IconButton
                icon="minus"
                mode="outlined"
                onPress={() => handleQuantityChange(-1)}
                disabled={item.quantity <= 0 || quantityLoading}
                iconColor={colors.primary}
              />
              <Text variant="headlineMedium" style={styles.quantityText}>
                {item.quantity}
              </Text>
              <IconButton
                icon="plus"
                mode="outlined"
                onPress={() => handleQuantityChange(1)}
                disabled={quantityLoading}
                iconColor={colors.primary}
              />
            </View>
          </View>
          <Divider style={styles.divider} />
        </>
      )}

      {/* Vivino Rating */}
      {(loadingVivino || vivinoData !== undefined) && (
        <View style={styles.vivinoSection}>
          <VivinoBadge data={vivinoData} loading={loadingVivino} />
          {vivinoData === null && !loadingVivino && (
            <Button
              mode="outlined"
              onPress={() => setManualVivinoVisible(true)}
              icon="star-plus-outline"
              textColor={colors.primary}
              style={styles.manualVivinoBtn}
              compact
            >
              {t.addVivinoManually}
            </Button>
          )}
        </View>
      )}

      {/* Wine Details */}
      <View style={styles.detailsSection}>
        <Text variant="titleMedium" style={styles.sectionLabel}>
          {t.stackTitles.wineDetail}
        </Text>
        <Divider style={styles.sectionDivider} />
        {wine?.producer && <DetailRow label={t.producer} value={wine.producer} />}
        {wine?.region && <DetailRow label={t.region} value={wine.region} />}
        {wine?.country && <DetailRow label={t.country} value={wine.country} />}
        {wine?.vintage && (
          <DetailRow label={t.vintage} value={String(wine.vintage)} />
        )}
        {wine?.grape && <DetailRow label={t.grape} value={wine.grape} />}
        {item.location && <DetailRow label={t.location} value={item.location} />}
        {item.purchasePrice != null && (
          <DetailRow
            label={t.purchasePrice}
            value={`$${item.purchasePrice.toFixed(2)}`}
          />
        )}
        {wine?.notes && <DetailRow label={t.notes} value={wine.notes} />}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {(item.status ?? "in_stock") === "on_the_way" ? (
          <Button
            mode="contained"
            onPress={() => setArrivedDialogVisible(true)}
            style={styles.editButton}
            buttonColor={colors.primary}
            loading={actionLoading}
            icon="home-import-outline"
          >
            {t.markAsArrived}
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={() => setOpenBottleDialogVisible(true)}
            style={styles.editButton}
            buttonColor={colors.primary}
            loading={actionLoading}
            icon="bottle-wine"
          >
            {t.openBottle}
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={() => navigation.navigate("EditWine", { wineId, itemId })}
          style={styles.editButton}
          textColor={colors.primary}
        >
          {t.edit}
        </Button>
        <Button
          mode="outlined"
          onPress={() => setDeleteDialogVisible(true)}
          style={styles.deleteButton}
          textColor={colors.error}
        >
          {t.delete}
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={openBottleDialogVisible}
          onDismiss={() => setOpenBottleDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.openBottleConfirm}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>{t.openBottleMsg}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpenBottleDialogVisible(false)} textColor={colors.textSecondary}>{t.cancel}</Button>
            <Button onPress={handleOpenBottle} textColor={colors.primary}>{t.openBottle}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={arrivedDialogVisible}
          onDismiss={() => setArrivedDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.markAsArrivedConfirm}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>{t.markAsArrivedMsg}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArrivedDialogVisible(false)} textColor={colors.textSecondary}>{t.cancel}</Button>
            <Button onPress={handleMarkArrived} textColor={colors.primary}>{t.ok}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {t.removeFromCellar}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {t.removeFromCellarMsg}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              {t.cancel}
            </Button>
            <Button onPress={handleDelete} textColor={colors.error}>
              {t.delete}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={manualVivinoVisible}
          onDismiss={() => setManualVivinoVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t.manualVivinoTitle}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={t.manualVivinoScore}
              value={manualScore}
              onChangeText={setManualScore}
              keyboardType="decimal-pad"
              style={styles.dialogInput}
              contentStyle={styles.dialogInputContent}
              textColor={colors.text}
              autoFocus
            />
            <TextInput
              label={t.manualVivinoRatings}
              value={manualRatings}
              onChangeText={setManualRatings}
              keyboardType="numeric"
              style={styles.dialogInput}
              contentStyle={styles.dialogInputContent}
              textColor={colors.text}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setManualVivinoVisible(false)} textColor={colors.textSecondary}>{t.cancel}</Button>
            <Button
              onPress={handleSaveManualVivino}
              loading={savingVivino}
              disabled={savingVivino || !manualScore.trim()}
              textColor={colors.primary}
            >
              {t.save}
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
    marginStart: 16,
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
  onTheWayBadge: {
    color: colors.onPrimary,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-end",
    marginTop: 4,
    overflow: "hidden",
  },
  name: {
    color: colors.text,
    fontWeight: "bold",
    textAlign: "right",
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
  labelImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginTop: 12,
  },
  vivinoSection: {
    marginBottom: 20,
  },
  manualVivinoBtn: {
    marginTop: 8,
    borderColor: colors.primary,
    alignSelf: "flex-start",
  },
  dialogInput: {
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  dialogInputContent: {
    textAlign: "right",
  },
  detailsSection: {
    gap: 4,
  },
  sectionLabel: {
    color: colors.gold,
    marginBottom: 4,
    textAlign: "right",
  },
  sectionDivider: {
    backgroundColor: colors.border,
    marginBottom: 8,
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
