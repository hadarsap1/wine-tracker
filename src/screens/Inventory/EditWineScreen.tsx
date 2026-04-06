import React, { useCallback, useEffect, useRef, useState } from "react";
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
import * as vivinoService from "@services/vivino";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType, type VivinoData } from "@/types/index";
import type { AppWine } from "@/types/index";
import VivinoBadge from "@components/inventory/VivinoBadge";
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

  const showSnackbar = useSnackbarStore((s) => s.show);

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

  // Vivino
  const [vivinoData, setVivinoData] = useState<VivinoData | null | undefined>(undefined);
  const [loadingVivino, setLoadingVivino] = useState(false);
  const vivinoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFetchDone = useRef(false);

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
        // Use existing Vivino data from the wine doc as the initial badge state
        if (appWine.vivinoData) {
          setVivinoData(appWine.vivinoData as VivinoData);
        }
      }
      if (item) {
        setQuantity(String(item.quantity));
        setLocation(item.location ?? "");
        setPurchasePrice(
          item.purchasePrice != null ? String(item.purchasePrice) : ""
        );
      }
      initialFetchDone.current = true;
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

  // Live Vivino fetch — debounced when name/producer/vintage changes after initial load
  useEffect(() => {
    if (!initialFetchDone.current) return; // skip until wine is loaded
    const trimmed = name.trim();
    setVivinoData(undefined);
    setLoadingVivino(false);
    if (trimmed.length < 3) return;

    let cancelled = false;
    if (vivinoDebounceRef.current) clearTimeout(vivinoDebounceRef.current);
    vivinoDebounceRef.current = setTimeout(() => {
      const query = [producer.trim(), trimmed].filter(Boolean).join(" ").trim();
      const vintageYear = vintage ? parseInt(vintage, 10) || undefined : undefined;
      setLoadingVivino(true);
      vivinoService
        .fetchVivinoData(query, vintageYear)
        .then((data) => {
          if (cancelled) return;
          setVivinoData(data ?? null);
          setLoadingVivino(false);
        })
        .catch(() => {
          if (!cancelled) { setVivinoData(null); setLoadingVivino(false); }
        });
    }, 800);
    return () => {
      cancelled = true;
      if (vivinoDebounceRef.current) clearTimeout(vivinoDebounceRef.current);
    };
  }, [name, producer, vintage]);

  const vivinoCanFill =
    vivinoData &&
    ((!producer && vivinoData.producerName) ||
      (!region && vivinoData.region) ||
      (!country && vivinoData.country));

  const handleVivinoAutoFill = () => {
    if (!vivinoData) return;
    if (!producer && vivinoData.producerName) setProducer(vivinoData.producerName);
    if (!region && vivinoData.region) setRegion(vivinoData.region);
    if (!country && vivinoData.country) setCountry(vivinoData.country);
    if (vivinoData.wineType) {
      const mapped = vivinoData.wineType as WineType;
      if (Object.values(WineType).includes(mapped)) setType(mapped);
    }
    showSnackbar(t.vivinoAutoFilled, "success");
  };

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

        {/* Vivino live badge */}
        {(loadingVivino || vivinoData !== undefined) && (
          <View style={styles.vivinoRow}>
            <VivinoBadge data={vivinoData} loading={loadingVivino} />
            {vivinoCanFill && (
              <Button
                mode="outlined"
                onPress={handleVivinoAutoFill}
                icon="auto-fix"
                textColor={colors.primary}
                style={styles.autoFillBtn}
                compact
              >
                {t.autoFillFromVivino}
              </Button>
            )}
          </View>
        )}

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
  vivinoRow: {
    marginBottom: 16,
    gap: 6,
  },
  autoFillBtn: {
    borderColor: colors.primary,
    alignSelf: "flex-start",
  },
  submitButton: {
    marginTop: 16,
  },
});
