import { httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import { functions } from '@config/firebase';
import type { VivinoData } from '@/types/index';

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

const vivinoProxyFn = httpsCallable<
  { query: string; vintage?: number },
  VivinoProxyResponse | null
>(functions, 'vivinoProxy');

/**
 * Fetches Vivino rating data for a wine via the server-side proxy function.
 * Returns null if the wine is not found or the function is unavailable.
 */
export async function fetchVivinoData(
  wineName: string,
  vintage?: number
): Promise<VivinoData | null> {
  try {
    const result = await vivinoProxyFn({ query: wineName, vintage });
    const data = result.data;
    if (!data || data.score === 0) return null;

    return {
      score: data.score,
      ratings: data.ratings,
      imageUrl: data.imageUrl,
      wineName: data.wineName,
      wineUrl: data.wineUrl,
      wineType: data.wineType,
      producerName: data.producerName,
      region: data.region,
      country: data.country,
      fetchedAt: Timestamp.now(),
    };
  } catch {
    // Silently fail — Vivino data is supplemental, not critical
    return null;
  }
}
