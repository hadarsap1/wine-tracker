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
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
  increment,
  deleteField,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@config/firebase";
import {
  COLLECTIONS,
  type Wine,
  type VivinoData,
  type InventoryItem,
  type InventoryStatus,
  type WineType,
  type Rating,
  type StorageSlot,
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
  vivinoData?: VivinoData;
}

export interface InventoryFormData {
  quantity: number;
  status?: InventoryStatus;
  location?: string;
  purchasePrice?: number;
  storageSlots?: StorageSlot[];
  // legacy single-slot fields (kept for old callers):
  storageUnitId?: string;
  storageRow?: number;
  storageCol?: number;
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
  if (wineData.vivinoData) wine.vivinoData = wineData.vivinoData;
  batch.set(wineRef, wine);

  const itemRef = doc(inventoryCol(householdId));
  const item: Record<string, unknown> = {
    wineId: wineRef.id,
    wineName: wineData.name,
    wineType: wineData.type,
    quantity: inventoryData.quantity,
    status: inventoryData.status ?? "in_stock",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (wineData.producer) item.producerName = wineData.producer;
  if (inventoryData.location) item.location = inventoryData.location;
  if (inventoryData.purchasePrice) item.purchasePrice = inventoryData.purchasePrice;
  if (inventoryData.storageUnitId) item.storageUnitId = inventoryData.storageUnitId;
  if (inventoryData.storageRow !== undefined) item.storageRow = inventoryData.storageRow;
  if (inventoryData.storageCol !== undefined) item.storageCol = inventoryData.storageCol;
  if (inventoryData.storageSlots?.length) item.storageSlots = inventoryData.storageSlots;
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

/**
 * Subscribes to live inventory updates for a household. Fires the callback on
 * every change (including other members' edits) so shared cellars stay in sync
 * without manual refresh. Returns an unsubscribe function.
 */
export function subscribeInventoryItems(
  householdId: string,
  onData: (items: InventoryItem[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(inventoryCol(householdId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem)),
    (e) => onError?.(e)
  );
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

export async function assignSlot(
  householdId: string,
  itemId: string,
  slot: { storageUnitId: string; storageRow: number; storageCol: number } | null
): Promise<void> {
  const ref = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.inventoryItems,
    itemId
  );
  if (slot) {
    await updateDoc(ref, {
      storageUnitId: slot.storageUnitId,
      storageRow: slot.storageRow,
      storageCol: slot.storageCol,
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      storageUnitId: deleteField(),
      storageRow: deleteField(),
      storageCol: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function updateInventoryItem(
  householdId: string,
  itemId: string,
  data: Partial<
    Pick<
      InventoryItem,
      | "quantity"
      | "location"
      | "purchasePrice"
      | "status"
      | "storageUnitId"
      | "storageRow"
      | "storageCol"
      | "storageSlots"
      | "wineName"
      | "wineType"
    >
  >
): Promise<void> {
  const ref = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.inventoryItems,
    itemId
  );
  const OPTIONAL_ITEM_FIELDS = ["location", "purchasePrice", "storageUnitId", "storageRow", "storageCol"] as const;
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.quantity !== undefined) updates.quantity = data.quantity;
  if (data.status !== undefined) updates.status = data.status;
  if (data.wineName !== undefined) updates.wineName = data.wineName;
  if (data.wineType !== undefined) updates.wineType = data.wineType;
  for (const field of OPTIONAL_ITEM_FIELDS) {
    if (field in data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updates[field] = (data as any)[field] === undefined ? deleteField() : (data as any)[field];
    }
  }
  if ('storageSlots' in data) {
    updates['storageSlots'] =
      (data as { storageSlots?: StorageSlot[] }).storageSlots === undefined
        ? deleteField()
        : (data as { storageSlots?: StorageSlot[] }).storageSlots;
  }
  await updateDoc(ref, updates);
}

const OPTIONAL_WINE_FIELDS = [
  "producer",
  "region",
  "country",
  "vintage",
  "grape",
  "notes",
  "vivinoData",
  "imageUrl",
] as const;

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
      | "vivinoData"
      | "imageUrl"
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
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.name !== undefined) {
    updates.name = data.name;
    updates.nameNormalized = data.name.toLowerCase().trim();
  }
  if (data.type !== undefined) updates.type = data.type;
  for (const field of OPTIONAL_WINE_FIELDS) {
    if (field in data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updates[field] = (data as any)[field] === undefined ? deleteField() : (data as any)[field];
    }
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

/**
 * Atomically decrements (or removes) inventory item AND creates a diary entry.
 * Runs in a transaction that reads the CURRENT quantity server-side, so two
 * household members opening bottles concurrently can't drive quantity negative
 * or double-delete the item.
 * Returns whether the inventory item was deleted (server quantity was <= 1).
 */
export async function openBottle(
  householdId: string,
  itemId: string,
  diary: { entryId: string; wineId: string; wineName: string; wineType: WineType },
  slotToRemove?: StorageSlot,
  /** Pass true when the item uses legacy storageUnitId/storageRow/storageCol fields (not storageSlots[]) */
  isLegacySlot?: boolean
): Promise<boolean> {
  const itemRef = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.inventoryItems,
    itemId
  );
  const diaryRef = doc(
    db,
    COLLECTIONS.households,
    householdId,
    COLLECTIONS.diaryEntries,
    diary.entryId
  );

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists()) {
      throw new Error("item_not_found");
    }
    const currentQuantity = (snap.data().quantity as number) ?? 0;

    const deleted = currentQuantity <= 1;
    if (deleted) {
      tx.delete(itemRef);
    } else {
      const updateData: Record<string, unknown> = {
        quantity: increment(-1),
        updatedAt: serverTimestamp(),
      };
      if (slotToRemove) {
        if (isLegacySlot) {
          // Legacy single-slot item: clear the individual fields
          updateData.storageUnitId = deleteField();
          updateData.storageRow = deleteField();
          updateData.storageCol = deleteField();
        } else {
          // New storageSlots[] format: remove just this slot from the array
          updateData.storageSlots = arrayRemove(slotToRemove);
        }
      }
      tx.update(itemRef, updateData);
    }

    tx.set(diaryRef, {
      wineId: diary.wineId,
      wineName: diary.wineName,
      wineType: diary.wineType,
      rating: null as Rating | null,
      imageUrls: [],
      inventoryItemId: itemId,
      tastingDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return deleted;
  });
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
  if (wineData.vivinoData) wine.vivinoData = wineData.vivinoData;
  const docRef = await addDoc(winesCol(householdId), wine);
  return docRef.id;
}
