import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
// App Check (production setup):
//   Firebase JS SDK does not include native attestation providers for React Native.
//   To enable App Check on iOS/Android, add @react-native-firebase/app-check and
//   configure DeviceCheck (iOS) / Play Integrity (Android), then call initializeAppCheck()
//   here and enable enforcement per-service in Firebase Console → App Check.
//   Until then, rate limiting in Cloud Functions (detectLabelText, analyzeLabel)
//   guards the most expensive operations.
import { Platform } from 'react-native';
import { env } from './env';

const app = getApps().length === 0 ? initializeApp(env.firebase) : getApp();

function createAuth() {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
