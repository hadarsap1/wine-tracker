import { httpsCallable } from 'firebase/functions';
import { functions } from '@config/firebase';
import type { ParsedLabelData } from '@/utils/parseLabelText';
import { calcConfidence } from '@/utils/parseLabelText';
import { WineType } from '@/types/index';

interface VisionResponse {
  fullText: string;
  locale: string;
  error?: string;
}

async function imageUriToBase64(imageUri: string): Promise<string> {
  // On native (iOS/Android), FileReader is not available — use expo-file-system
  if (typeof FileReader === 'undefined') {
    // Dynamic import so web builds don't bundle expo-file-system unnecessarily
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as { readAsStringAsync: (uri: string, opts: { encoding: string }) => Promise<string> };
    return await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
  }
  const response = await fetch(imageUri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1] ?? result;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function detectText(imageUri: string): Promise<VisionResponse> {
  const base64 = await imageUriToBase64(imageUri);
  const fn = httpsCallable<{ imageBase64: string }, VisionResponse>(functions, 'detectLabelText');
  try {
    const result = await fn({ imageBase64: base64 });
    return result.data;
  } catch (e) {
    const code = (e as { code?: string })?.code ?? '';
    if (code === 'functions/resource-exhausted') {
      return { fullText: '', locale: '', error: 'scan_rate_limit' };
    }
    return { fullText: '', locale: '', error: (e as Error).message };
  }
}

// ── AI-powered label analysis (GPT-4o Vision via Cloud Function) ──────────────

interface AnalyzeLabelRaw {
  name?: string;
  producer?: string;
  type?: string;
  vintage?: number;
  grape?: string;
  region?: string;
  country?: string;
}

const WINE_TYPE_MAP: Record<string, WineType> = {
  red: WineType.Red,
  white: WineType.White,
  rosé: WineType['Rosé'],
  rose: WineType['Rosé'],
  sparkling: WineType.Sparkling,
  dessert: WineType.Dessert,
  fortified: WineType.Fortified,
  orange: WineType.Orange,
  other: WineType.Other,
};

export async function analyzeLabelWithAI(imageUri: string): Promise<ParsedLabelData> {
  console.log(`[vision] analyzeLabelWithAI: start. uri scheme=${imageUri.slice(0, 30)}`);
  let base64: string;
  try {
    base64 = await imageUriToBase64(imageUri);
    console.log(`[vision] imageUriToBase64: ok. length=${base64.length}`);
  } catch (e) {
    console.error(`[vision] imageUriToBase64: FAILED`, e);
    throw e;
  }
  if (!base64 || base64.length < 10) {
    console.error(`[vision] imageUriToBase64: returned empty string (length=${base64?.length})`);
    throw new Error('imageUriToBase64 returned empty string');
  }
  const fn = httpsCallable<{ imageBase64: string }, AnalyzeLabelRaw>(functions, 'analyzeLabel');
  console.log(`[vision] calling analyzeLabel function...`);
  let result: Awaited<ReturnType<typeof fn>>;
  try {
    result = await fn({ imageBase64: base64 });
    console.log(`[vision] analyzeLabel: success`, result.data);
  } catch (e) {
    console.error(`[vision] analyzeLabel: FAILED`, e);
    throw e;
  }
  const raw = result.data;

  const partial = {
    name: raw.name,
    producer: raw.producer,
    type: raw.type ? WINE_TYPE_MAP[raw.type.toLowerCase()] : undefined,
    vintage: raw.vintage,
    grape: raw.grape,
    region: raw.region,
    country: raw.country,
  };

  return { ...partial, confidence: calcConfidence(partial) };
}
