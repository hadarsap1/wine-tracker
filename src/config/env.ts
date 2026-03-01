// Centralized, typed environment configuration
// Expo SDK 55 injects EXPO_PUBLIC_* vars via process.env at build time

export const env = {
  // Firebase
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },

  // Google Cloud Vision API (OCR for wine labels & receipts)
  googleCloudVisionApiKey: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY ?? '',

  // OpenAI API (LLM receipt parsing)
  openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',
} as const;

/**
 * Validates that all required env vars are set.
 * Call once at app startup (e.g., in App.tsx or root layout).
 * Returns list of missing variable names, or empty array if all set.
 */
export function validateEnv(): string[] {
  const required: [string, string][] = [
    ['EXPO_PUBLIC_FIREBASE_API_KEY', env.firebase.apiKey],
    ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', env.firebase.authDomain],
    ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', env.firebase.projectId],
    ['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', env.firebase.storageBucket],
    ['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', env.firebase.messagingSenderId],
    ['EXPO_PUBLIC_FIREBASE_APP_ID', env.firebase.appId],
  ];

  return required.filter(([, value]) => !value).map(([name]) => name);
}
