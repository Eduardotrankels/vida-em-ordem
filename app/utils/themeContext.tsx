import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useColorScheme } from "react-native";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  CurrencyPreference,
  DEFAULT_SETTINGS,
  RegionPreference,
  SUBSCRIPTION_PLAN_KEY,
  getThemeColors,
} from "./appTheme";
import { setLocalePreferences } from "./locale";

type ThemeContextValue = {
  settings: AppSettings;
  colors: ReturnType<typeof getThemeColors>;
  isThemeReady: boolean;
  setAppSettings: (next: AppSettings) => Promise<void>;
  patchAppSettings: (partial: Partial<AppSettings>) => Promise<void>;
  reloadAppSettings: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSafeSettings(parsed: any, storedPlan?: string | null): AppSettings {
  const safeRegionPreference: RegionPreference =
    parsed?.regionPreference === "BR" ||
    parsed?.regionPreference === "US" ||
    parsed?.regionPreference === "ES" ||
    parsed?.regionPreference === "FR" ||
    parsed?.regionPreference === "IT"
      ? parsed.regionPreference
      : "auto";

  const safeCurrencyPreference: CurrencyPreference =
    parsed?.currencyPreference === "BRL" ||
    parsed?.currencyPreference === "USD" ||
    parsed?.currencyPreference === "EUR"
      ? parsed.currencyPreference
      : "auto";

  return {
    theme:
      parsed?.theme === "dark" ||
      parsed?.theme === "system"
        ? parsed.theme
        : "light",
    accentColor: parsed?.accentColor || DEFAULT_SETTINGS.accentColor,
    inactivityLockMinutes:
      parsed?.inactivityLockMinutes === 1 ||
      parsed?.inactivityLockMinutes === 3 ||
      parsed?.inactivityLockMinutes === 5 ||
      parsed?.inactivityLockMinutes === 10
        ? parsed.inactivityLockMinutes
        : 0,
    plan:
      storedPlan === "premium" || parsed?.plan === "premium"
        ? "premium"
        : "free",
    regionPreference: safeRegionPreference,
    currencyPreference: safeCurrencyPreference,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isThemeReady, setIsThemeReady] = useState(false);
  const systemColorScheme = useColorScheme();

  const reloadAppSettings = useCallback(async () => {
    try {
      const [raw, storedPlan] = await Promise.all([
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
      ]);
      const parsed = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
      const safe = getSafeSettings(parsed, storedPlan);
      setSettings(safe);
      await Promise.all([
        AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(safe)),
        AsyncStorage.setItem(SUBSCRIPTION_PLAN_KEY, safe.plan),
      ]);
    } catch (error) {
      console.log("Erro ao recarregar tema:", error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsThemeReady(true);
    }
  }, []);

  useEffect(() => {
    reloadAppSettings();
  }, [reloadAppSettings]);

  useEffect(() => {
    setLocalePreferences({
      regionPreference: settings.regionPreference,
      currencyPreference: settings.currencyPreference,
    });
  }, [settings.regionPreference, settings.currencyPreference]);

  const setAppSettings = useCallback(async (next: AppSettings) => {
    const safe = getSafeSettings(next, next.plan);
    setSettings(safe);
    await Promise.all([
      AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(safe)),
      AsyncStorage.setItem(SUBSCRIPTION_PLAN_KEY, safe.plan),
    ]);
  }, []);

  const patchAppSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      setSettings((current) => {
        const merged = getSafeSettings(
          { ...current, ...partial },
          partial.plan ?? current.plan
        );
        Promise.all([
          AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(merged)),
          AsyncStorage.setItem(SUBSCRIPTION_PLAN_KEY, merged.plan),
        ]).catch((error) => {
          console.log("Erro ao salvar tema:", error);
        });
        return merged;
      });
    },
    []
  );

  const colors = useMemo(() => {
    return getThemeColors(
      settings.theme,
      settings.accentColor,
      systemColorScheme
    );
  }, [settings.theme, settings.accentColor, systemColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      colors,
      isThemeReady,
      setAppSettings,
      patchAppSettings,
      reloadAppSettings,
    }),
    [
      settings,
      colors,
      isThemeReady,
      setAppSettings,
      patchAppSettings,
      reloadAppSettings,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme precisa ser usado dentro de ThemeProvider");
  }

  return context;
}
