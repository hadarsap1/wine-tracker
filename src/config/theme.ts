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
