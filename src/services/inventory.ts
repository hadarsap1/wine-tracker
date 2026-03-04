import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@config/firebase";
import {
  COLLECTIONS,
  type Wine,
  type InventoryItem,
  type CreateWine,
  type CreateInventoryItem,
  type WineType,
} from "@/types/index";

function winesCol(householdId: string) {
  return collection(db, COLLECTIONS.households, householdId, COLLECTIONS.wines);
}

function inventoryCol(householdId: string) {
  return collection(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.inventoryItems
  );
}

export interface WineFormData {
  name: string;
  type: WineType;
  producer?: string;
  region?: string;
  country?: string;
  vintage?: number;
  grape?: string;
  notes?: string;
}

export interface InventoryFormData {
  quantity: number;
  location?: string;
  purchasePrice?: number;
}

export async function createWineWithInventory(
  householdId: string,
  wineData: WineFormData,
  inventoryData: InventoryFormData
): Promise<{ wineId: string; itemId: string }> {
  const batch = writeBatch(db);

  const wineRef = doc(winesCol(householdId));
  const wine: Record<string, unknown> = {
    name: wineData.name,
    nameNormalized: wineData.name.toLowerCase().trim(),
    type: wineData.type,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (wineData.producer) wine.producer = wineData.producer;
  if (wineData.region) wine.region = wineData.region;
  if (wineData.country) wine.country = wineData.country;
  if (wineData.vintage) wine.vintage = wineData.vintage;
  if (wineData.grape) wine.grape = wineData.grape;
  if (wineData.notes) wine.notes = wineData.notes;
  batch.set(wineRef, wine);

  const itemRef = doc(inventoryCol(householdId));
  const item: Record<string, unknown> = {
    wineId: wineRef.id,
    wineName: wineData.name,
    wineType: wineData.type,
    quantity: inventoryData.quantity,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (inventoryData.location) item.location = inventoryData.location;
  if (inventoryData.purchasePrice) item.purchasePrice = inventoryData.purchasePrice;
  batch.set(itemRef, item);

  await batch.commit();

  return { wineId: wineRef.id, itemId: itemRef.id };
}

export async function getInventoryItems(
  householdId: string
): Promise<InventoryItem[]> {
  const q = query(inventoryCol(householdId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem);
}

export async function getWine(
  householdId: string,
  wineId: string
): Promise<Wine | null> {
  const snap = await getDoc(
    doc(db, COLLECTIONS.households, householdId, COLLECTIONS.wines, wineId)
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Wine;
}

export async function updateInventoryItem(
  householdId: string,
  itemId: string,
  data: Partial<Pick<InventoryItem, "quantity" | "location" | "purchasePrice">>
): Promise<void> {
  const ref = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.inventoryItems,
    itemId
  );
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function updateWine(
  householdId: string,
  wineId: string,
  data: Partial<
    Pick<
      Wine,
      | "name"
      | "type"
      | "producer"
      | "region"
      | "country"
      | "vintage"
      | "grape"
      | "notes"
    >
  >
): Promise<void> {
  const ref = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.wines,
    wineId
  );
  const updates: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  if (data.name) {
    updates.nameNormalized = data.name.toLowerCase().trim();
  }
  await updateDoc(ref, updates);
}

export async function deleteInventoryItem(
  householdId: string,
  itemId: string
): Promise<void> {
  const ref = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.inventoryItems,
    itemId
  );
  await deleteDoc(ref);
}

export async function getWines(householdId: string): Promise<Wine[]> {
  const q = query(winesCol(householdId), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Wine);
}

export async function createWineOnly(
  householdId: string,
  wineData: WineFormData
): Promise<string> {
  const wine: Record<string, unknown> = {
    name: wineData.name,
    nameNormalized: wineData.name.toLowerCase().trim(),
    type: wineData.type,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (wineData.producer) wine.producer = wineData.producer;
  if (wineData.region) wine.region = wineData.region;
  if (wineData.country) wine.country = wineData.country;
  if (wineData.vintage) wine.vintage = wineData.vintage;
  if (wineData.grape) wine.grape = wineData.grape;
  if (wineData.notes) wine.notes = wineData.notes;
  const docRef = await addDoc(winesCol(householdId), wine);
  return docRef.id;
}
