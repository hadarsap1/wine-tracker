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
  Red: WineType.Red,
  White: WineType.White,
  'Rosé': WineType['Rosé'],
  Sparkling: WineType.Sparkling,
  Dessert: WineType.Dessert,
  Fortified: WineType.Fortified,
  Orange: WineType.Orange,
  Other: WineType.Other,
};

export async function analyzeLabelWithAI(imageUri: string): Promise<ParsedLabelData> {
  const base64 = await imageUriToBase64(imageUri);
  const fn = httpsCallable<{ imageBase64: string }, AnalyzeLabelRaw>(functions, 'analyzeLabel');
  const result = await fn({ imageBase64: base64 });
  const raw = result.data;

  const partial = {
    name: raw.name,
    producer: raw.producer,
    type: raw.type ? WINE_TYPE_MAP[raw.type] : undefined,
    vintage: raw.vintage,
    grape: raw.grape,
    region: raw.region,
    country: raw.country,
  };

  return { ...partial, confidence: calcConfidence(partial) };
}
