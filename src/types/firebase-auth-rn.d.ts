import type { Persistence } from "firebase/auth";

declare module "@firebase/auth" {
  function getReactNativePersistence(
    storage: import("@react-native-async-storage/async-storage").AsyncStorageStatic
  ): Persistence;
}
