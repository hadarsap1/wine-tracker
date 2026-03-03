import {
  doc,
  collection,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@config/firebase";
import {
  COLLECTIONS,
  HouseholdRole,
  type CreateHousehold,
  type CreateHouseholdMember,
} from "@/types/index";

export async function createPersonalHousehold(
  uid: string,
  displayName: string
): Promise<string> {
  const householdRef = doc(collection(db, COLLECTIONS.households));
  const householdId = householdRef.id;

  const household: CreateHousehold = {
    name: `${displayName}'s Collection`,
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
    email: "",
    role: HouseholdRole.Admin,
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(memberRef, member);

  return householdId;
}
