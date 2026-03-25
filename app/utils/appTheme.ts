export type AppTheme = "dark" | "light" | "system";
export type SubscriptionPlan = "free" | "premium";
export type InactivityLockMinutes = 0 | 1 | 3 | 5 | 10;
export type RegionPreference = "auto" | "BR" | "US" | "ES" | "FR" | "IT";
export type CurrencyPreference = "auto" | "BRL" | "USD" | "EUR";

export type AppSettings = {
  theme: AppTheme;
  accentColor: string;
  inactivityLockMinutes: InactivityLockMinutes;
  plan: SubscriptionPlan;
  regionPreference: RegionPreference;
  currencyPreference: CurrencyPreference;
};

export const APP_SETTINGS_KEY = "@vida_em_ordem_app_settings_v1";
export const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  accentColor: "#2563eb",
  inactivityLockMinutes: 0,
  plan: "free",
  regionPreference: "auto",
  currencyPreference: "auto",
};

export function resolveAppTheme(
  theme: AppTheme,
  systemTheme: "dark" | "light" | null | undefined = "light"
) {
  if (theme === "system") {
    return systemTheme === "dark" ? "dark" : "light";
  }

  return theme;
}

export function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");

  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;

  const bigint = parseInt(normalized, 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getContrastTextColor(hex: string) {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);

  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0B0F14" : "#F8FAFC";
}

function getVisualAccentColor(
  theme: AppTheme,
  accentColor: string,
  systemTheme: "dark" | "light" | null | undefined = "light"
) {
  const resolvedTheme = resolveAppTheme(theme, systemTheme);
  const clean = accentColor.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);

  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.82) {
    return resolvedTheme === "dark" ? "#E5E7EB" : "#1F2937";
  }

  return accentColor;
}

export function getThemeColors(
  theme: AppTheme,
  accentColor: string,
  systemTheme: "dark" | "light" | null | undefined = "light"
) {
  const resolvedTheme = resolveAppTheme(theme, systemTheme);
  const isDark = resolvedTheme === "dark";
  const visualAccent = getVisualAccentColor(theme, accentColor, systemTheme);
  const isWhiteAccentButton =
    !isDark && visualAccent === "#1F2937" && accentColor.toLowerCase() === "#ffffff";
  const accentButtonBackground = isWhiteAccentButton ? "#FFFFFF" : visualAccent;
  const accentButtonBorder = isWhiteAccentButton
    ? "rgba(15,23,42,0.14)"
    : hexToRgba(visualAccent, isDark ? 0.28 : 0.2);
  const accentButtonText = isWhiteAccentButton
    ? "#111827"
    : getContrastTextColor(visualAccent);

  return {
    isDark,
    themePreference: theme,
    resolvedTheme,
    accent: visualAccent,
    accentRaw: accentColor,
    accentContrast: getContrastTextColor(visualAccent),
    isWhiteAccentButton,
    accentButtonBackground,
    accentButtonBorder,
    accentButtonText,

    background: isDark ? "#090A0C" : "#F4F6F8",
    surface: isDark ? "#0F1115" : "#FCFCFD",
    surfaceAlt: isDark ? "#141821" : "#EEF2F6",
    surfaceMuted: isDark ? "#1D1F23" : "#E3E8EF",

    text: isDark ? "#F5F7FB" : "#111827",
    textSecondary: isDark ? "#A8B0C0" : "#6B7280",
    textMuted: isDark ? "#8A93A6" : "#4B5563",

    border: isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(17,24,39,0.08)",

    accentSoft: hexToRgba(visualAccent, isDark ? 0.18 : 0.14),
    accentBorder: hexToRgba(visualAccent, isDark ? 0.28 : 0.2),

    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",

    successSoft: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.10)",
    warningSoft: isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.10)",
    dangerSoft: isDark ? "rgba(239,68,68,0.10)" : "rgba(239,68,68,0.10)",

    overlay: isDark ? "rgba(3,6,12,0.76)" : "rgba(15,23,42,0.24)",
    shadow: "#000000",
  };
}
