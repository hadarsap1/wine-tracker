import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { TextInput, Button, SegmentedButtons, Text, HelperText } from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType, type InventoryStatus } from "@/types/index";
import type { AddWineScreenProps } from "@navigation/types";

const WINE_TYPES = Object.values(WineType);
const WINE_TYPE_BUTTONS = WINE_TYPES.map((type) => ({
  value: type,
  label: t.wineTypeLabels[type] ?? type,
}));

const STATUS_BUTTONS = [
  { value: "in_stock", label: t.atHomeNow },
  { value: "on_the_way", label: t.onTheWayOption },
];

export default function AddWineScreen({ navigation, route }: AddWineScreenProps) {
  const profile = useAuthStore((s) => s.profile);
  const { addWine } = useInventoryStore();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const prefill = route.params;
  const [name, setName] = useState(prefill?.prefillName ?? "");
  const [type, setType] = useState<WineType>((prefill?.prefillType as WineType) ?? WineType.Red);
  const [status, setStatus] = useState<InventoryStatus>("in_stock");
  const [producer, setProducer] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [vintage, setVintage] = useState("");
  const [grape, setGrape] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [vintageError, setVintageError] = useState("");

  const householdId = profile?.householdIds?.[0];

  const handleSubmit = async () => {
    let valid = true;
    if (!name.trim()) { setNameError(t.wineNameRequired); valid = false; }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) { setQuantityError(t.invalidQuantityMsg); valid = false; }
    if (vintage) {
      const yr = parseInt(vintage, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(yr) || yr < 1900 || yr > currentYear) { setVintageError(t.invalidVintageMsg); valid = false; }
    }
    if (!valid) return;
    if (!householdId) {
      showSnackbar(t.noHousehold, "error");
      return;
    }

    setSaving(true);
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
          status,
          location: location.trim() || undefined,
          purchasePrice: purchasePrice
            ? parseFloat(purchasePrice) || undefined
            : undefined,
        }
      );
      navigation.goBack();
    } catch (e) {
      showSnackbar((e as Error).message || t.failedToCreateWine, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <TextInput
          label={t.wineName}
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError("");
          }}
          error={!!nameError}
          style={styles.input}
          contentStyle={styles.inputContent}
          textColor={colors.text}
        />
        {nameError ? (
          <Text variant="labelSmall" style={styles.errorText}>
            {nameError}
          </Text>
        ) : null}

        <Text variant="labelLarge" style={styles.sectionLabel}>
          {t.wineType}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeScroll}
          contentContainerStyle={styles.typeScrollContent}
        >
          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as WineType)}
            buttons={WINE_TYPE_BUTTONS}
            density="small"
          />
        </ScrollView>

        <Text variant="labelLarge" style={styles.sectionLabel}>
          {t.wineStatus}
        </Text>
        <SegmentedButtons
          value={status}
          onValueChange={(v) => setStatus(v as InventoryStatus)}
          buttons={STATUS_BUTTONS}
          style={styles.statusButtons}
        />

        <TextInput
          label={t.producer}
          value={producer}
          onChangeText={setProducer}
          style={styles.input}
          contentStyle={styles.inputContent}
          textColor={colors.text}
        />
        <View style={styles.row}>
          <TextInput
            label={t.region}
            value={region}
            onChangeText={setRegion}
            style={[styles.input, styles.flex]}
            contentStyle={styles.inputContent}
            textColor={colors.text}
          />
          <View style={styles.gap} />
          <TextInput
            label={t.country}
            value={country}
            onChangeText={setCountry}
            style={[styles.input, styles.flex]}
            contentStyle={styles.inputContent}
            textColor={colors.text}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            label={t.vintage}
            value={vintage}
            onChangeText={(v) => { setVintage(v); if (vintageError) setVintageError(""); }}
            keyboardType="numeric"
            error={!!vintageError}
            style={[styles.input, styles.flex]}
            contentStyle={styles.inputContent}
            textColor={colors.text}
          />
          <View style={styles.gap} />
          <TextInput
            label={t.grape}
            value={grape}
            onChangeText={setGrape}
            style={[styles.input, styles.flex]}
            contentStyle={styles.inputContent}
            textColor={colors.text}
          />
        </View>
        <HelperText type="error" visible={!!vintageError} style={styles.helperText}>
          {vintageError}
        </HelperText>
        <View style={styles.row}>
          <TextInput
            label={t.quantity}
            value={quantity}
            onChangeText={(v) => { setQuantity(v); if (quantityError) setQuantityError(""); }}
            keyboardType="numeric"
            error={!!quantityError}
            style={[styles.input, styles.flex]}
            contentStyle={styles.inputContent}
            textColor={colors.text}
          />
          <View style={styles.gap} />
          <TextInput
            label={t.purchasePrice}
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="decimal-pad"
            style={[styles.input, styles.flex]}
            contentStyle={styles.inputContent}
            textColor={colors.text}
          />
        </View>
        <HelperText type="error" visible={!!quantityError} style={styles.helperText}>
          {quantityError}
        </HelperText>
        <TextInput
          label={t.storageLocation}
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          contentStyle={styles.inputContent}
          textColor={colors.text}
        />
        <TextInput
          label={t.notes}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.input}
          contentStyle={styles.inputContent}
          textColor={colors.text}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={saving}
          disabled={saving}
          style={styles.submitButton}
          buttonColor={colors.primary}
        >
          {t.addWine}
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
  inputContent: {
    textAlign: "right",
  },
  sectionLabel: {
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
    textAlign: "right",
  },
  typeScroll: {
    marginBottom: 16,
  },
  typeScrollContent: {
    flexDirection: "row-reverse",
  },
  statusButtons: {
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
    textAlign: "right",
  },
  submitButton: {
    marginTop: 16,
  },
  helperText: {
    marginTop: -8,
    marginBottom: 4,
    textAlign: "right",
  },
});
