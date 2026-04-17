import { create } from "zustand";
import * as inventoryService from "@services/inventory";
import * as diaryService from "@services/diary";
import type { AppInventoryItem, AppWine, WineType, AppDiaryEntry } from "@/types/index";
import * as analytics from "@services/analytics";

interface InventoryState {
  items: AppInventoryItem[];
  loading: boolean;
  error: string | null;
}

interface InventoryActions {
  loadItems: (householdId: string) => Promise<void>;
  addWine: (
    householdId: string,
    wine: inventoryService.WineFormData,
    inventory: inventoryService.InventoryFormData
  ) => Promise<string>;
  updateItem: (
    householdId: string,
    itemId: string,
    data: Partial<
      Pick<
        AppInventoryItem,
        | "quantity"
        | "location"
        | "purchasePrice"
        | "status"
        | "storageUnitId"
        | "storageRow"
        | "storageCol"
        | "storageSlots"
      >
    >
  ) => Promise<void>;
  openBottle: (
    householdId: string,
    itemId: string,
    wineId: string,
    wineName: string,
    wineType: WineType,
    slotToRemove?: { unitId: string; row: number; col: number }
  ) => Promise<void>;
  updateWine: (
    householdId: string,
    wineId: string,
    data: Partial<
      Pick<
        AppWine,
        "name" | "type" | "producer" | "region" | "country" | "vintage" | "grape" | "notes"
      >
    >,
    itemId: string
  ) => Promise<void>;
  deleteItem: (householdId: string, itemId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export type InventoryStore = InventoryState & InventoryActions;

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  loadItems: async (householdId) => {
    set({ loading: true, error: null });
    try {
      const items = await inventoryService.getInventoryItems(householdId);
      const appItems = items.map((item) => ({
        ...item,
        createdAt: item.createdAt?.toDate?.() ?? new Date(),
        updatedAt: item.updatedAt?.toDate?.() ?? new Date(),
        purchaseDate: item.purchaseDate?.toDate?.() ?? undefined,
      })) as AppInventoryItem[];
      set({ items: appItems, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  addWine: async (householdId, wine, inventory) => {
    set({ loading: true, error: null });
    try {
      const { wineId } = await inventoryService.createWineWithInventory(
        householdId,
        wine,
        inventory
      );
      await get().loadItems(householdId);
      analytics.track.wineAdded({
        wineType: wine.type,
        hasVintage: wine.vintage != null,
        hasStorage: !!inventory.storageUnitId,
        quantity: inventory.quantity,
      });
      return wineId;
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  updateItem: async (householdId, itemId, data) => {
    set({ error: null });
    try {
      await inventoryService.updateInventoryItem(householdId, itemId, data);
      set((state) => ({
        items: state.items.map((item) =>
          item.id === itemId ? { ...item, ...data } : item
        ),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  updateWine: async (householdId, wineId, data, itemId) => {
    set({ error: null });
    try {
      await inventoryService.updateWine(householdId, wineId, data);
      // Update the inventory item's denormalized fields if name/type changed
      const updates: Partial<AppInventoryItem> = {};
      if (data.name) updates.wineName = data.name;
      if (data.type) updates.wineType = data.type;
      if (Object.keys(updates).length > 0) {
        await inventoryService.updateInventoryItem(householdId, itemId, updates);
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        }));
      }
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  deleteItem: async (householdId, itemId) => {
    set({ error: null });
    try {
      await inventoryService.deleteInventoryItem(householdId, itemId);
      analytics.track.wineDeleted();
      set((state) => ({
        items: state.items.filter((item) => item.id !== itemId),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  openBottle: async (householdId, itemId, wineId, wineName, wineType, slotToRemove?) => {
    set({ error: null });
    try {
      const item = get().items.find((i) => i.id === itemId);
      const qty = item?.quantity ?? 1;
      const entryId = diaryService.generateEntryId(householdId);
      // Legacy items use storageUnitId/storageRow/storageCol instead of storageSlots[]
      const isLegacySlot = !!slotToRemove && !item?.storageSlots?.length;

      const deleted = await inventoryService.openBottle(
        householdId,
        itemId,
        qty,
        { entryId, wineId, wineName, wineType },
        slotToRemove,
        isLegacySlot
      );
      analytics.track.bottleOpened();

      if (deleted) {
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        }));
      } else {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  quantity: i.quantity - 1,
                  storageSlots: slotToRemove
                    ? (i.storageSlots ?? []).filter(
                        (s) => !(s.unitId === slotToRemove.unitId && s.row === slotToRemove.row && s.col === slotToRemove.col)
                      )
                    : i.storageSlots,
                }
              : i
          ),
        }));
      }
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({ items: [], loading: false, error: null }),
}));
