import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { TextInput, Button, SegmentedButtons, Text } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { colors } from "@config/theme";
import { WineType } from "@/types/index";
import type { AddWineScreenProps } from "@navigation/types";

const WINE_TYPES = Object.values(WineType);
const WINE_TYPE_BUTTONS = WINE_TYPES.map((t) => ({ value: t, label: t }));

export default function AddWineScreen({ navigation }: AddWineScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { addWine, loading } = useInventoryStore();

  const [name, setName] = useState("");
  const [type, setType] = useState<WineType>(WineType.Red);
  const [producer, setProducer] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [vintage, setVintage] = useState("");
  const [grape, setGrape] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState("");

  const householdId = profile?.householdIds?.[0];

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Wine name is required");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return;
    }
    if (!householdId) {
      Alert.alert("Error", "No household found. Please sign out and sign in again.");
      return;
    }

    try {
      await addWine(
        householdId,
        {
          name: name.trim(),
          type,
          producer: producer.trim() || undefined,
          region: region.trim() || undefined,
          country: country.trim() || undefined,
          vintage: vintage ? parseInt(vintage, 10) || undefined : undefined,
          grape: grape.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        {
          quantity: qty,
          location: location.trim() || undefined,
          purchasePrice: purchasePrice
            ? parseFloat(purchasePrice) || undefined
            : undefined,
        }
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", (e as Error).message || "Failed to add wine. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <TextInput
          label="Wine Name *"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError("");
          }}
          error={!!nameError}
          style={styles.input}
          textColor={colors.text}
        />
        {nameError ? (
          <Text variant="labelSmall" style={styles.errorText}>
            {nameError}
          </Text>
        ) : null}

        <Text variant="labelLarge" style={styles.sectionLabel}>
          Wine Type
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeScroll}
        >
          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as WineType)}
            buttons={WINE_TYPE_BUTTONS}
            density="small"
          />
        </ScrollView>

        <TextInput
          label="Producer"
          value={producer}
          onChangeText={setProducer}
          style={styles.input}
          textColor={colors.text}
        />
        <View style={styles.row}>
          <TextInput
            label="Region"
            value={region}
            onChangeText={setRegion}
            style={[styles.input, styles.flex]}
            textColor={colors.text}
          />
          <View style={styles.gap} />
          <TextInput
            label="Country"
            value={country}
            onChangeText={setCountry}
            style={[styles.input, styles.flex]}
            textColor={colors.text}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            label="Vintage"
            value={vintage}
            onChangeText={setVintage}
            keyboardType="numeric"
            style={[styles.input, styles.flex]}
            textColor={colors.text}
          />
          <View style={styles.gap} />
          <TextInput
            label="Grape"
            value={grape}
            onChangeText={setGrape}
            style={[styles.input, styles.flex]}
            textColor={colors.text}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            style={[styles.input, styles.flex]}
            textColor={colors.text}
          />
          <View style={styles.gap} />
          <TextInput
            label="Price"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="decimal-pad"
            style={[styles.input, styles.flex]}
            textColor={colors.text}
          />
        </View>
        <TextInput
          label="Storage Location"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          textColor={colors.text}
        />
        <TextInput
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.input}
          textColor={colors.text}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          buttonColor={colors.primary}
        >
          Add Wine
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.card,
  },
  sectionLabel: {
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  typeScroll: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  flex: {
    flex: 1,
  },
  gap: {
    width: 12,
  },
  errorText: {
    color: colors.error,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 16,
  },
});
