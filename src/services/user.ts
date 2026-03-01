import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@config/firebase";
import {
  COLLECTIONS,
  type UserProfile,
  type UserPreferences,
  type CreateUserProfile,
} from "@/types/index";

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  const defaultPreferences: UserPreferences = {
    currency: "USD",
    theme: "system",
  };

  const profile: CreateUserProfile = {
    uid,
    email,
    displayName,
    householdIds: [],
    preferences: defaultPreferences,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, COLLECTIONS.users, uid), profile);
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserProfile;
}
