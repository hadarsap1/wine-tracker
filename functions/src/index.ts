import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();

interface VivinoProxyRequest {
  query: string;
  vintage?: number;
}

interface VivinoProxyResponse {
  score: number;
  ratings: number;
  imageUrl?: string;
  wineName?: string;
  wineUrl?: string;
  wineType?: string;
  producerName?: string;
  region?: string;
  country?: string;
}

/**
 * Maps Vivino's numeric wine type IDs to our WineType enum string values.
 */
const VIVINO_TYPE_MAP: Record<number, string> = {
  1: 'Red',
  2: 'White',
  3: 'Sparkling',
  4: 'Fortified',
  7: 'Rosé',
  24: 'Dessert',
};

/**
 * Returns a 0–1 score representing how well a wine name matches the query.
 * Uses word-level overlap on significant words (3+ chars).
 * A score > 0 means at least one word matched.
 */
function matchScore(query: string, wineName: string | undefined): number {
  if (!wineName) return 0;
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 3);

  const queryWords = tokenize(query);
  const wineWords = new Set(tokenize(wineName));
  if (queryWords.length === 0) return 0;
  const common = queryWords.filter((w) => wineWords.has(w)).length;
  return common / queryWords.length;
}

/** Pick the highest-scoring match from an array of candidates. Returns null if none score > 0. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bestMatch(query: string, candidates: any[], getName: (c: any) => string | undefined): any | null {
  let bestScore = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let best: any | null = null;
  for (const c of candidates) {
    const s = matchScore(query, getName(c));
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return bestScore > 0 ? best : null;
}

const VIVINO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': 'https://www.vivino.com/explore',
  'Origin': 'https://www.vivino.com',
};

/**
 * Search endpoint — lighter and faster. Returns enriched data including type, producer, region.
 */
async function searchWines(query: string): Promise<VivinoProxyResponse | null> {
  const q = encodeURIComponent(query.trim());
  const url = `https://www.vivino.com/api/wines/search?q=${q}&language=en&mini=true`;

  const res = await fetch(url, { headers: VIVINO_HEADERS });
  if (!res.ok) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await res.json() as any;
  const wines = json?.wines;
  if (!Array.isArray(wines) || wines.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wine = bestMatch(query, wines as any[], (w: any) => w?.name);
  if (!wine) return null;

  const score: number = wine?.statistics?.ratings_average ?? 0;
  const ratings: number = wine?.statistics?.ratings_count ?? 0;
  if (score === 0) return null;

  const rawImageUrl: string | undefined = wine?.image?.variations?.bottle_medium;
  const imageUrl = rawImageUrl
    ? rawImageUrl.startsWith('//')
      ? `https:${rawImageUrl}`
      : rawImageUrl
    : undefined;

  const wineId: number | undefined = wine?.id;
  const wineUrl = wineId ? `https://www.vivino.com/wines/${wineId}` : undefined;

  return {
    score,
    ratings,
    imageUrl,
    wineName: wine?.name,
    wineUrl,
    wineType: VIVINO_TYPE_MAP[wine?.type_id as number] ?? undefined,
    producerName: (wine?.winery?.name as string | undefined) ?? undefined,
    region: (wine?.region?.name as string | undefined) ?? undefined,
    country: (wine?.region?.country?.name as string | undefined) ?? undefined,
  };
}

/**
 * Fallback: explore endpoint. Handles vintage-specific matching.
 */
async function exploreWines(query: string, vintage?: number): Promise<VivinoProxyResponse | null> {
  const q = encodeURIComponent(query.trim());
  const url = `https://www.vivino.com/api/explore/explore?q=${q}&price_range_max=500&price_range_min=0`;

  const res = await fetch(url, { headers: VIVINO_HEADERS });
  if (!res.ok) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root = await res.json() as any;
  const matches: unknown[] | undefined = root?.explore_vintage?.matches;
  if (!matches || matches.length === 0) return null;

  // If a vintage is given, prefer that year's match but keep all candidates for scoring
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates: any[] = vintage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? [(matches as any[]).find((m: any) => m?.vintage?.year === vintage), ...matches].filter(Boolean)
    : matches as any[];

  const match = bestMatch(
    query,
    candidates,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m?.vintage?.name ?? m?.vintage?.wine?.name
  );
  if (!match) return null;

  const vintageData = match?.vintage;
  if (!vintageData) return null;

  const score: number = vintageData.statistics?.ratings_average ?? 0;
  const ratings: number = vintageData.statistics?.ratings_count ?? 0;
  if (score === 0) return null;

  const rawImageUrl: string | undefined = vintageData.image?.variations?.bottle_medium;
  const imageUrl = rawImageUrl
    ? rawImageUrl.startsWith('//')
      ? `https:${rawImageUrl}`
      : rawImageUrl
    : undefined;

  const wineId: number | undefined = vintageData.wine?.id;
  const wineUrl = wineId ? `https://www.vivino.com/wines/${wineId}` : undefined;

  return {
    score,
    ratings,
    imageUrl,
    wineName: vintageData.name ?? vintageData.wine?.name,
    wineUrl,
    wineType: VIVINO_TYPE_MAP[vintageData.wine?.type_id as number] ?? undefined,
    producerName: (vintageData.wine?.winery?.name as string | undefined) ?? undefined,
    region: (vintageData.wine?.region?.name as string | undefined) ?? undefined,
    country: (vintageData.wine?.region?.country?.name as string | undefined) ?? undefined,
  };
}

/**
 * Tries multiple query strategies to find the best Vivino match.
 * Strategy order:
 *  1. Full query → search endpoint
 *  2. Full query → explore endpoint (vintage-aware)
 *  3. Shortened query (drop first word, which may be a producer prefix) → search
 *  4. Shortened query → explore
 */
async function searchWithStrategies(query: string, vintage?: number): Promise<VivinoProxyResponse | null> {
  // Strategy 1: full query, search endpoint
  const r1 = await searchWines(query);
  if (r1) return r1;

  // Strategy 2: full query, explore endpoint (better for vintage matching)
  const r2 = await exploreWines(query, vintage);
  if (r2) return r2;

  // Strategy 3/4: strip first word (potential producer prefix) and retry
  const words = query.trim().split(/\s+/);
  if (words.length > 2) {
    const shortened = words.slice(1).join(' ');
    const r3 = await searchWines(shortened);
    if (r3) return r3;
    const r4 = await exploreWines(shortened, vintage);
    if (r4) return r4;
  }

  return null;
}

/**
 * Vivino proxy — server-side fetch to bypass CORS. Tries multiple strategies.
 */
export const vivinoProxy = onCall<VivinoProxyRequest, Promise<VivinoProxyResponse | null>>(
  { cors: true, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const { query, vintage } = request.data;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      throw new HttpsError('invalid-argument', 'query must be at least 2 characters.');
    }

    try {
      return await searchWithStrategies(query.trim(), vintage);
    } catch {
      return null;
    }
  }
);
