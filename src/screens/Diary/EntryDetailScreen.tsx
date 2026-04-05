import React, { useState } from "react";
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { Text, Button, Dialog, Portal } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useDiaryStore } from "@stores/diaryStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { RatingInput } from "@components/diary";
import WineTypeChip from "@components/inventory/WineTypeChip";
import type { EntryDetailScreenProps } from "@navigation/types";

export default function EntryDetailScreen({
  navigation,
  route,
}: EntryDetailScreenProps) {
  const { entryId } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const { entries, deleteEntry } = useDiaryStore();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const householdId = profile?.householdIds?.[0];

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const entry = entries.find((e) => e.id === entryId);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge" style={styles.notFound}>
          {t.entryNotFound}
        </Text>
      </View>
    );
  }

  const dateStr =
    entry.tastingDate instanceof Date
      ? entry.tastingDate.toLocaleDateString()
      : "";

  const handleDelete = async () => {
    if (!householdId) return;
    setDeleting(true);
    try {
      await deleteEntry(householdId, entryId);
      setDeleteVisible(false);
      navigation.goBack();
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <Text variant="headlineSmall" style={styles.wineName}>
        {entry.wineName}
      </Text>
      <View style={styles.row}>
        <WineTypeChip type={entry.wineType} />
        <Text variant="bodyMedium" style={styles.date}>
          {dateStr}
        </Text>
      </View>

      {/* Rating */}
      <Text variant="labelLarge" style={styles.label}>
        {t.rating}
      </Text>
      {entry.rating === null ? (
        <Text variant="bodyMedium" style={styles.unrated}>{t.unrated}</Text>
      ) : (
        <RatingInput value={entry.rating} size={32} />
      )}

      {/* Notes */}
      {entry.notes ? (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t.notes}
          </Text>
          <Text variant="bodyMedium" style={styles.notes}>
            {entry.notes}
          </Text>
        </>
      ) : null}

      {/* Photos */}
      {entry.imageUrls?.length > 0 && (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t.photos}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageScroll}
          >
            {entry.imageUrls.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={styles.photo}
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("EditEntry", { entryId })}
          style={styles.editButton}
          buttonColor={colors.primary}
          textColor={colors.onPrimary}
        >
          {t.edit}
        </Button>
        {!entry.inventoryItemId && (
          <Button
            mode="outlined"
            onPress={() =>
              navigation.getParent()?.navigate("Inventory", {
                screen: "AddWine",
                params: {
                  prefillName: entry.wineName,
                  prefillType: entry.wineType,
                },
              })
            }
            style={styles.addToCellarButton}
            textColor={colors.primary}
            icon="plus"
          >
            {t.addToCellar}
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={() => setDeleteVisible(true)}
          style={styles.deleteButton}
          textColor={colors.error}
        >
          {t.delete}
        </Button>
      </View>

      {/* Delete Confirmation */}
      <Portal>
        <Dialog
          visible={deleteVisible}
          onDismiss={() => setDeleteVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {t.deleteEntry}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {t.deleteEntryMsg}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteVisible(false)}>{t.cancel}</Button>
            <Button
              onPress={handleDelete}
              loading={deleting}
              textColor={colors.error}
            >
              {t.delete}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  notFound: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 32,
  },
  wineName: {
    color: colors.text,
    marginBottom: 8,
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  date: {
    color: colors.textSecondary,
  },
  label: {
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  notes: {
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: "right",
  },
  imageScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  unrated: {
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  actions: {
    gap: 12,
    marginTop: 32,
  },
  editButton: {},
  addToCellarButton: {
    borderColor: colors.primary,
  },
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
