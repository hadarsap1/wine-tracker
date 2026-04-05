import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useDiaryStore } from "@stores/diaryStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import { uploadImage, deleteImage, diaryImagePath } from "@services/storage";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { RatingInput, ImagePickerSection } from "@components/diary";
import WineTypeChip from "@components/inventory/WineTypeChip";
import type { EditEntryScreenProps } from "@navigation/types";
import type { Rating } from "@/types/index";

export default function EditEntryScreen({
  navigation,
  route,
}: EditEntryScreenProps) {
  const { entryId } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const { entries, updateEntry } = useDiaryStore();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const householdId = profile?.householdIds?.[0];

  const entry = entries.find((e) => e.id === entryId);

  const [rating, setRating] = useState<number | null>(entry?.rating ?? null);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [images, setImages] = useState<string[]>(entry?.imageUrls ?? []);
  const [saving, setSaving] = useState(false);

  // Track which original remote URLs have been removed
  const originalUrls = entry?.imageUrls ?? [];

  if (!entry) {
    return (
      <ScrollView style={styles.container}>
        <Text variant="bodyLarge" style={styles.notFound}>
          {t.entryNotFound}
        </Text>
      </ScrollView>
    );
  }

  const handleAddImage = (uri: string) => {
    setImages((prev) => [...prev, uri]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!householdId) return;
    // rating can stay null for "opened bottle" entries; only enforce if user
    // has started changing it (i.e. touched at least 1 star)
    if (rating !== null && (rating as number) < 1) {
      showSnackbar(t.pleaseRateWine, "error");
      return;
    }

    setSaving(true);
    try {
      // Determine which remote images were removed
      const removedUrls = originalUrls.filter((url) => !images.includes(url));

      // Delete removed remote images from Storage
      await Promise.all(
        removedUrls.map((url) => deleteImage(url))
      );

      // Upload new local images (those not starting with http)
      const finalUrls = await Promise.all(
        images.map(async (uri, index) => {
          if (uri.startsWith("http")) return uri;
          const path = diaryImagePath(
            householdId,
            entryId,
            `photo_${Date.now()}_${index}.jpg`
          );
          return uploadImage(uri, path);
        })
      );

      await updateEntry(householdId, entryId, {
        rating: (rating as Rating | null),
        notes: notes.trim() || undefined,
        imageUrls: finalUrls,
      });

      navigation.goBack();
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Wine (read-only) */}
      <Text variant="labelLarge" style={styles.label}>
        {t.wine}
      </Text>
      <Text variant="bodyLarge" style={styles.wineNameText}>
        {entry.wineName}
      </Text>
      <WineTypeChip type={entry.wineType} />

      {/* Rating */}
      <Text variant="labelLarge" style={styles.label}>
        {t.rating}
      </Text>
      <RatingInput value={rating} onChange={(r) => setRating(r)} />
      {rating === null && (
        <Text variant="labelSmall" style={styles.unratedHint}>
          {t.tapToRate}
        </Text>
      )}

      {/* Notes */}
      <Text variant="labelLarge" style={styles.label}>
        {t.notes}
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        multiline
        numberOfLines={4}
        placeholder={t.notesPlaceholder}
        style={styles.notesInput}
        contentStyle={styles.notesContent}
        textColor={colors.text}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        placeholderTextColor={colors.textSecondary}
      />

      {/* Photos */}
      <ImagePickerSection
        images={images}
        onAdd={handleAddImage}
        onRemove={handleRemoveImage}
      />

      {/* Save */}
      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
        buttonColor={colors.primary}
        textColor={colors.onPrimary}
      >
        {t.saveChanges}
      </Button>
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
  label: {
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "right",
  },
  wineNameText: {
    color: colors.text,
    marginBottom: 8,
    textAlign: "right",
  },
  notesInput: {
    backgroundColor: colors.card,
    minHeight: 100,
  },
  notesContent: {
    textAlign: "right",
  },
  saveButton: {
    marginTop: 24,
  },
  unratedHint: {
    color: colors.primary,
    marginTop: 4,
    fontStyle: "italic",
    textAlign: "right",
  },
});
