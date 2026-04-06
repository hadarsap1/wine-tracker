import { create } from "zustand";
import * as cellarService from "@services/cellar";
import type { AppStorageUnit } from "@/types/index";

interface CellarState {
  units: AppStorageUnit[];
  loading: boolean;
}

interface CellarActions {
  loadUnits: (householdId: string) => Promise<void>;
  addUnit: (
    householdId: string,
    data: { name: string; type: "fridge" | "rack"; rows: number; cols: number }
  ) => Promise<void>;
  updateUnit: (
    householdId: string,
    unitId: string,
    data: { name?: string; rows?: number; cols?: number }
  ) => Promise<void>;
  deleteUnit: (householdId: string, unitId: string) => Promise<void>;
  reset: () => void;
}

export const useCellarStore = create<CellarState & CellarActions>(
  (set, get) => ({
    units: [],
    loading: false,

    loadUnits: async (householdId) => {
      set({ loading: true });
      try {
        const units = await cellarService.getStorageUnits(householdId);
        const appUnits = units.map((u) => ({
          ...u,
          createdAt: u.createdAt?.toDate?.() ?? new Date(),
          updatedAt: u.updatedAt?.toDate?.() ?? new Date(),
        })) as AppStorageUnit[];
        set({ units: appUnits, loading: false });
      } catch {
        set({ loading: false });
      }
    },

    addUnit: async (householdId, data) => {
      const id = await cellarService.createStorageUnit(householdId, data);
      // Reload to get server timestamps converted
      await get().loadUnits(householdId);
      // Suppress unused variable lint warning — id used as side effect via reload
      void id;
    },

    updateUnit: async (householdId, unitId, data) => {
      await cellarService.updateStorageUnit(householdId, unitId, data);
      set((state) => ({
        units: state.units.map((u) =>
          u.id === unitId ? { ...u, ...data } : u
        ),
      }));
    },

    deleteUnit: async (householdId, unitId) => {
      await cellarService.deleteStorageUnit(householdId, unitId);
      set((state) => ({
        units: state.units.filter((u) => u.id !== unitId),
      }));
    },

    reset: () => set({ units: [], loading: false }),
  })
);
