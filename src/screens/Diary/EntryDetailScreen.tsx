import React, { useState } from "react";
import {
  View,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
} from "react-native";
import { Text, Button, Dialog, Portal } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useDiaryStore } from "@stores/diaryStore";
import { colors } from "@config/theme";
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
  const householdId = profile?.householdIds?.[0];

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const entry = entries.find((e) => e.id === entryId);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge" style={styles.notFound}>
          Entry not found
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
      Alert.alert("Error", (e as Error).message);
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
        Rating
      </Text>
      <RatingInput value={entry.rating} size={32} />

      {/* Notes */}
      {entry.notes ? (
        <>
          <Text variant="labelLarge" style={styles.label}>
            Notes
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
            Photos
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageScroll}
          >
            {entry.imageUrls.map((uri, index) => (
              <Image
                key={uri + index}
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
          Edit
        </Button>
        <Button
          mode="outlined"
          onPress={() => setDeleteVisible(true)}
          style={styles.deleteButton}
          textColor={colors.error}
        >
          Delete
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
            Delete Entry?
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              This will permanently delete this diary entry and its photos.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteVisible(false)}>Cancel</Button>
            <Button
              onPress={handleDelete}
              loading={deleting}
              textColor={colors.error}
            >
              Delete
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
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  editButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
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
