import { MD3DarkTheme } from "react-native-paper";
import {
  DarkTheme as NavigationDarkTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";

// ─── Color Palette ──────────────────────────────────────────────────────────

export const colors = {
  primary: "#8b1a2e",
  primaryLight: "#a52236",
  gold: "#c9a84c",
  surface: "#0d0d1a",
  surfaceVariant: "#141428",
  background: "#0d0d1a",
  card: "#141428",
  text: "#ffffff",
  textSecondary: "#a0a0c0",
  border: "#1e1e3a",
  error: "#cf6679",
  onPrimary: "#ffffff",
  vivinoRed: "#b01e28",

  // Elevated surface for cards that sit on `background` — slightly lifted so
  // cards read as objects rather than flat regions.
  cardElevated: "#191934",
  // Hairline gold used for card outlines (the signature look from the design
  // mockups). Kept low-alpha so it reads as a rim-light, not a hard border.
  goldHairline: "rgba(201, 168, 76, 0.28)",
  goldSoft: "rgba(201, 168, 76, 0.14)",
  crimsonSoft: "rgba(139, 26, 46, 0.22)",
} as const;

// ─── Design Tokens ──────────────────────────────────────────────────────────
// Shared scale so screens stop inventing their own radii/spacing/shadows.

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Soft drop shadow that gives cards depth against the dark background. */
export const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.45,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
} as const;

/** Crimson glow used behind the primary FAB, per the design mockups. */
export const primaryGlow = {
  shadowColor: colors.primary,
  shadowOpacity: 0.75,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 0 },
  elevation: 12,
} as const;

// ─── Paper Theme ────────────────────────────────────────────────────────────

export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    background: colors.background,
    error: colors.error,
    onPrimary: colors.onPrimary,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
  },
};

// ─── Navigation Theme ───────────────────────────────────────────────────────

export const navigationTheme: NavigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    background: colors.background,
    card: colors.card,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};
