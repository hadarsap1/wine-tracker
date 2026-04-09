import { create } from "zustand";
import type { User } from "firebase/auth";
import * as authService from "@services/auth";
import * as userService from "@services/user";
import * as householdService from "@services/household";
import type { UserProfile, UserPreferences } from "@/types/index";
import { useInventoryStore } from "./inventoryStore";
import { useDiaryStore } from "./diaryStore";
import * as analytics from "@services/analytics";

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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { displayName: string }) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  reloadProfile: () => Promise<void>;
  renameHousehold: (householdId: string, name: string) => Promise<void>;
  createAdditionalHousehold: (name: string) => Promise<void>;
  setActiveHousehold: (householdId: string) => Promise<void>;
  leaveHousehold: (householdId: string) => Promise<void>;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

/**
 * Ensures the user has a valid profile with at least one household.
 * Handles three cases:
 *  1. No profile → create profile + household
 *  2. Profile exists but householdIds is empty → create household + update profile
 *  3. Profile exists with households → ensure member docs exist
 *
 * Returns the fully bootstrapped profile.
 */
async function bootstrapUserAccount(user: User): Promise<UserProfile | null> {
  const email = user.email ?? "";
  let profile = await userService.getUserProfile(user.uid);

  if (!profile) {
    // Case 1: No profile at all (e.g. Google sign-in before profile creation)
    const displayName = user.displayName ?? email.split("@")[0] ?? "User";
    await userService.createUserProfile(user.uid, email, displayName);
    const householdId = await householdService.createPersonalHousehold(user.uid, displayName, email);
    await userService.updateUserHouseholdIds(user.uid, [householdId]);
    profile = await userService.getUserProfile(user.uid);
  } else if (!profile.householdIds?.length) {
    // Case 2: Profile exists but no household (e.g. updateUserHouseholdIds failed during signup)
    const displayName = user.displayName ?? profile.displayName ?? email.split("@")[0] ?? "User";
    const householdId = await householdService.createPersonalHousehold(user.uid, displayName, email);
    await userService.updateUserHouseholdIds(user.uid, [householdId]);
    profile = await userService.getUserProfile(user.uid);
  } else {
    // Case 3: Bootstrap member docs for users whose member doc may be missing
    const displayName = user.displayName ?? profile.displayName ?? "";
    await Promise.all(
      profile.householdIds.map((hid) =>
        householdService.ensureMemberExists(hid, user.uid, displayName, email)
      )
    );
  }

  return profile;
}

// Tracks the sign-in method across the async gap between signIn() and onAuthStateChanged
let _pendingSignInMethod: 'email' | 'google' | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  initialize: () => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const profile = await bootstrapUserAccount(user);
          analytics.identify(user.uid, {
            email: user.email ?? undefined,
            name: user.displayName ?? profile?.displayName ?? undefined,
          });
          if (_pendingSignInMethod) {
            analytics.track.signedIn(_pendingSignInMethod);
            _pendingSignInMethod = null;
          }
          set({ user, profile, loading: false, error: null });
        } catch {
          // On transient errors (network blip, token refresh), preserve any profile
          // already loaded rather than wiping it — prevents noHousehold on reconnect.
          const existing = get().profile;
          set({ user, profile: existing, loading: false, error: null });
        }
      } else {
        analytics.reset();
        useInventoryStore.getState().reset();
        useDiaryStore.getState().reset();
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
      const householdId = await householdService.createPersonalHousehold(user.uid, displayName, email);
      await userService.updateUserHouseholdIds(user.uid, [householdId]);
      const profile = await userService.getUserProfile(user.uid);
      // Ensure member doc exists right away (onAuthStateChanged may fire after we set state)
      await householdService.ensureMemberExists(householdId, user.uid, displayName, email);
      analytics.identify(user.uid, { email, name: displayName, createdAt: new Date() });
      analytics.track.accountCreated('email');
      set({ user, profile, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  // signIn just authenticates — onAuthStateChanged handles full bootstrap
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      _pendingSignInMethod = 'email';
      await authService.signIn(email, password);
      // State will be set by onAuthStateChanged callback in initialize()
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  // signInWithGoogle just authenticates — onAuthStateChanged handles full bootstrap
  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      _pendingSignInMethod = 'google';
      await authService.signInWithGoogle();
      // State will be set by onAuthStateChanged callback in initialize()
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      analytics.track.signedOut();
      analytics.reset();
      await authService.signOut();
      useInventoryStore.getState().reset();
      useDiaryStore.getState().reset();
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

  reloadProfile: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await userService.getUserProfile(user.uid);
    set({ profile });
  },

  renameHousehold: async (householdId, name) => {
    await householdService.updateHouseholdName(householdId, name);
  },

  createAdditionalHousehold: async (name) => {
    const { user, profile } = get();
    if (!user || !profile) throw new Error("Not authenticated");
    const displayName = user.displayName ?? profile.displayName ?? "User";
    const email = user.email ?? "";
    const newId = await householdService.createPersonalHousehold(user.uid, displayName, email, name);
    const updated = [...(profile.householdIds ?? []), newId];
    await userService.updateUserHouseholdIds(user.uid, updated);
    const newProfile = await userService.getUserProfile(user.uid);
    analytics.track.householdCreated(true);
    set({ profile: newProfile });
  },

  setActiveHousehold: async (householdId) => {
    const { user, profile } = get();
    if (!user || !profile) return;
    const others = (profile.householdIds ?? []).filter((id) => id !== householdId);
    const reordered = [householdId, ...others];
    await userService.updateUserHouseholdIds(user.uid, reordered);
    const newProfile = await userService.getUserProfile(user.uid);
    set({ profile: newProfile });
    // Reset stores so they reload with the new active household
    useInventoryStore.getState().reset();
    useDiaryStore.getState().reset();
  },

  leaveHousehold: async (householdId) => {
    const { user, profile } = get();
    if (!user || !profile) return;
    await householdService.leaveHousehold(householdId, user.uid);
    const updated = (profile.householdIds ?? []).filter((id) => id !== householdId);
    await userService.updateUserHouseholdIds(user.uid, updated);
    const newProfile = await userService.getUserProfile(user.uid);
    set({ profile: newProfile });
  },

  clearError: () => set({ error: null }),
}));
