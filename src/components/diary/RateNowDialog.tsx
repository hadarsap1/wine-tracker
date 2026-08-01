import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Dialog, Portal, Button, Text, TextInput } from "react-native-paper";
import { colors, radius } from "@config/theme";
import { t } from "@i18n/index";
import RatingInput from "./RatingInput";

interface RateNowDialogProps {
  visible: boolean;
  wineName: string;
  saving?: boolean;
  onDismiss: () => void;
  onSave: (rating: number, notes: string) => void;
}

/**
 * Prompt shown right after a bottle is opened.
 *
 * Opening a bottle creates an *unrated* diary entry. Previously the user had to
 * remember to go find that entry in the diary later, so unrated entries piled
 * up. Rating is easiest in the moment you're drinking it — so ask here, while
 * keeping "later" a single tap away.
 */
export default function RateNowDialog({
  visible,
  wineName,
  saving = false,
  onDismiss,
  onSave,
}: RateNowDialogProps): React.ReactElement {
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const handleDismiss = () => {
    setRating(null);
    setNotes("");
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{t.rateNowTitle}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.wineName} numberOfLines={2}>
            {wineName}
          </Text>

          <View style={styles.stars}>
            <RatingInput value={rating} onChange={setRating} size={34} />
          </View>

          <TextInput
            label={t.notes}
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.notes}
            outlineStyle={styles.notesOutline}
            activeOutlineColor={colors.gold}
            contentStyle={styles.notesContent}
          />

          <Text variant="labelSmall" style={styles.hint}>
            {t.rateNowHint}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleDismiss} textColor={colors.textSecondary} disabled={saving}>
            {t.rateLater}
          </Button>
          <Button
            onPress={() => onSave(rating ?? 0, notes.trim())}
            disabled={rating === null || saving}
            loading={saving}
            textColor={colors.primary}
          >
            {t.saveRating}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldHairline,
  },
  title: {
    color: colors.gold,
    textAlign: "right",
  },
  wineName: {
    color: colors.text,
    textAlign: "right",
    marginBottom: 12,
    fontWeight: "600",
  },
  stars: {
    alignItems: "center",
    marginBottom: 16,
  },
  notes: {
    backgroundColor: colors.cardElevated,
  },
  notesOutline: {
    borderRadius: radius.md,
    borderColor: colors.goldHairline,
  },
  notesContent: {
    textAlign: "right",
  },
  hint: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 8,
  },
});
