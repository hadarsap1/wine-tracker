import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { useDiaryStore } from "@stores/diaryStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import * as diaryService from "@services/diary";
import { uploadImage, deleteImage, diaryImagePath } from "@services/storage";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { RatingInput, ImagePickerSection } from "@components/diary";
import WineTypeChip from "@components/inventory/WineTypeChip";
import type { AddEntryScreenProps, SelectedWine } from "@navigation/types";
import type { Rating } from "@/types/index";

export default function AddEntryScreen({
  navigation,
  route,
}: AddEntryScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { addEntry } = useDiaryStore();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const householdId = profile?.householdIds?.[0];

  const selectedWine = route.params?.selectedWine as SelectedWine | undefined;

  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [ratingError, setRatingError] = useState("");

  const todayStr = new Date().toLocaleDateString();

  const handleSelectWine = () => {
    navigation.navigate("SelectWine");
  };

  const handleAddImage = (uri: string) => {
    setImages((prev) => [...prev, uri]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!householdId) return;
    if (!selectedWine) {
      showSnackbar(t.pleaseSelectWine, "error");
      return;
    }
    if (rating < 1) {
      setRatingError(t.pleaseRateWine);
      return;
    }

    setSaving(true);
    try {
      const entryId = diaryService.generateEntryId(householdId);

      // Upload images in parallel
      const imageUrls = await Promise.all(
        images.map((uri, index) => {
          const path = diaryImagePath(
            householdId,
            entryId,
            `photo_${index}.jpg`
          );
          return uploadImage(uri, path);
        })
      );

      try {
        await addEntry(householdId, entryId, {
          wineId: selectedWine.wineId,
          wineName: selectedWine.wineName,
          wineType: selectedWine.wineType,
          rating: rating as Rating,
          notes: notes.trim() || undefined,
          imageUrls,
          inventoryItemId: selectedWine.inventoryItemId,
        });
      } catch (firestoreError) {
        // Roll back uploaded images so Storage doesn't accumulate orphans
        await Promise.allSettled(imageUrls.map((url) => deleteImage(url)));
        throw firestoreError;
      }

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
      {/* Wine Selection */}
      <Text variant="labelLarge" style={styles.label}>
        {t.wine}
      </Text>
      <Pressable style={styles.wineSelector} onPress={handleSelectWine}>
        {selectedWine ? (
          <View style={styles.selectedWine}>
            <Text variant="bodyLarge" style={styles.wineName} numberOfLines={1}>
              {selectedWine.wineName}
            </Text>
            <WineTypeChip type={selectedWine.wineType} compact />
          </View>
        ) : (
          <View style={styles.selectPrompt}>
            <MaterialCommunityIcons
              name="bottle-wine"
              size={24}
              color={colors.textSecondary}
            />
            <Text variant="bodyMedium" style={styles.selectText}>
              {t.tapToSelectWine}
            </Text>
          </View>
        )}
        <MaterialCommunityIcons
          name="chevron-left"
          size={24}
          color={colors.textSecondary}
        />
      </Pressable>

      {/* Rating */}
      <Text variant="labelLarge" style={styles.label}>
        {t.rating}
      </Text>
      <RatingInput value={rating} onChange={(r) => { setRating(r); if (ratingError) setRatingError(""); }} />
      <HelperText type="error" visible={!!ratingError}>
        {ratingError}
      </HelperText>

      {/* Date */}
      <Text variant="labelLarge" style={styles.label}>
        {t.tastingDate}
      </Text>
      <Text variant="bodyMedium" style={styles.dateText}>
        {todayStr}
      </Text>

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
        contentStyle={styles.inputContent}
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

      {/* Submit */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={saving}
        disabled={saving}
        style={styles.submitButton}
        buttonColor={colors.primary}
        textColor={colors.onPrimary}
      >
        {t.saveEntry}
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
  label: {
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "right",
  },
  inputContent: {
    textAlign: "right",
  },
  wineSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedWine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wineName: {
    color: colors.text,
    flex: 1,
  },
  selectPrompt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectText: {
    color: colors.textSecondary,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  notesInput: {
    backgroundColor: colors.card,
    minHeight: 100,
  },
  submitButton: {
    marginTop: 24,
  },
});
