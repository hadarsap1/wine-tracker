// Module augmentation for Firebase Auth React Native persistence
// Firebase v12's conditional exports resolve "types" before "react-native",
// so TypeScript doesn't see getReactNativePersistence in the default types.

import { Persistence } from '@firebase/auth';

declare module '@firebase/auth' {
  interface ReactNativeAsyncStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }

  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): Persistence;
}
