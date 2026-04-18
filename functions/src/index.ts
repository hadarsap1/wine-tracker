import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

admin.initializeApp();

// ── Secrets (stored in Firebase Secret Manager, never in app binary) ──────────
const openaiApiKey = defineSecret('OPENAI_API_KEY');
const visionApiKey = defineSecret('GOOGLE_CLOUD_VISION_API_KEY');

// ── Rate limiting ─────────────────────────────────────────────────────────────
// 500 AI scan calls per user per calendar day (UTC). Only applied to analyzeLabel (GPT-4o).
const SCAN_DAILY_LIMIT = 500;

async function checkScanRateLimit(userId: string): Promise<boolean> {
  const db = admin.firestore();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const ref = db.collection('rateLimits').doc(userId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data();
    if (!data || data.scanDate !== today) {
      tx.set(ref, { scanDate: today, scanCount: 1 });
      return true;
    }
    if ((data.scanCount as number) >= SCAN_DAILY_LIMIT) {
      return false;
    }
    tx.update(ref, { scanCount: admin.firestore.FieldValue.increment(1) });
    return true;
  });
}

// ── Vivino helpers ─────────────────────────────────────────────────────────────

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
  if (!res.ok) {
    console.warn(`[vivino] searchWines HTTP ${res.status} for query="${query}"`);
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await res.json() as any;
  const wines = json?.wines;
  if (!Array.isArray(wines) || wines.length === 0) {
    console.warn(`[vivino] searchWines: no wines array for query="${query}". top-level keys=${Object.keys(json ?? {}).join(',')}`);
    return null;
  }

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
  if (!res.ok) {
    console.warn(`[vivino] exploreWines HTTP ${res.status} for query="${query}"`);
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root = await res.json() as any;
  const matches: unknown[] | undefined = root?.explore_vintage?.matches;
  if (!matches || matches.length === 0) {
    console.warn(`[vivino] exploreWines: no matches for query="${query}". top-level keys=${Object.keys(root ?? {}).join(',')}`);
    return null;
  }

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
      console.log(`[vivino] searching: query="${query}" vintage=${vintage ?? 'none'}`);
      const result = await searchWithStrategies(query.trim(), vintage);
      console.log(`[vivino] result: ${result ? `score=${result.score} name=${result.wineName}` : 'null (not found)'}`);
      return result;
    } catch (e) {
      console.error(`[vivino] searchWithStrategies threw:`, e);
      return null;
    }
  }
);

// ── detectLabelText (Google Cloud Vision OCR) ─────────────────────────────────

interface DetectTextRequest {
  imageBase64: string;
}

interface DetectTextResponse {
  fullText: string;
  locale: string;
  error?: string;
}

/**
 * Runs Google Cloud Vision TEXT_DETECTION on a base64-encoded image.
 * API key is stored as a Cloud Secret — never sent to the client.
 */
export const detectLabelText = onCall<DetectTextRequest, Promise<DetectTextResponse>>(
  { cors: true, timeoutSeconds: 30, secrets: [visionApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const { imageBase64 } = request.data;
    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 10) {
      throw new HttpsError('invalid-argument', 'imageBase64 is required.');
    }

    const apiKey = visionApiKey.value();
    if (!apiKey) {
      return { fullText: '', locale: '', error: 'Vision API not configured on server.' };
    }

    const body = {
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    };

    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      // Log full details server-side only — never expose raw API responses to clients
      console.error(`Vision API error ${res.status}: ${errorText}`);
      if (res.status === 400 || res.status === 403) {
        return { fullText: '', locale: '', error: 'vision_key_invalid' };
      }
      return { fullText: '', locale: '', error: 'vision_api_error' };
    }

    const data = await res.json() as Record<string, unknown>;
    const responses = data.responses as Record<string, unknown>[] | undefined;
    const annotations = responses?.[0]?.textAnnotations as Record<string, unknown>[] | undefined;

    if (!annotations || annotations.length === 0) {
      return { fullText: '', locale: '', error: 'No text detected in image' };
    }

    return {
      fullText: (annotations[0].description as string) ?? '',
      locale: (annotations[0].locale as string) ?? '',
    };
  }
);

// ── getAdminMetrics ────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'hadarsap@gmail.com';

interface AdminMetricsResponse {
  users: number;
  households: number;
  wines: number;
  inventoryItems: number;
  diaryEntries: number;
  feedback: number;
}

export const getAdminMetrics = onCall<void, Promise<AdminMetricsResponse>>(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    if (request.auth.token.email !== ADMIN_EMAIL) {
      throw new HttpsError('permission-denied', 'Not authorized.');
    }

    const db = admin.firestore();
    const count = async (ref: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference) => {
      try {
        return (await ref.count().get()).data().count;
      } catch {
        return 0;
      }
    };

    const [users, households, wines, inventoryItems, diaryEntries, feedback] =
      await Promise.all([
        count(db.collection('users')),
        count(db.collection('households')),
        count(db.collectionGroup('wines')),
        count(db.collectionGroup('inventoryItems')),
        count(db.collectionGroup('diaryEntries')),
        count(db.collection('feedback')),
      ]);

    return { users, households, wines, inventoryItems, diaryEntries, feedback };
  }
);

// ── analyzeLabel (OpenAI GPT-4o Vision) ───────────────────────────────────────

const AI_WINE_TYPE_MAP: Record<string, string> = {
  red: 'Red',
  white: 'White',
  'rosé': 'Rosé',
  rose: 'Rosé',
  sparkling: 'Sparkling',
  dessert: 'Dessert',
  fortified: 'Fortified',
  orange: 'Orange',
  other: 'Other',
};

interface AnalyzeLabelRequest {
  imageBase64: string;
}

interface AnalyzeLabelResponse {
  name?: string;
  producer?: string;
  type?: string;
  vintage?: number;
  grape?: string;
  region?: string;
  country?: string;
  vivinoQuery?: string;
}

/**
 * Analyzes a wine label image using GPT-4o Vision.
 * OpenAI API key is stored as a Cloud Secret — never sent to the client.
 */
export const analyzeLabel = onCall<AnalyzeLabelRequest, Promise<AnalyzeLabelResponse>>(
  { cors: true, timeoutSeconds: 30, secrets: [openaiApiKey] },
  async (request) => {
    console.log(`analyzeLabel: invoked. auth=${!!request.auth}`);

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const { imageBase64 } = request.data;
    const b64Len = typeof imageBase64 === 'string' ? imageBase64.length : -1;
    console.log(`analyzeLabel: imageBase64 type=${typeof imageBase64} length=${b64Len}`);

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 10) {
      console.error(`analyzeLabel: imageBase64 validation failed. type=${typeof imageBase64} length=${b64Len}`);
      throw new HttpsError('invalid-argument', 'imageBase64 is required.');
    }

    const allowed = await checkScanRateLimit(request.auth.uid);
    if (!allowed) {
      throw new HttpsError('resource-exhausted', 'Daily scan limit reached. Try again tomorrow.');
    }

    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      console.error('analyzeLabel: OPENAI_API_KEY secret is empty or not loaded. Secret name: OPENAI_API_KEY, length: 0');
      throw new HttpsError('unavailable', 'AI analysis not configured on server.');
    }
    console.log(`analyzeLabel: API key loaded (length=${apiKey.length}), sending to OpenAI...`);

    const body = {
      model: 'gpt-4o',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'low',
              },
            },
            {
              type: 'text',
              text: `You are a wine label reader. Extract information from this wine bottle label image.
Return ONLY a valid JSON object — no markdown, no explanation:
{
  "name": "wine range/cuvée name (not the winery name)",
  "producer": "winery or producer name",
  "type": "red" | "white" | "rosé" | "sparkling" | "dessert" | "fortified" | "orange" | "other",
  "vintage": <4-digit year as integer, or null>,
  "grape": "primary grape variety or blend",
  "region": "wine appellation or region",
  "country": "country of origin"
}
Use null for any field you cannot determine from the label.`,
            },
          ],
        },
      ],
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`OpenAI API error ${res.status}: ${errBody}`);
      throw new HttpsError('internal', `OpenAI API error: ${res.status}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const choices = data.choices as Record<string, unknown>[] | undefined;
    const content = (choices?.[0]?.message as Record<string, unknown>)?.content as string ?? '';

    const jsonStr = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      console.error(`Failed to parse AI response as JSON. Raw content: ${content}`);
      throw new HttpsError('internal', 'Failed to parse AI response as JSON');
    }

    const str = (v: unknown): string | undefined =>
      typeof v === 'string' && v.trim() && v.toLowerCase() !== 'null' ? v.trim() : undefined;

    const vintage = typeof parsed.vintage === 'number' && parsed.vintage > 1900
      ? parsed.vintage
      : undefined;

    const typeRaw = typeof parsed.type === 'string' ? parsed.type.toLowerCase() : '';
    const type = AI_WINE_TYPE_MAP[typeRaw];

    return {
      name: str(parsed.name),
      producer: str(parsed.producer),
      type,
      vintage,
      grape: str(parsed.grape),
      region: str(parsed.region),
      country: str(parsed.country),
    };
  }
);
