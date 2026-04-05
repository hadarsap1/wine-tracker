import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  updateProfile,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { auth } from "@config/firebase";

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

export function onAuthStateChanged(
  callback: (user: User | null) => void
): Unsubscribe {
  return firebaseOnAuthStateChanged(auth, callback);
}
