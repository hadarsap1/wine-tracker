import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@config/firebase";
import { COLLECTIONS, HouseholdRole, type HouseholdInvite } from "@/types/index";
import * as userService from "@services/user";
import * as householdService from "@services/household";

function invitesCol() {
  return collection(db, COLLECTIONS.invites);
}

export async function createInvite(
  householdId: string,
  createdBy: string
): Promise<string> {
  const ref = doc(invitesCol());
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 48 * 60 * 60 * 1000)
  );
  await setDoc(ref, {
    householdId,
    createdBy,
    expiresAt,
    used: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function redeemInvite(
  code: string,
  uid: string,
  displayName: string,
  email: string
): Promise<string> {
  const ref = doc(db, COLLECTIONS.invites, code);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("invalid_invite");

  const invite = { id: snap.id, ...snap.data() } as HouseholdInvite;

  if (invite.used) throw new Error("invite_used");

  const now = Timestamp.now();
  if (invite.expiresAt.seconds < now.seconds) throw new Error("invite_expired");

  const profile = await userService.getUserProfile(uid);
  if (profile?.householdIds?.includes(invite.householdId)) {
    throw new Error("already_member");
  }

  // Add user as member
  const memberRef = doc(
    db,
    COLLECTIONS.households,
    invite.householdId,
    COLLECTIONS.members,
    uid
  );
  await setDoc(memberRef, {
    userId: uid,
    displayName,
    email,
    role: HouseholdRole.Member,
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Add householdId to user profile
  const currentIds = profile?.householdIds ?? [];
  await userService.updateUserHouseholdIds(uid, [
    ...currentIds,
    invite.householdId,
  ]);

  // Mark invite as used
  await updateDoc(ref, { used: true, updatedAt: serverTimestamp() });

  return invite.householdId;
}
