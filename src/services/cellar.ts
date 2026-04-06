import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@config/firebase";
import { COLLECTIONS, type StorageUnit } from "@/types/index";

function col(householdId: string) {
  return collection(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.storageUnits
  );
}

export async function getStorageUnits(
  householdId: string
): Promise<StorageUnit[]> {
  const q = query(col(householdId), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StorageUnit);
}

export async function createStorageUnit(
  householdId: string,
  data: { name: string; type: "fridge" | "rack"; rows: number; cols: number }
): Promise<string> {
  const ref = await addDoc(col(householdId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStorageUnit(
  householdId: string,
  unitId: string,
  data: { name?: string; rows?: number; cols?: number }
): Promise<void> {
  await updateDoc(doc(col(householdId), unitId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStorageUnit(
  householdId: string,
  unitId: string
): Promise<void> {
  await deleteDoc(doc(col(householdId), unitId));
}
