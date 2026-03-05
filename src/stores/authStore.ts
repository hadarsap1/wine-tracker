import { create } from "zustand";
import type { User } from "firebase/auth";
import * as authService from "@services/auth";
import * as userService from "@services/user";
import * as householdService from "@services/household";
import type { UserProfile, UserPreferences } from "@/types/index";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => () => void;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { displayName: string }) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  initialize: () => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const profile = await userService.getUserProfile(user.uid);
          set({ user, profile, loading: false, error: null });
        } catch {
          set({ user, profile: null, loading: false, error: null });
        }
      } else {
        set({ user: null, profile: null, loading: false, error: null });
      }
    });
    return unsubscribe;
  },

  signUp: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signUp(email, password, displayName);
      await userService.createUserProfile(user.uid, email, displayName);
      const householdId = await householdService.createPersonalHousehold(
        user.uid,
        displayName
      );
      await userService.updateUserHouseholdIds(user.uid, [householdId]);
      const profile = await userService.getUserProfile(user.uid);
      set({ user, profile, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const user = await authService.signIn(email, password);
      const profile = await userService.getUserProfile(user.uid);
      set({ user, profile, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await authService.signOut();
      set({ user: null, profile: null, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  updateProfile: async (data) => {
    const { user, profile } = get();
    if (!user || !profile) throw new Error("Not authenticated");
    await userService.updateUserProfile(user.uid, data);
    set({ profile: { ...profile, ...data } });
  },

  updatePreferences: async (prefs) => {
    const { user, profile } = get();
    if (!user || !profile) throw new Error("Not authenticated");
    await userService.updateUserPreferences(user.uid, prefs);
    set({
      profile: {
        ...profile,
        preferences: { ...profile.preferences, ...prefs },
      },
    });
  },

  clearError: () => set({ error: null }),
}));
