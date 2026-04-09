import React, { useRef, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  ActivityIndicator,
  HelperText,
  Divider,
  IconButton,
} from "react-native-paper";
import * as XLSX from "xlsx";
import { useAuthStore } from "@stores/authStore";
import { useInventoryStore } from "@stores/inventoryStore";
import * as inventoryService from "@services/inventory";
import { useSnackbarStore } from "@stores/snackbarStore";
import { colors } from "@config/theme";
import { t } from "@i18n/index";
import { WineType } from "@/types/index";
import type { ImportExcelScreenProps } from "@navigation/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  name: string;
  producer?: string;
  type?: WineType;
  vintage?: number;
  grape?: string;
  region?: string;
  country?: string;
  quantity: number;
  purchasePrice?: number;
}

// ─── Column detection helpers ─────────────────────────────────────────────────

const COLUMN_ALIASES: Record<keyof ParsedRow, string[]> = {
  name: ["name", "שם", "wine", "יין", "שם יין"],
  producer: ["producer", "יצרן", "winery", "bodega"],
  type: ["type", "סוג", "wine type", "סוג יין"],
  vintage: ["vintage", "בציר", "year", "שנה"],
  grape: ["grape", "זן", "varietal", "variety", "זן ענב"],
  region: ["region", "אזור", "appellation"],
  country: ["country", "מדינה"],
  quantity: ["quantity", "כמות", "qty", "bottles", "בקבוקים"],
  purchasePrice: ["price", "מחיר", "purchase price", "מחיר רכישה", "cost"],
};

const WINE_TYPE_ALIASES: Record<string, WineType> = {
  red: WineType.Red, אדום: WineType.Red,
  white: WineType.White, לבן: WineType.White,
  "rosé": WineType.Rosé, rose: WineType.Rosé, רוזה: WineType.Rosé,
  sparkling: WineType.Sparkling, מבעבע: WineType.Sparkling,
  dessert: WineType.Dessert, קינוח: WineType.Dessert,
  fortified: WineType.Fortified, מועשר: WineType.Fortified,
  orange: WineType.Orange, כתום: WineType.Orange,
  other: WineType.Other, אחר: WineType.Other,
};

function detectColumn(headers: string[]): Record<keyof ParsedRow, number | undefined> {
  const result = {} as Record<keyof ParsedRow, number | undefined>;
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof ParsedRow, string[]][]) {
    result[field] = headers.findIndex((h) =>
      aliases.some((a) => h.toLowerCase().trim() === a.toLowerCase())
    );
    if (result[field] === -1) result[field] = undefined;
  }
  return result;
}

function parseWineType(raw: string): WineType | undefined {
  if (!raw) return undefined;
  return WINE_TYPE_ALIASES[raw.toLowerCase().trim()];
}

function parseRows(
  rows: unknown[][],
  colMap: Record<keyof ParsedRow, number | undefined>
): ParsedRow[] {
  const result: ParsedRow[] = [];
  for (const row of rows) {
    const get = (field: keyof ParsedRow): string => {
      const idx = colMap[field];
      if (idx === undefined) return "";
      const cell = row[idx];
      return cell != null ? String(cell).trim() : "";
    };

    const name = get("name");
    if (!name) continue;

    const vintageRaw = parseInt(get("vintage"), 10);
    const qtyRaw = parseInt(get("quantity"), 10);
    const priceRaw = parseFloat(get("purchasePrice"));

    result.push({
      name,
      producer: get("producer") || undefined,
      type: parseWineType(get("type")),
      vintage: !isNaN(vintageRaw) && vintageRaw > 1900 ? vintageRaw : undefined,
      grape: get("grape") || undefined,
      region: get("region") || undefined,
      country: get("country") || undefined,
      quantity: !isNaN(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1,
      purchasePrice: !isNaN(priceRaw) && priceRaw > 0 ? priceRaw : undefined,
    });
  }
  return result;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ImportExcelScreen({ navigation }: ImportExcelScreenProps): React.ReactElement {
  const profile = useAuthStore((s) => s.profile);
  const { loadItems } = useInventoryStore();
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const householdId = profile?.householdIds?.[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setParseError("");
    setRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        let workbook: XLSX.WorkBook;
        try {
          workbook = XLSX.read(data, { type: "array" });
        } catch {
          setParseError(t.importExcelBadFormat);
          setParsing(false);
          return;
        }

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

        if (raw.length < 2) {
          setParseError(t.importExcelEmptySheet);
          setParsing(false);
          return;
        }

        const headers = (raw[0] as unknown[]).map((h) => String(h ?? ""));
        const colMap = detectColumn(headers);

        if (colMap.name === undefined) {
          setParseError(
            t.importExcelNoNameColumn.replace("{{headers}}", COLUMN_ALIASES.name.join(", "))
          );
          setParsing(false);
          return;
        }

        const parsed = parseRows(raw.slice(1) as unknown[][], colMap);

        if (parsed.length === 0) {
          setParseError(t.importExcelNoRows);
        } else {
          setRows(parsed);
        }
      } catch (err) {
        setParseError((err as Error).message || t.importExcelBadFormat);
      } finally {
        setParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setParseError(t.importExcelReadError);
      setParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImport = async () => {
    if (!householdId || rows.length === 0) return;
    setImporting(true);
    let imported = 0;
    try {
      // Call the service directly for each row to avoid triggering a full
      // loadItems reload after every single wine (very slow for large imports).
      for (const row of rows) {
        await inventoryService.createWineWithInventory(
          householdId,
          {
            name: row.name,
            type: row.type ?? WineType.Red,
            producer: row.producer,
            region: row.region,
            country: row.country,
            vintage: row.vintage,
            grape: row.grape,
          },
          {
            quantity: row.quantity,
            status: "in_stock",
            purchasePrice: row.purchasePrice,
          }
        );
        imported++;
      }
      // Single reload after all rows are saved
      await loadItems(householdId);
      showSnackbar(t.importExcelSuccess.replace("{{count}}", String(imported)), "success");
      navigation.goBack();
    } catch (e) {
      showSnackbar((e as Error).message || t.error, "error");
      // Still reload to reflect any partially-imported rows
      if (imported > 0) await loadItems(householdId).catch(() => null);
    } finally {
      setImporting(false);
    }
  };

  if (Platform.OS !== "web") {
    return (
      <View style={styles.centeredContainer}>
        <Text variant="bodyLarge" style={styles.webOnlyText}>
          {t.importExcelWebOnly}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* File picker */}
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t.importExcelSubtitle}
      </Text>

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <Button
        mode="outlined"
        icon="file-excel-outline"
        textColor={colors.primary}
        style={styles.chooseBtn}
        onPress={() => fileInputRef.current?.click()}
        disabled={parsing || importing}
      >
        {t.importExcelChooseFile}
      </Button>

      {fileName && (
        <Text variant="labelSmall" style={styles.fileName}>
          {fileName}
        </Text>
      )}

      {parsing && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="labelSmall" style={styles.loadingText}>
            {t.importExcelParsing}
          </Text>
        </View>
      )}

      {parseError ? (
        <HelperText type="error" visible>
          {parseError}
        </HelperText>
      ) : null}

      {/* Review list */}
      {rows.length > 0 && (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleSmall" style={styles.reviewTitle}>
            {t.importExcelReviewTitle}
          </Text>
          <Text variant="labelSmall" style={styles.reviewSubtitle}>
            {t.importExcelReviewSubtitle.replace("{{count}}", String(rows.length))}
          </Text>

          {rows.map((row, idx) => (
            <View key={idx} style={styles.rowCard}>
              <View style={styles.rowInfo}>
                <Text variant="bodyMedium" style={styles.rowName} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text variant="labelSmall" style={styles.rowMeta} numberOfLines={1}>
                  {[
                    row.producer,
                    row.vintage ? String(row.vintage) : null,
                    row.type ? t.wineTypeLabels[row.type] : null,
                    row.quantity > 1 ? `${row.quantity} ${t.bottles}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <IconButton
                icon="close"
                size={18}
                iconColor={colors.error}
                onPress={() => removeRow(idx)}
              />
            </View>
          ))}

          <Button
            mode="contained"
            onPress={handleImport}
            loading={importing}
            disabled={importing}
            buttonColor={colors.primary}
            style={styles.importBtn}
            icon="check"
          >
            {t.importExcelConfirm}
          </Button>
        </>
      )}
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
  centeredContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  webOnlyText: {
    color: colors.textSecondary,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: "right",
    lineHeight: 22,
  },
  chooseBtn: {
    borderColor: colors.primary,
    marginBottom: 8,
  },
  fileName: {
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
    justifyContent: "flex-end",
  },
  loadingText: {
    color: colors.textSecondary,
  },
  divider: {
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  reviewTitle: {
    color: colors.text,
    marginBottom: 4,
    textAlign: "right",
  },
  reviewSubtitle: {
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: "right",
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    color: colors.text,
    textAlign: "right",
    fontWeight: "600",
  },
  rowMeta: {
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  importBtn: {
    marginTop: 16,
  },
});
