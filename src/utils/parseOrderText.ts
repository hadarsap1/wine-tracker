import { WineType } from "@/types/index";

export interface ParsedOrderItem {
  name: string;
  quantity: number;
  price?: number;
  vintage?: number;
  type?: WineType;
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

const VINTAGE_RE = /\b(19|20)\d{2}\b/;

// "85.00 ₪" / "₪85.00" / "$12.99" / "12.99€" — handles space between number and symbol
const PRICE_RE = /(?:[$₪€£¥]|USD|ILS|EUR)\s*[\d,.]+|[\d,.]+\s*(?:[$₪€£¥])/;

// Standalone "qty × value [symbol?]" line — the × is the Unicode multiplication sign or x
const TIMES_LINE_RE = /^(\d{1,3})\s*[×x]\s*([\d,.]+)\s*([$₪€£¥]?)\s*$/i;

// Inline quantity on single-line items: "x3", "3x", "3 bottles", "qty: 3"
const INLINE_QTY_RE =
  /(?:x\s*(\d+)|(\d+)\s*x|(\d+)\s*(?:bottles?|btl|יח'|יחידות?|בקבוקים?)|qty[:\s]+(\d+))/i;

// Hebrew date prefix like "מרץ17 - " or "אפר1 - " at the start of a wine-name line
const HEBREW_DATE_PREFIX_RE = /^[\u0590-\u05FF]{2,4}\d{1,2}\s*[-–—]\s*/;

const SKIP_PATTERNS = [
  /^(total|סה"כ|subtotal|shipping|משלוח|vat|מע"מ|discount|הנחה|taxes?|order\s*#|הזמנה\s*#|invoice|חשבונית|receipt|קבלה|thank\s*you|תודה|confirm|אישור|view\s*your|contact|or\s+contact)/i,
  /^\d+[.:]\d+$/, // pure time / decimals
  /^[-=*_]{3,}$/, // dividers
];

const TYPE_KEYWORDS: Record<string, WineType> = {
  sparkling: WineType.Sparkling,
  champagne: WineType.Sparkling,
  prosecco: WineType.Sparkling,
  cava: WineType.Sparkling,
  brut: WineType.Sparkling,
  rosé: WineType.Rosé,
  rose: WineType.Rosé,
  dessert: WineType.Dessert,
  port: WineType.Fortified,
  sherry: WineType.Fortified,
  white: WineType.White,
  blanc: WineType.White,
  bianco: WineType.White,
  לבן: WineType.White,
  red: WineType.Red,
  rouge: WineType.Red,
  rosso: WineType.Red,
  אדום: WineType.Red,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractType(text: string): WineType | undefined {
  const lower = text.toLowerCase();
  for (const [kw, type] of Object.entries(TYPE_KEYWORDS)) {
    if (lower.includes(kw)) return type;
  }
  return undefined;
}

function extractVintage(text: string): number | undefined {
  const m = text.match(VINTAGE_RE);
  if (!m) return undefined;
  const year = Number(m[0]);
  return year >= 1900 && year <= new Date().getFullYear() ? year : undefined;
}

function extractQuantity(text: string): number {
  const m = text.match(INLINE_QTY_RE);
  if (!m) return 1;
  const raw = m[1] ?? m[2] ?? m[3] ?? m[4];
  const qty = parseInt(raw, 10);
  return isNaN(qty) || qty < 1 ? 1 : Math.min(qty, 999);
}

function extractPrice(text: string): number | undefined {
  const m = text.match(PRICE_RE);
  if (!m) return undefined;
  // Remove currency symbols, spaces, and thousands-separator commas; keep decimal point
  const cleaned = m[0].replace(/[^0-9.,]/g, "").replace(/,(?=\d{3}(?:[.,]|$))/g, "").replace(",", ".");
  const price = parseFloat(cleaned);
  return isNaN(price) ? undefined : price;
}

function stripDatePrefix(text: string): string {
  return text.replace(HEBREW_DATE_PREFIX_RE, "").trim();
}

function cleanName(text: string): string {
  return text
    .replace(VINTAGE_RE, "")
    .replace(INLINE_QTY_RE, "")
    .replace(PRICE_RE, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-•·*\d.]+/, "")
    .replace(/[\s\-]+$/, "")
    .trim();
}

function looksLikeWine(line: string): boolean {
  if (line.length < 3) return false;
  if (SKIP_PATTERNS.some((p) => p.test(line))) return false;
  // Must contain at least one letter (Latin or Hebrew)
  if (!/[a-zA-Z\u0590-\u05FF]/.test(line)) return false;
  if (/^(wine|יין|red|white|type|name|price|qty|total)$/i.test(line.trim())) return false;
  return true;
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseOrderText(rawText: string): ParsedOrderItem[] {
  const lines = rawText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  const items: ParsedOrderItem[] = [];
  const consumed = new Set<number>();
  const currentYear = new Date().getFullYear();

  // ── Pass 1: multi-line grouped items ──────────────────────────────────────
  // Pattern: [name line]  ←── i
  //          [qty × value] ←── i+1
  //          [price line]? ←── i+2  (only when i+1 has a vintage, not a price)
  for (let i = 0; i < lines.length - 1; i++) {
    if (consumed.has(i)) continue;

    const timesMatch = lines[i + 1].match(TIMES_LINE_RE);
    if (!timesMatch) continue;

    const nameLine = lines[i];
    if (!looksLikeWine(nameLine)) continue;

    const qty = Math.min(parseInt(timesMatch[1], 10) || 1, 999);
    const secondNum = parseFloat(timesMatch[2].replace(/,/g, ""));
    const hasSymbol = !!timesMatch[3];

    let vintage: number | undefined;
    let price: number | undefined;

    if (!hasSymbol && secondNum >= 1900 && secondNum <= currentYear) {
      // "qty × 2023" — second value is a vintage, price is on the next line
      vintage = secondNum;
      const priceLine = lines[i + 2] ?? "";
      const maybePrice = extractPrice(priceLine);
      if (maybePrice !== undefined && !looksLikeWine(priceLine)) {
        price = maybePrice;
        consumed.add(i + 2);
      }
    } else {
      // "qty × 59.00 ₪" or "qty × 44.00" — second value is the price
      price = isNaN(secondNum) ? undefined : secondNum;
    }

    consumed.add(i);
    consumed.add(i + 1);

    const rawName = stripDatePrefix(nameLine);
    const name = cleanName(rawName);
    if (!name || name.length < 2) continue;

    items.push({
      name,
      quantity: qty,
      price,
      vintage: vintage ?? extractVintage(nameLine),
      type: extractType(nameLine),
    });
  }

  // ── Pass 2: single-line fallback ─────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i)) continue;
    const line = lines[i];
    if (!looksLikeWine(line)) continue;

    const quantity = extractQuantity(line);
    const price = extractPrice(line);
    const vintage = extractVintage(line);
    const type = extractType(line);
    const name = cleanName(stripDatePrefix(line));

    if (!name || name.length < 2) continue;

    items.push({ name, quantity, price, vintage, type });
  }

  // Deduplicate adjacent identical names
  const deduped: ParsedOrderItem[] = [];
  for (const item of items) {
    const last = deduped[deduped.length - 1];
    if (last && last.name.toLowerCase() === item.name.toLowerCase()) continue;
    deduped.push(item);
  }

  return deduped;
}
