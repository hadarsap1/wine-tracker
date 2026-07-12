import {
  doc,
  collection,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@config/firebase";
import { COLLECTIONS } from "@/types/index";

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

const redeemInviteFn = httpsCallable<{ inviteId: string }, { householdId: string }>(
  functions,
  "redeemInvite"
);

/**
 * Redeems an invite via the server-side Cloud Function.
 * All validation (exists / unused / unexpired) and the membership write happen
 * atomically with the Admin SDK — client-side redemption was removed because
 * Firestore rules cannot enforce invite validity on member creation.
 *
 * Throws errors whose message is one of:
 * "invalid_invite" | "invite_used" | "invite_expired" | "already_member"
 */
export async function redeemInvite(code: string): Promise<string> {
  const result = await redeemInviteFn({ inviteId: code });
  return result.data.householdId;
}
