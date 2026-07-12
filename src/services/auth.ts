import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  updateProfile,
  sendPasswordResetEmail,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { Platform } from "react-native";
import { auth, functions } from "@config/firebase";

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  return user;
}

export async function signIn(
  email: string,
  password: string
): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function signInWithGoogle(): Promise<{
  user: User;
  isNewUser: boolean;
  displayName: string;
}> {
  // signInWithPopup is a web-only browser API. On iOS/Android it throws; native
  // Google sign-in needs expo-auth-session + signInWithCredential (follow-up).
  // Email/password sign-in works on all platforms in the meantime.
  if (Platform.OS !== "web") {
    throw new Error("google_signin_web_only");
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const additionalInfo = getAdditionalUserInfo(result);
  const displayName =
    result.user.displayName ?? result.user.email?.split("@")[0] ?? "User";
  return {
    user: result.user,
    isNewUser: additionalInfo?.isNewUser ?? false,
    displayName,
  };
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

const deleteAccountFn = httpsCallable<Record<string, never>, { deleted: true }>(
  functions,
  "deleteAccount"
);

/**
 * Permanently deletes the current user's account: auth user, profile, and any
 * sole-member households (with their data and uploaded images). Runs the
 * server-side deleteAccount Cloud Function, then signs out locally.
 */
export async function deleteAccount(): Promise<void> {
  await deleteAccountFn({});
  await firebaseSignOut(auth).catch(() => undefined);
}

export function onAuthStateChanged(
  callback: (user: User | null) => void
): Unsubscribe {
  return firebaseOnAuthStateChanged(auth, callback);
}
