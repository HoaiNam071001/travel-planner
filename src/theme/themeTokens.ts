export const THEME_STORAGE_KEY = "travel-planner-theme";

export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedTheme = Exclude<ThemeMode, "system">;

export interface SemanticThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderHover: string;
  primary: string;
  primaryHover: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export const semanticThemeColors: Record<ResolvedTheme, SemanticThemeColors> = {
  light: {
    background: "#F7FAFD",
    surface: "#FFFFFF",
    surfaceSecondary: "#F8FAFC",
    surfaceElevated: "#FFFFFF",
    textPrimary: "#1E293B",
    textSecondary: "#475569",
    textMuted: "#64748B",
    border: "#CBD5E1",
    borderHover: "#94A3B8",
    primary: "#06B6D4",
    primaryHover: "#0891B2",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#0EA5E9",
  },
  dark: {
    background: "#02030B",
    surface: "#0C1324",
    surfaceSecondary: "#10182B",
    surfaceElevated: "#162038",
    textPrimary: "#E2E8F0",
    textSecondary: "#D4DEEE",
    textMuted: "#91A0B8",
    border: "#2A3952",
    borderHover: "#3D4F6A",
    primary: "#22D3EE",
    primaryHover: "#67E8F9",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    info: "#38BDF8",
  },
};

export const themeMetaColor: Record<ResolvedTheme, string> = {
  light: semanticThemeColors.light.background,
  dark: semanticThemeColors.dark.background,
};

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return Boolean(value && THEME_MODES.includes(value as ThemeMode));
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}
