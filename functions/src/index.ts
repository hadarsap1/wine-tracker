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
}

/**
 * Returns true if the returned wine name has at least one significant word
 * in common with the search query (case-insensitive, 3+ char words only).
 * Prevents showing completely unrelated wines as matches.
 */
function isRelevantMatch(query: string, wineName: string | undefined): boolean {
  if (!wineName) return false;

  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 3);

  const queryWords = tokenize(query);
  const wineWords = new Set(tokenize(wineName));

  return queryWords.some((w) => wineWords.has(w));
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
 * Try the Vivino wines search endpoint — lighter and less protected than explore.
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

  // Find the first result whose name actually matches the query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wine = (wines as any[]).find((w: any) => isRelevantMatch(query, w?.name));
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

  return { score, ratings, imageUrl, wineName: wine?.name, wineUrl };
}

/**
 * Fallback: try the explore endpoint.
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates: any[] = vintage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? [(matches as any[]).find((m: any) => m?.vintage?.year === vintage), ...matches].filter(Boolean)
    : matches as any[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = candidates.find((m: any) => {
    const name = m?.vintage?.name ?? m?.vintage?.wine?.name;
    return isRelevantMatch(query, name);
  });
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
  };
}

/**
 * Vivino proxy — server-side fetch to bypass CORS. Tries two endpoints.
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
      // Try faster search endpoint first
      const result = await searchWines(query);
      if (result) return result;

      // Fall back to explore endpoint
      return await exploreWines(query, vintage);
    } catch {
      return null;
    }
  }
);
