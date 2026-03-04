import React, { useState } from "react";
import { ScrollView, Alert, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useDiaryStore } from "@stores/diaryStore";
import { uploadImage, deleteImage, diaryImagePath } from "@services/storage";
import { colors } from "@config/theme";
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
  const householdId = profile?.householdIds?.[0];

  const entry = entries.find((e) => e.id === entryId);

  const [rating, setRating] = useState<number>(entry?.rating ?? 0);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [images, setImages] = useState<string[]>(entry?.imageUrls ?? []);
  const [saving, setSaving] = useState(false);

  // Track which original remote URLs have been removed
  const originalUrls = entry?.imageUrls ?? [];

  if (!entry) {
    return (
      <ScrollView style={styles.container}>
        <Text variant="bodyLarge" style={styles.notFound}>
          Entry not found
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
    if (rating < 1) {
      Alert.alert("Missing rating", "Please rate the wine (1-5 stars).");
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
        rating: rating as Rating,
        notes: notes.trim() || undefined,
        imageUrls: finalUrls,
      });

      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
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
        Wine
      </Text>
      <Text variant="bodyLarge" style={styles.wineNameText}>
        {entry.wineName}
      </Text>
      <WineTypeChip type={entry.wineType} />

      {/* Rating */}
      <Text variant="labelLarge" style={styles.label}>
        Rating
      </Text>
      <RatingInput value={rating} onChange={setRating} />

      {/* Notes */}
      <Text variant="labelLarge" style={styles.label}>
        Notes
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        multiline
        numberOfLines={4}
        placeholder="How did it taste? Aromas, flavors, pairings..."
        style={styles.notesInput}
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
        Save Changes
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
  },
  wineNameText: {
    color: colors.text,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: colors.card,
    minHeight: 100,
  },
  saveButton: {
    marginTop: 24,
  },
});
