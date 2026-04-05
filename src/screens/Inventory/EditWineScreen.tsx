import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  TextInput,
  Button,
  SegmentedButtons,
  Text,
  HelperText,
  ActivityIndicator,
} from "react-native-paper";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import * as inventoryService from "@services/inventory";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType } from "@/types/index";
import type { AppWine } from "@/types/index";
import type { EditWineScreenProps } from "@navigation/types";

const WINE_TYPES = Object.values(WineType);
const WINE_TYPE_BUTTONS = WINE_TYPES.map((type) => ({
  value: type,
  label: t.wineTypeLabels[type] ?? type,
}));

export default function EditWineScreen({
  route,
  navigation,
}: EditWineScreenProps) {
  const { wineId, itemId } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const { items, updateWine, updateItem, loading } = useInventoryStore();

  const [wine, setWine] = useState<AppWine | null>(null);
  const [loadingWine, setLoadingWine] = useState(true);

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
  const [quantityError, setQuantityError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const householdId = profile?.householdIds?.[0];
  const item = items.find((i) => i.id === itemId);

  const fetchWine = useCallback(async () => {
    if (!householdId) return;
    setLoadingWine(true);
    try {
      const w = await inventoryService.getWine(householdId, wineId);
      if (w) {
        const appWine = {
          ...w,
          createdAt: w.createdAt?.toDate?.() ?? new Date(),
          updatedAt: w.updatedAt?.toDate?.() ?? new Date(),
        } as AppWine;
        setWine(appWine);
        setName(appWine.name);
        setType(appWine.type);
        setProducer(appWine.producer ?? "");
        setRegion(appWine.region ?? "");
        setCountry(appWine.country ?? "");
        setVintage(appWine.vintage ? String(appWine.vintage) : "");
        setGrape(appWine.grape ?? "");
        setNotes(appWine.notes ?? "");
      }
      if (item) {
        setQuantity(String(item.quantity));
        setLocation(item.location ?? "");
        setPurchasePrice(
          item.purchasePrice != null ? String(item.purchasePrice) : ""
        );
      }
    } catch (e) {
      setSubmitError((e as Error).message || t.error);
    } finally {
      setLoadingWine(false);
    }
  }, [householdId, wineId, item]);

  useEffect(() => {
    fetchWine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    let valid = true;
    if (!name.trim()) { setNameError(t.wineNameRequired); valid = false; }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) { setQuantityError(t.invalidQuantityMsg); valid = false; }
    if (!valid || !householdId) return;

    setSubmitError("");
    try {
      await updateWine(
        householdId,
        wineId,
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
        itemId
      );

      await updateItem(householdId, itemId, {
        quantity: qty,
        location: location.trim() || undefined,
        purchasePrice: purchasePrice
          ? parseFloat(purchasePrice) || undefined
          : undefined,
      });

      navigation.goBack();
    } catch (e) {
      setSubmitError((e as Error).message || t.failedToCreateWine);
    }
  };

  if (loadingWine) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        >
          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as WineType)}
            buttons={WINE_TYPE_BUTTONS}
            density="small"
          />
        </ScrollView>

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
            onChangeText={setVintage}
            keyboardType="numeric"
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
        <HelperText type="error" visible={!!quantityError}>
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

        {submitError ? (
          <HelperText type="error" visible>
            {submitError}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          buttonColor={colors.primary}
        >
          {t.saveChanges}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
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
