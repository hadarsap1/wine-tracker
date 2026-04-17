import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from "react-native";
import { TextInput, Button, SegmentedButtons, Text, Dialog, Portal } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import { useSnackbarStore } from "@stores/snackbarStore";
import * as vivinoService from "@services/vivino";
import * as storageService from "@services/storage";
import * as inventoryService from "@services/inventory";
import { analyzeLabelWithAI, detectText } from "@services/vision";
import { parseLabelText } from "@/utils/parseLabelText";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType } from "@/types/index";
import type { VivinoData } from "@/types/index";
import VivinoBadge from "@components/inventory/VivinoBadge";
import StorageLocationPicker from "@components/inventory/StorageLocationPicker";
import type { ScanReviewScreenProps } from "@navigation/types";

const WINE_TYPES = Object.values(WineType);
const WINE_TYPE_BUTTONS = WINE_TYPES.map((type) => ({
  value: type,
  label: t.wineTypeLabels[type] ?? type,
}));

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#1b5e36",
  medium: "#7a5c00",
  low: "#555570",
};

export default function ScanReviewScreen({
  route,
  navigation,
}: ScanReviewScreenProps) {
  const { parsedData, imageUri, rawText } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const { addWine, items } = useInventoryStore();
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [saving, setSaving] = useState(false);

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
  const [selectedSlot, setSelectedSlot] = useState<{
    unitId: string;
    row: number;
    col: number;
    unitName: string;
  } | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [showRawText, setShowRawText] = useState(false);
  const [saveConfirmVisible, setSaveConfirmVisible] = useState(false);
  const [vivinoData, setVivinoData] = useState<VivinoData | null | undefined>(undefined);
  const [loadingVivino, setLoadingVivino] = useState(false);
  const vivinoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scanningBack, setScanningBack] = useState(false);

  const householdId = profile?.householdIds?.[0];

  // What fields Vivino can supply that are currently empty
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

  // Re-fetch Vivino whenever name, producer, or vintage changes (debounced 800ms)
  React.useEffect(() => {
    const trimmed = name.trim();

    // Reset badge immediately so stale data doesn't linger
    setVivinoData(undefined);
    setLoadingVivino(false);

    if (trimmed.length < 3) return;

    let cancelled = false;

    if (vivinoDebounceRef.current) clearTimeout(vivinoDebounceRef.current);

    vivinoDebounceRef.current = setTimeout(() => {
      const query = [producer.trim(), trimmed].filter(Boolean).join(" ").trim();
      const searchUrl = `https://www.vivino.com/search/wines?q=${encodeURIComponent(trimmed)}`;
      setLoadingVivino(true);
      vivinoService
        .fetchVivinoData(query, vintage ? parseInt(vintage, 10) || undefined : undefined)
        .then((data) => {
          if (!cancelled) {
            setVivinoData(data ? { ...data, wineUrl: data.wineUrl ?? searchUrl } : null);
            setLoadingVivino(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setVivinoData(null);
            setLoadingVivino(false);
          }
        });
    }, 800);

    return () => {
      cancelled = true;
      if (vivinoDebounceRef.current) clearTimeout(vivinoDebounceRef.current);
    };
  }, [name, producer, vintage]);

  const handleScanBack = async () => {
    let uri: string | null = null;

    if (Platform.OS === "web") {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false, mediaTypes: ["images"] });
      if (result.canceled || !result.assets[0]) return;
      uri = result.assets[0].uri;
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showSnackbar(t.cameraPermissionMsg, "info");
        const galleryResult = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false, mediaTypes: ["images"] });
        if (galleryResult.canceled || !galleryResult.assets[0]) return;
        uri = galleryResult.assets[0].uri;
      } else {
        const cameraResult = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
        if (cameraResult.canceled || !cameraResult.assets[0]) return;
        uri = cameraResult.assets[0].uri;
      }
    }

    setScanningBack(true);
    try {
      let backData;
      try {
        backData = await analyzeLabelWithAI(uri);
      } catch {
        const { fullText, error: ocrError } = await detectText(uri);
        if (ocrError) throw new Error(ocrError);
        backData = parseLabelText(fullText);
      }

      // Merge: only fill fields that are currently empty
      let filled = 0;
      if (!name.trim() && backData.name)     { setName(backData.name);               filled++; }
      if (!producer.trim() && backData.producer) { setProducer(backData.producer);   filled++; }
      if (!vintage.trim() && backData.vintage)   { setVintage(String(backData.vintage)); filled++; }
      if (!grape.trim() && backData.grape)   { setGrape(backData.grape);             filled++; }
      if (!region.trim() && backData.region) { setRegion(backData.region);           filled++; }
      if (!country.trim() && backData.country) { setCountry(backData.country);       filled++; }

      showSnackbar(
        filled > 0 ? t.backScanFilled(filled) : t.backScanNoNew,
        filled > 0 ? "success" : "info",
      );
    } catch {
      showSnackbar(t.scanError, "error");
    } finally {
      setScanningBack(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError(t.wineNameRequired);
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      setQuantityError(t.invalidQuantityMsg);
      return;
    }
    if (parsedData.confidence === "low") {
      setSaveConfirmVisible(true);
      return;
    }
    void doSave();
  };

  const doSave = async () => {
    if (saving) return;
    setSaveConfirmVisible(false);
    const qty = parseInt(quantity, 10);
    if (!householdId) {
      showSnackbar(t.noHousehold, "error");
      return;
    }

    setSaving(true);
    try {
      const wineId = await addWine(
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
          vivinoData: vivinoData ?? undefined,
        },
        {
          quantity: qty,
          purchasePrice: purchasePrice
            ? parseFloat(purchasePrice) || undefined
            : undefined,
          storageUnitId: selectedSlot?.unitId,
          storageRow: selectedSlot?.row,
          storageCol: selectedSlot?.col,
        }
      );
      showSnackbar(t.addedToCellar, "success");
      navigation.popToTop();
      // Upload label image in background after navigation (best-effort)
      if (imageUri && !imageUri.startsWith("https://")) {
        storageService.uploadImage(imageUri, storageService.wineLabelPath(householdId, wineId))
          .then((downloadUrl) =>
            inventoryService.updateWine(householdId, wineId, { imageUrl: downloadUrl })
          )
          .catch((uploadErr) => {
            console.warn('[ScanReview] label image upload failed:', uploadErr);
          });
      }
    } catch (e) {
      console.error('[ScanReview] save failed:', e);
      showSnackbar(t.failedToCreateWine, "error");
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
        {/* Confidence Banner */}
        <View
          style={[
            styles.confidenceBanner,
            { backgroundColor: CONFIDENCE_COLORS[parsedData.confidence] },
          ]}
        >
          <Text variant="labelMedium" style={styles.confidenceText}>
            {parsedData.confidence === "high"
              ? t.confidenceHigh
              : parsedData.confidence === "medium"
              ? t.confidenceMedium
              : t.confidenceLow}
          </Text>
        </View>

        {/* Vivino Rating */}
        {(loadingVivino || vivinoData !== undefined) && (
          <View style={styles.vivinoRow}>
            <VivinoBadge
              data={vivinoData}
              loading={loadingVivino}
              searchUrl={name.trim().length >= 3 ? `https://www.vivino.com/search/wines?q=${encodeURIComponent(name.trim())}` : undefined}
            />
            {vivinoData?.wineName && (
              <Text variant="labelSmall" style={styles.vivinoMatchName}>
                {t.vivinoMatched}: {vivinoData.wineName}
              </Text>
            )}
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

        {/* Photo Thumbnail + back-scan button */}
        <Image source={{ uri: imageUri }} style={styles.thumbnail} />
        <Button
          mode="outlined"
          onPress={() => void handleScanBack()}
          loading={scanningBack}
          disabled={scanningBack}
          icon="camera-flip-outline"
          textColor={colors.textSecondary}
          style={styles.scanBackButton}
          compact
        >
          {t.scanBackLabel}
        </Button>

        {/* Raw OCR Text Toggle — only shown when there is actual text */}
        {rawText.trim().length > 0 && (
          <>
            <Pressable onPress={() => setShowRawText(!showRawText)}>
              <Text variant="labelMedium" style={styles.rawTextToggle}>
                {showRawText ? t.hideRawText : t.showRawText}
              </Text>
            </Pressable>
            {showRawText && (
              <View style={styles.rawTextBox}>
                <Text variant="bodySmall" style={styles.rawText}>
                  {rawText}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Form Fields */}
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
          showsHorizontalScrollIndicator={Platform.OS === "web"}
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
            onChangeText={(v) => {
              setQuantity(v);
              if (quantityError) setQuantityError("");
            }}
            error={!!quantityError}
            keyboardType="numeric"
            style={[styles.input, styles.flex]}
            contentStyle={styles.inputContent}
            textColor={colors.text}
          />
          <View style={styles.gap} />
          <TextInput
            label={t.price}
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="decimal-pad"
            style={[styles.input, styles.flex]}
            contentStyle={styles.inputContent}
            textColor={colors.text}
          />
        </View>
        {quantityError ? (
          <Text variant="labelSmall" style={styles.errorText}>
            {quantityError}
          </Text>
        ) : null}
        {/* Storage slot picker */}
        <Text variant="labelLarge" style={styles.sectionLabel}>
          {t.storageLocation}
        </Text>
        <View style={styles.slotRow}>
          <Text style={styles.slotValue}>
            {selectedSlot
              ? `${selectedSlot.unitName} — ${t.storageRow} ${selectedSlot.row + 1}, ${t.storageCol} ${selectedSlot.col + 1}`
              : t.slotEmpty}
          </Text>
          {selectedSlot && (
            <Button
              mode="text"
              compact
              textColor={colors.error}
              onPress={() => setSelectedSlot(null)}
            >
              {t.clearSlot}
            </Button>
          )}
          <Button
            mode="outlined"
            compact
            textColor={colors.primary}
            style={styles.chooseSlotButton}
            onPress={() => setPickerVisible(true)}
          >
            {t.chooseSlot}
          </Button>
        </View>

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
          onPress={handleSave}
          loading={saving}
          disabled={saving || scanningBack}
          style={styles.submitButton}
          buttonColor={colors.primary}
        >
          {t.saveToCellar}
        </Button>
      </ScrollView>

      <Portal>
        <Dialog
          visible={saveConfirmVisible}
          onDismiss={() => setSaveConfirmVisible(false)}
          style={{ backgroundColor: colors.card }}
        >
          <Dialog.Title style={{ color: colors.text }}>{t.lowConfidenceSaveTitle}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{t.lowConfidenceSaveMsg}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSaveConfirmVisible(false)} textColor={colors.textSecondary}>{t.cancel}</Button>
            <Button onPress={() => void doSave()} textColor={colors.primary}>{t.saveToCellar}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <StorageLocationPicker
        visible={pickerVisible}
        householdId={householdId ?? ""}
        currentSlot={
          selectedSlot
            ? {
                unitId: selectedSlot.unitId,
                row: selectedSlot.row,
                col: selectedSlot.col,
              }
            : null
        }
        inventoryItems={items}
        onSelect={(s) => {
          setSelectedSlot(s);
          setPickerVisible(false);
        }}
        onClear={() => {
          setSelectedSlot(null);
          setPickerVisible(false);
        }}
        onDismiss={() => setPickerVisible(false)}
      />
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
  vivinoRow: {
    marginBottom: 12,
    gap: 6,
  },
  vivinoMatchName: {
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  autoFillBtn: {
    borderColor: colors.primary,
    alignSelf: "flex-start",
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
  scanBackButton: {
    alignSelf: "flex-end",
    marginBottom: 12,
    borderColor: colors.border,
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
    marginEnd: 4,
    textAlign: "right",
  },
  submitButton: {
    marginTop: 16,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  slotValue: {
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    fontSize: 14,
  },
  chooseSlotButton: {
    borderColor: colors.primary,
  },
});
