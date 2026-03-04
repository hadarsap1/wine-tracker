import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@config/firebase";
import {
  COLLECTIONS,
  type DiaryEntry,
  type CreateDiaryEntry,
  type Rating,
  type WineType,
} from "@/types/index";

function diaryCol(householdId: string) {
  return collection(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.diaryEntries
  );
}

export interface DiaryFormData {
  wineId: string;
  wineName: string;
  wineType: WineType;
  rating: Rating;
  notes?: string;
  imageUrls: string[];
  inventoryItemId?: string;
}

export function generateEntryId(householdId: string): string {
  return doc(diaryCol(householdId)).id;
}

export async function createDiaryEntry(
  householdId: string,
  entryId: string,
  data: DiaryFormData
): Promise<void> {
  const ref = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.diaryEntries,
    entryId
  );
  const entry: Record<string, unknown> = {
    wineId: data.wineId,
    wineName: data.wineName,
    wineType: data.wineType,
    rating: data.rating,
    imageUrls: data.imageUrls,
    tastingDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (data.notes) entry.notes = data.notes;
  if (data.inventoryItemId) entry.inventoryItemId = data.inventoryItemId;
  await setDoc(ref, entry);
}

export async function getDiaryEntries(
  householdId: string
): Promise<DiaryEntry[]> {
  const q = query(diaryCol(householdId), orderBy("tastingDate", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DiaryEntry);
}

export async function getDiaryEntry(
  householdId: string,
  entryId: string
): Promise<DiaryEntry | null> {
  const snap = await getDoc(
    doc(
      db,
      COLLECTIONS.households,
      householdId,
      COLLECTIONS.diaryEntries,
      entryId
    )
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DiaryEntry;
}

export async function updateDiaryEntry(
  householdId: string,
  entryId: string,
  data: Partial<Pick<DiaryEntry, "rating" | "notes" | "imageUrls">>
): Promise<void> {
  const ref = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.diaryEntries,
    entryId
  );
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDiaryEntry(
  householdId: string,
  entryId: string
): Promise<void> {
  const ref = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.diaryEntries,
    entryId
  );
  await deleteDoc(ref);
}
