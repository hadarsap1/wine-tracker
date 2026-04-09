import { WineType } from "@/types/index";

export interface ParsedLabelData {
  name?: string;
  type?: WineType;
  producer?: string;
  vintage?: number;
  grape?: string;
  region?: string;
  country?: string;
  confidence: "high" | "medium" | "low";
}

// ─── Vintage ─────────────────────────────────────────────────────────────────

const VINTAGE_RE = /\b(19|20)\d{2}\b/g;

function extractVintage(text: string): number | undefined {
  const matches = text.match(VINTAGE_RE);
  if (!matches) return undefined;
  const currentYear = new Date().getFullYear();
  // Pick the most likely wine vintage (not a future year, prefer recent)
  const valid = matches
    .map(Number)
    .filter((y) => y >= 1900 && y <= currentYear)
    .sort((a, b) => b - a);
  return valid[0];
}

// ─── Wine Type ───────────────────────────────────────────────────────────────

const TYPE_KEYWORDS: Record<string, WineType> = {
  // English
  sparkling: WineType.Sparkling,
  champagne: WineType.Sparkling,
  prosecco: WineType.Sparkling,
  cava: WineType.Sparkling,
  crémant: WineType.Sparkling,
  cremant: WineType.Sparkling,
  brut: WineType.Sparkling,
  rosé: WineType.Rosé,
  rose: WineType.Rosé,
  rosato: WineType.Rosé,
  dessert: WineType.Dessert,
  "late harvest": WineType.Dessert,
  sauternes: WineType.Dessert,
  fortified: WineType.Fortified,
  port: WineType.Fortified,
  sherry: WineType.Fortified,
  madeira: WineType.Fortified,
  marsala: WineType.Fortified,
  orange: WineType.Orange,
  white: WineType.White,
  blanc: WineType.White,
  bianco: WineType.White,
  weiss: WineType.White,
  red: WineType.Red,
  rouge: WineType.Red,
  rosso: WineType.Red,
  tinto: WineType.Red,
  rot: WineType.Red,
};

function extractType(text: string): WineType | undefined {
  const lower = text.toLowerCase();
  for (const [keyword, type] of Object.entries(TYPE_KEYWORDS)) {
    if (lower.includes(keyword)) return type;
  }
  return undefined;
}

// ─── Grape Varieties ─────────────────────────────────────────────────────────

const GRAPE_VARIETIES = [
  "Cabernet Sauvignon", "Merlot", "Pinot Noir", "Syrah", "Shiraz",
  "Tempranillo", "Sangiovese", "Nebbiolo", "Malbec", "Grenache",
  "Mourvèdre", "Mourvedre", "Zinfandel", "Primitivo", "Barbera",
  "Chardonnay", "Sauvignon Blanc", "Riesling", "Pinot Grigio", "Pinot Gris",
  "Gewürztraminer", "Gewurztraminer", "Viognier", "Chenin Blanc",
  "Sémillon", "Semillon", "Muscadet", "Muscat", "Moscato",
  "Cabernet Franc", "Petit Verdot", "Carmenère", "Carmenere",
  "Touriga Nacional", "Garnacha", "Monastrell",
];

const GRAPE_TO_TYPE: Partial<Record<string, WineType>> = {
  "Cabernet Sauvignon": WineType.Red,
  "Merlot": WineType.Red,
  "Pinot Noir": WineType.Red,
  "Syrah": WineType.Red,
  "Shiraz": WineType.Red,
  "Tempranillo": WineType.Red,
  "Sangiovese": WineType.Red,
  "Nebbiolo": WineType.Red,
  "Malbec": WineType.Red,
  "Grenache": WineType.Red,
  "Mourvèdre": WineType.Red,
  "Mourvedre": WineType.Red,
  "Zinfandel": WineType.Red,
  "Primitivo": WineType.Red,
  "Barbera": WineType.Red,
  "Cabernet Franc": WineType.Red,
  "Petit Verdot": WineType.Red,
  "Carmenère": WineType.Red,
  "Carmenere": WineType.Red,
  "Touriga Nacional": WineType.Red,
  "Garnacha": WineType.Red,
  "Monastrell": WineType.Red,
  "Chardonnay": WineType.White,
  "Sauvignon Blanc": WineType.White,
  "Riesling": WineType.White,
  "Pinot Grigio": WineType.White,
  "Pinot Gris": WineType.White,
  "Gewürztraminer": WineType.White,
  "Gewurztraminer": WineType.White,
  "Viognier": WineType.White,
  "Chenin Blanc": WineType.White,
  "Sémillon": WineType.White,
  "Semillon": WineType.White,
  "Muscadet": WineType.White,
  "Muscat": WineType.White,
  "Moscato": WineType.White,
};

function extractGrape(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const grape of GRAPE_VARIETIES) {
    if (lower.includes(grape.toLowerCase())) return grape;
  }
  return undefined;
}

// ─── Country & Region ────────────────────────────────────────────────────────

const COUNTRIES: Record<string, string[]> = {
  France: ["bordeaux", "bourgogne", "burgundy", "champagne", "rhône", "rhone", "alsace", "loire", "languedoc", "provence"],
  Italy: ["toscana", "tuscany", "piemonte", "piedmont", "veneto", "sicilia", "sicily", "puglia", "abruzzo"],
  Spain: ["rioja", "ribera del duero", "priorat", "rías baixas", "rias baixas", "penedès", "penedes"],
  USA: ["napa", "sonoma", "willamette", "paso robles", "california", "oregon", "washington"],
  Argentina: ["mendoza", "salta", "patagonia"],
  Chile: ["maipo", "colchagua", "casablanca"],
  Australia: ["barossa", "mclaren vale", "hunter valley", "margaret river", "yarra valley"],
  "New Zealand": ["marlborough", "hawke's bay", "central otago"],
  Germany: ["mosel", "rheingau", "pfalz", "baden"],
  Portugal: ["douro", "alentejo", "dão", "dao", "vinho verde"],
  "South Africa": ["stellenbosch", "franschhoek", "paarl", "swartland"],
  Israel: ["galilee", "golan heights", "golan", "judean hills", "negev", "shomron", "samson"],
};

function extractCountryRegion(text: string): { country?: string; region?: string } {
  const lower = text.toLowerCase();

  // Check country names directly
  for (const [country, regions] of Object.entries(COUNTRIES)) {
    if (lower.includes(country.toLowerCase())) {
      // Found country, now check for region
      for (const region of regions) {
        if (lower.includes(region)) {
          return { country, region: region.charAt(0).toUpperCase() + region.slice(1) };
        }
      }
      return { country };
    }
    // Check regions even if country name not present
    for (const region of regions) {
      if (lower.includes(region)) {
        return { country, region: region.charAt(0).toUpperCase() + region.slice(1) };
      }
    }
  }

  return {};
}

// ─── Name & Producer ─────────────────────────────────────────────────────────

// Patterns that indicate OCR noise, not wine name/producer
const NOISE_PATTERNS = [
  /^\d+[\.,]?\d*\s*%/,           // alcohol/volume: "13.5%", "135%", "14% vol"
  /^\s*vol\.?\s*$/i,              // "vol" or "vol." as the entire line
  /^\d+(\.\d+)?\s*(cl|ml|l)\b/i, // bottle size: "75cl", "750ml"
  /^e\s*\d/i,                    // "e 75cl"
  /^lot\s*#?\d/i,                // lot numbers
  /^[A-Z0-9]{8,}$/,              // barcodes / product codes
  /^\d{6,}$/,                    // long number sequences
  /^www\./i,                     // URLs
  /^\+?\d[\d\s\-().]{7,}$/,      // phone numbers
  /^\d{1,3}$|^\d{1,3}[.,]\d{1,2}$/, // standalone short numbers: "25", "13", "4.5"
  /\bsince\b/i,                  // "Since 1870", "est. since"
  /\best\.?\s*\d{4}/i,           // "Est. 1870"
  /^(family\s+)?(winery|winer|cellars?|vineyards?|estate|chateau|domaine|bodega|cantina)\b/i, // winery boilerplate lines
  /contain[s]?\s+sulph/i,        // "contains sulphites"
  /^(produce[d]?|bottled|mis en bouteille)/i, // production notes
  /^\p{Script=Hebrew}/u,         // Hebrew text (not a wine name/producer)
];

function isNoiseLine(line: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(line.trim()));
}

// Words that suggest a line is a winery/producer, not a wine range name
const PRODUCER_HINT_RE = /\b(winery|winer|cellars?|vineyards?|estate|chateau|domaine|bodega|cantina|family|distillery)\b/i;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function extractNameAndProducer(
  text: string,
  usedTerms: string[]
): { name?: string; producer?: string } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const usedLower = usedTerms.map((t) => t.toLowerCase());
  const unusedLines = lines.filter((line) => {
    const lineLower = line.toLowerCase();
    if (/^\d{4}$/.test(line)) return false; // pure vintage year
    if (isNoiseLine(line)) return false;
    return !usedLower.some((term) => lineLower === term);
  });

  if (unusedLines.length === 0) return {};
  if (unusedLines.length === 1) return { name: unusedLines[0] };

  // Heuristic: wine range names are short (1-3 words), producer names can be longer
  // or contain winery-hint words.
  // Partition lines into "name candidates" (short, no winery hints) and others.
  const nameCandidates = unusedLines.filter(
    (l) => wordCount(l) <= 3 && !PRODUCER_HINT_RE.test(l)
  );
  const producerCandidates = unusedLines.filter(
    (l) => wordCount(l) > 3 || PRODUCER_HINT_RE.test(l)
  );

  // Prefer the shortest name candidate as the wine name
  const name =
    nameCandidates.length > 0
      ? nameCandidates.reduce((a, b) => (a.length <= b.length ? a : b))
      : unusedLines[0];

  // Producer: first candidate that isn't the chosen name
  const producer =
    producerCandidates.find((l) => l !== name) ??
    unusedLines.find((l) => l !== name);

  return { name, producer };
}

// ─── Shared confidence helper ─────────────────────────────────────────────────

export function calcConfidence(data: Omit<ParsedLabelData, "confidence">): ParsedLabelData["confidence"] {
  const fieldsFound = [data.name, data.type, data.vintage, data.grape, data.country, data.producer]
    .filter(Boolean).length;
  return fieldsFound >= 4 ? "high" : fieldsFound >= 2 ? "medium" : "low";
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseLabelText(rawText: string): ParsedLabelData {
  const usedTerms: string[] = [];

  const vintage = extractVintage(rawText);
  if (vintage) usedTerms.push(String(vintage));

  const grape = extractGrape(rawText);
  if (grape) usedTerms.push(grape);

  // Infer type from label keywords first, then fall back to grape variety
  const type = extractType(rawText) ?? (grape ? GRAPE_TO_TYPE[grape] : undefined);

  const { country, region } = extractCountryRegion(rawText);
  if (region) usedTerms.push(region);

  const { name, producer } = extractNameAndProducer(rawText, usedTerms);

  const partial = { name, type, producer, vintage, grape, region, country };
  return { ...partial, confidence: calcConfidence(partial) };
}
