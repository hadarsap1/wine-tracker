import { create } from "zustand";

interface SnackbarState {
  visible: boolean;
  message: string;
  type: "info" | "success" | "error";
}

interface SnackbarActions {
  show: (message: string, type?: SnackbarState["type"]) => void;
  hide: () => void;
}

export const useSnackbarStore = create<SnackbarState & SnackbarActions>((set) => ({
  visible: false,
  message: "",
  type: "info",

  show: (message, type = "info") => set({ visible: true, message, type }),
  hide: () => set({ visible: false }),
}));
