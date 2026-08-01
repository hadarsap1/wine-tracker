import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable, type FunctionsError } from "firebase/functions";
import { db, functions } from "@config/firebase";
import { COLLECTIONS, HouseholdRole, type HouseholdInvite } from "@/types/index";
import * as userService from "@services/user";

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

/** Callable error codes that mean "the function isn't deployed / reachable". */
const FUNCTION_MISSING_CODES = [
  "functions/not-found",
  "functions/unimplemented",
  "functions/unavailable",
  "functions/internal",
];

function isFunctionMissing(e: unknown): boolean {
  const code = (e as FunctionsError)?.code;
  return typeof code === "string" && FUNCTION_MISSING_CODES.includes(code);
}

/**
 * Redeems an invite.
 *
 * Primary path is the server-side `redeemInvite` Cloud Function, which validates
 * the invite and writes the membership atomically with the Admin SDK. Client-side
 * redemption cannot be trusted, because Firestore rules can't verify invite
 * validity while creating a member doc.
 *
 * FALLBACK: if the function isn't deployed yet, we fall back to the legacy
 * client-side path so joining keeps working. This fallback is self-retiring —
 * once the hardened rules are live they reject the client-side member write, and
 * once the function is deployed this branch is never reached. Remove it after
 * `redeemInvite` has been deployed.
 *
 * Throws errors whose message is one of:
 * "invalid_invite" | "invite_used" | "invite_expired" | "already_member"
 */
export async function redeemInvite(
  code: string,
  fallback?: { uid: string; displayName: string; email: string }
): Promise<string> {
  try {
    const result = await redeemInviteFn({ inviteId: code });
    return result.data.householdId;
  } catch (e) {
    // The function maps its failures to HttpsError codes; surface those as-is.
    const message = (e as FunctionsError)?.message;
    if (!isFunctionMissing(e)) {
      throw new Error(message || "join_failed");
    }
    if (!fallback) throw new Error("join_unavailable");
    console.warn("[invite] redeemInvite function unavailable — using legacy client path");
    return redeemInviteClientSide(code, fallback.uid, fallback.displayName, fallback.email);
  }
}

/** Legacy client-side redemption. Only used when the Cloud Function is unavailable. */
async function redeemInviteClientSide(
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
  if (invite.expiresAt.toMillis() < Date.now()) throw new Error("invite_expired");

  const profile = await userService.getUserProfile(uid);
  if (profile?.householdIds?.includes(invite.householdId)) {
    throw new Error("already_member");
  }

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

  const currentIds = profile?.householdIds ?? [];
  await userService.updateUserHouseholdIds(uid, [...currentIds, invite.householdId]);
  await updateDoc(ref, { used: true, updatedAt: serverTimestamp() });

  return invite.householdId;
}
