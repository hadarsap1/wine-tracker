import { WineType } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedImportRow {
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

// ─── Column detection ─────────────────────────────────────────────────────────

export const COLUMN_ALIASES: Record<keyof ParsedImportRow, string[]> = {
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

export function detectColumn(
  headers: string[]
): Record<keyof ParsedImportRow, number | undefined> {
  const result = {} as Record<keyof ParsedImportRow, number | undefined>;
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof ParsedImportRow, string[]][]) {
    result[field] = headers.findIndex((h) =>
      aliases.some((a) => h.toLowerCase().trim() === a.toLowerCase())
    );
    if (result[field] === -1) result[field] = undefined;
  }
  return result;
}

export function parseWineType(raw: string): WineType | undefined {
  if (!raw) return undefined;
  return WINE_TYPE_ALIASES[raw.toLowerCase().trim()];
}

export function parseImportRows(
  rows: unknown[][],
  colMap: Record<keyof ParsedImportRow, number | undefined>
): ParsedImportRow[] {
  const result: ParsedImportRow[] = [];
  for (const row of rows) {
    const get = (field: keyof ParsedImportRow): string => {
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

// ─── CSV parsing (RFC-4180-ish: quotes, escaped quotes, CRLF) ─────────────────

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip BOM
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty trailing rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
