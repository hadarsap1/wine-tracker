import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Pressable,
} from "react-native";
import { TextInput, Button, SegmentedButtons, Text } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { colors } from "@config/theme";
import { WineType } from "@/types/index";
import type { ScanReviewScreenProps } from "@navigation/types";

const WINE_TYPES = Object.values(WineType);
const WINE_TYPE_BUTTONS = WINE_TYPES.map((t) => ({ value: t, label: t }));

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#2e7d32",
  medium: "#e65100",
  low: "#616161",
};

export default function ScanReviewScreen({
  route,
  navigation,
}: ScanReviewScreenProps) {
  const { parsedData, imageUri, rawText } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const { addWine, loading } = useInventoryStore();

  const [name, setName] = useState(parsedData.name ?? "");
  const [type, setType] = useState<WineType>(parsedData.type ?? WineType.Red);
  const [producer, setProducer] = useState(parsedData.producer ?? "");
  const [region, setRegion] = useState(parsedData.region ?? "");
  const [country, setCountry] = useState(parsedData.country ?? "");
  const [vintage, setVintage] = useState(
    parsedData.vintage ? String(parsedData.vintage) : ""
  );
  const [grape, setGrape] = useState(parsedData.grape ?? "");
  const [quantity, setQuantity] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState("");
  const [showRawText, setShowRawText] = useState(false);

  const householdId = profile?.householdIds?.[0];

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("Wine name is required");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) return;
    if (!householdId) return;

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

    Alert.alert("Success", "Wine added to your cellar!", [
      { text: "OK", onPress: () => navigation.popToTop() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Confidence Banner */}
        <View
          style={[
            styles.confidenceBanner,
            { backgroundColor: CONFIDENCE_COLORS[parsedData.confidence] },
          ]}
        >
          <Text variant="labelMedium" style={styles.confidenceText}>
            {parsedData.confidence === "high"
              ? "High confidence - most fields detected"
              : parsedData.confidence === "medium"
              ? "Medium confidence - some fields detected"
              : "Low confidence - please review all fields"}
          </Text>
        </View>

        {/* Photo Thumbnail */}
        <Image source={{ uri: imageUri }} style={styles.thumbnail} />

        {/* Raw OCR Text Toggle */}
        <Pressable onPress={() => setShowRawText(!showRawText)}>
          <Text variant="labelMedium" style={styles.rawTextToggle}>
            {showRawText ? "Hide" : "Show"} raw OCR text
          </Text>
        </Pressable>
        {showRawText && (
          <View style={styles.rawTextBox}>
            <Text variant="bodySmall" style={styles.rawText}>
              {rawText}
            </Text>
          </View>
        )}

        {/* Form Fields */}
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
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          buttonColor={colors.primary}
        >
          Save to Cellar
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
  confidenceBanner: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  confidenceText: {
    color: "#ffffff",
    textAlign: "center",
  },
  thumbnail: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "cover",
  },
  rawTextToggle: {
    color: colors.primary,
    marginBottom: 8,
    textDecorationLine: "underline",
  },
  rawTextBox: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  rawText: {
    color: colors.textSecondary,
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
