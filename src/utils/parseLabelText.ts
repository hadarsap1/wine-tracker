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

function extractNameAndProducer(
  text: string,
  usedTerms: string[]
): { name?: string; producer?: string } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  // Filter out lines that are just used terms (vintage, grape, type keywords, etc.)
  const usedLower = usedTerms.map((t) => t.toLowerCase());
  const unusedLines = lines.filter((line) => {
    const lineLower = line.toLowerCase();
    // Skip lines that are purely a year or purely a known keyword
    if (/^\d{4}$/.test(line)) return false;
    return !usedLower.some((term) => lineLower === term);
  });

  if (unusedLines.length === 0) return {};
  if (unusedLines.length === 1) return { name: unusedLines[0] };

  // First prominent unused line is likely the name, second is the producer
  return { name: unusedLines[0], producer: unusedLines[1] };
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseLabelText(rawText: string): ParsedLabelData {
  const usedTerms: string[] = [];

  const vintage = extractVintage(rawText);
  if (vintage) usedTerms.push(String(vintage));

  const type = extractType(rawText);

  const grape = extractGrape(rawText);
  if (grape) usedTerms.push(grape);

  const { country, region } = extractCountryRegion(rawText);
  if (region) usedTerms.push(region);

  const { name, producer } = extractNameAndProducer(rawText, usedTerms);

  // Confidence based on how many fields we found
  let fieldsFound = 0;
  if (name) fieldsFound++;
  if (type) fieldsFound++;
  if (vintage) fieldsFound++;
  if (grape) fieldsFound++;
  if (country) fieldsFound++;
  if (producer) fieldsFound++;

  const confidence: ParsedLabelData["confidence"] =
    fieldsFound >= 4 ? "high" : fieldsFound >= 2 ? "medium" : "low";

  return { name, type, producer, vintage, grape, region, country, confidence };
}
