import { create } from "zustand";
import * as diaryService from "@services/diary";
import { deleteImage } from "@services/storage";
import type { AppDiaryEntry } from "@/types/index";

interface DiaryState {
  entries: AppDiaryEntry[];
  loading: boolean;
  error: string | null;
}

interface DiaryActions {
  loadEntries: (householdId: string) => Promise<void>;
  addEntry: (
    householdId: string,
    entryId: string,
    data: diaryService.DiaryFormData
  ) => Promise<void>;
  updateEntry: (
    householdId: string,
    entryId: string,
    data: Partial<Pick<AppDiaryEntry, "rating" | "notes" | "imageUrls" | "wantToOrder">>
  ) => Promise<void>;
  deleteEntry: (householdId: string, entryId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export type DiaryStore = DiaryState & DiaryActions;

export const useDiaryStore = create<DiaryStore>((set, get) => ({
  entries: [],
  loading: false,
  error: null,

  loadEntries: async (householdId) => {
    set({ loading: true, error: null });
    try {
      const entries = await diaryService.getDiaryEntries(householdId);
      const appEntries = entries.map((entry) => ({
        ...entry,
        tastingDate: entry.tastingDate?.toDate?.() ?? new Date(),
        createdAt: entry.createdAt?.toDate?.() ?? new Date(),
        updatedAt: entry.updatedAt?.toDate?.() ?? new Date(),
      })) as AppDiaryEntry[];
      set({ entries: appEntries, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  addEntry: async (householdId, entryId, data) => {
    set({ loading: true, error: null });
    try {
      await diaryService.createDiaryEntry(householdId, entryId, data);
      await get().loadEntries(householdId);
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  updateEntry: async (householdId, entryId, data) => {
    set({ error: null });
    try {
      await diaryService.updateDiaryEntry(householdId, entryId, data);
      set((state) => ({
        entries: state.entries.map((entry) =>
          entry.id === entryId ? { ...entry, ...data } : entry
        ),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  deleteEntry: async (householdId, entryId) => {
    set({ error: null });
    try {
      const entry = get().entries.find((e) => e.id === entryId);
      if (entry?.imageUrls?.length) {
        await Promise.all(entry.imageUrls.map((url) => deleteImage(url)));
      }
      await diaryService.deleteDiaryEntry(householdId, entryId);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== entryId),
      }));
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({ entries: [], loading: false, error: null }),
}));
