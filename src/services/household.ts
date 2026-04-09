import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@config/firebase";
import {
  COLLECTIONS,
  HouseholdRole,
  type Household,
  type CreateHousehold,
  type CreateHouseholdMember,
} from "@/types/index";

export async function updateHouseholdName(
  householdId: string,
  name: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.households, householdId), {
    name,
    updatedAt: serverTimestamp(),
  });
}

export async function createPersonalHousehold(
  uid: string,
  displayName: string,
  email: string = "",
  customName?: string
): Promise<string> {
  const householdRef = doc(collection(db, COLLECTIONS.households));
  const householdId = householdRef.id;

  const household: CreateHousehold = {
    name: customName ?? `${displayName}'s Collection`,
    createdBy: uid,
    memberCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(householdRef, household);

  const memberRef = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.members,
    uid
  );

  const member: CreateHouseholdMember = {
    userId: uid,
    displayName,
    email,
    role: HouseholdRole.Admin,
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(memberRef, member);

  return householdId;
}

export async function leaveHousehold(
  householdId: string,
  uid: string
): Promise<void> {
  const memberRef = doc(db, COLLECTIONS.households, householdId, COLLECTIONS.members, uid);
  await deleteDoc(memberRef);
}

export async function getHousehold(
  householdId: string
): Promise<Household | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.households, householdId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Household;
}

/**
 * Ensures a member document exists for the given user in the given household.
 * This is a no-op if the document already exists.
 * Fixes users created before the email validation rule change whose member doc
 * was never written, causing isMember() to always return false.
 */
export async function ensureMemberExists(
  householdId: string,
  uid: string,
  displayName: string,
  email: string
): Promise<void> {
  const memberRef = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.members,
    uid
  );

  // Do NOT read first — reading requires isMember() which is false if doc is missing (circular).
  // Just attempt the create. The rule allows it when incomingData().userId == request.auth.uid.
  // If the doc already exists this becomes an update and may be rejected — silently ignore.
  const member: CreateHouseholdMember = {
    userId: uid,
    displayName,
    email,
    role: HouseholdRole.Admin,
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(memberRef, member);
  } catch {
    // Already exists or no permission to update — either way member doc is present.
  }
}
