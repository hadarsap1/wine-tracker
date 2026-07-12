import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  const { getReactNativePersistence } = require('@firebase/auth');
  const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
  return initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

export const auth = createAuth();

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
