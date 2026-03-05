import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { colors } from "@config/theme";
import type { EditProfileScreenProps } from "@navigation/types";

export default function EditProfileScreen({
  navigation,
}: EditProfileScreenProps) {
  const { profile, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Display name cannot be empty");
      return;
    }
    if (trimmed === profile?.displayName) {
      navigation.goBack();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateProfile({ displayName: trimmed });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Display Name"
        value={displayName}
        onChangeText={(text) => {
          setDisplayName(text);
          if (error) setError(null);
        }}
        mode="outlined"
        style={styles.input}
        textColor={colors.text}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
        autoFocus
      />
      {error ? (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving || !displayName.trim()}
        style={styles.saveButton}
        buttonColor={colors.primary}
        textColor={colors.onPrimary}
      >
        Save
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  input: {
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  error: {
    color: colors.error,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 8,
  },
});
