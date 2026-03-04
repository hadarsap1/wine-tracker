import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuthStore } from "@stores/authStore";
import { useDiaryStore } from "@stores/diaryStore";
import * as diaryService from "@services/diary";
import { uploadImage, diaryImagePath } from "@services/storage";
import { colors } from "@config/theme";
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
  const householdId = profile?.householdIds?.[0];

  const selectedWine = route.params?.selectedWine as SelectedWine | undefined;

  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
      Alert.alert("Missing wine", "Please select a wine first.");
      return;
    }
    if (rating < 1) {
      Alert.alert("Missing rating", "Please rate the wine (1-5 stars).");
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

      await addEntry(householdId, entryId, {
        wineId: selectedWine.wineId,
        wineName: selectedWine.wineName,
        wineType: selectedWine.wineType,
        rating: rating as Rating,
        notes: notes.trim() || undefined,
        imageUrls,
        inventoryItemId: selectedWine.inventoryItemId,
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
      {/* Wine Selection */}
      <Text variant="labelLarge" style={styles.label}>
        Wine
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
              Tap to select a wine
            </Text>
          </View>
        )}
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={colors.textSecondary}
        />
      </Pressable>

      {/* Rating */}
      <Text variant="labelLarge" style={styles.label}>
        Rating
      </Text>
      <RatingInput value={rating} onChange={setRating} />

      {/* Date */}
      <Text variant="labelLarge" style={styles.label}>
        Tasting Date
      </Text>
      <Text variant="bodyMedium" style={styles.dateText}>
        {todayStr}
      </Text>

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
        Save Entry
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
