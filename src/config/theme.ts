import { MD3DarkTheme } from "react-native-paper";
import {
  DarkTheme as NavigationDarkTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";

// ─── Color Palette ──────────────────────────────────────────────────────────

export const colors = {
  primary: "#e94560",
  primaryLight: "#ff6b81",
  surface: "#1a1a2e",
  surfaceVariant: "#22223a",
  background: "#1a1a2e",
  card: "#22223a",
  text: "#ffffff",
  textSecondary: "#a0a0b8",
  border: "#2a2a4a",
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
