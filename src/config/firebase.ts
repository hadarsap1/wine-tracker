import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
// App Check:
//   Web is initialized below via reCAPTCHA v3 when EXPO_PUBLIC_RECAPTCHA_SITE_KEY
//   is set. Enable enforcement per-service in Firebase Console → App Check.
//   iOS/Android need @react-native-firebase/app-check with DeviceCheck / Play
//   Integrity (follow-up when native builds ship). Until then, Cloud Function
//   rate limits + payload caps guard the most expensive operations.
import { Platform } from 'react-native';
import { env } from './env';

/**
 * Records a fatal initialization failure instead of throwing at module load.
 *
 * Firebase init runs while the module graph is still being evaluated — before
 * React mounts — so a throw here bypasses the ErrorBoundary entirely and leaves
 * the user staring at a blank white page with no explanation. (A malformed
 * EXPO_PUBLIC_FIREBASE_API_KEY does exactly this.) Capturing the error lets
 * App.tsx render an actionable message instead.
 */
export let firebaseInitError: Error | null = null;

function recordInitError(e: unknown): void {
  if (!firebaseInitError) {
    firebaseInitError = e instanceof Error ? e : new Error(String(e));
  }
  console.error('[firebase] initialization failed:', e);
}

const app = getApps().length === 0 ? initializeApp(env.firebase) : getApp();

// Initialize App Check on web when a reCAPTCHA site key is configured.
if (Platform.OS === 'web' && typeof document !== 'undefined' && env.recaptchaSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('[firebase] App Check init failed:', e);
  }
}

function createAuth() {
  try {
    if (Platform.OS === 'web') {
      return getAuth(app);
    }
    const { getReactNativePersistence } = require('@firebase/auth');
    const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (e) {
    recordInitError(e);
    return null;
  }
}

// Non-null for callers: when init fails, App.tsx renders the config-error screen
// and no consumer of `auth` is ever reached.
export const auth = createAuth() as NonNullable<ReturnType<typeof getAuth>>;

// Enable offline persistence so cached data is available without a connection
// and writes are queued while offline — important for a cellar app used in
// basements / poor signal. Falls back to the default in-memory cache if
// persistence can't be initialized (e.g. unsupported browser / private mode).
function createDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache(
        Platform.OS === 'web'
          ? { tabManager: persistentMultipleTabManager() }
          : {}
      ),
    });
  } catch (e) {
    // Private browsing, unsupported storage, or an already-started Firestore.
    // Offline caching is a nice-to-have — never let it break the app.
    console.warn('[firebase] persistent cache unavailable, using default:', e);
    try {
      return getFirestore(app);
    } catch (inner) {
      recordInitError(inner);
      return null as unknown as ReturnType<typeof getFirestore>;
    }
  }
}

export const db = createDb();
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
