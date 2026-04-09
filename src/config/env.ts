// Centralized, typed environment configuration
// Expo SDK 55 injects EXPO_PUBLIC_* vars via process.env at build time

export const env = {
  // Firebase
  firebase: {
    apiKey: (process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '').trim(),
    authDomain: (process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '').trim(),
    projectId: (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '').trim(),
    storageBucket: (process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '').trim(),
    messagingSenderId: (process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '').trim(),
    appId: (process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '').trim(),
  },

  // PostHog product analytics (https://posthog.com → Project Settings → Project API Key)
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',

  // App public URL (used for invite links etc.)
  appUrl: process.env.EXPO_PUBLIC_APP_URL ?? 'https://wine-tracker.web.app',
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
