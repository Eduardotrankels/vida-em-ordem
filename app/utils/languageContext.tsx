import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  APP_LANGUAGE_KEY,
  AppLanguage,
  DEFAULT_APP_LANGUAGE,
  detectDeviceLanguage,
  resolveAppLanguage,
  translate,
} from "./i18n";

type LanguageContextValue = {
  language: AppLanguage;
  isLanguageReady: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  reloadLanguage: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  const reloadLanguage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(APP_LANGUAGE_KEY);

      if (!raw) {
        setLanguageState(detectDeviceLanguage());
        return;
      }

      setLanguageState(resolveAppLanguage(raw));
    } catch (error) {
      console.log("Erro ao carregar idioma:", error);
      setLanguageState(detectDeviceLanguage() || DEFAULT_APP_LANGUAGE);
    } finally {
      setIsLanguageReady(true);
    }
  }, []);

  useEffect(() => {
    void reloadLanguage();
  }, [reloadLanguage]);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    const safeLanguage = resolveAppLanguage(nextLanguage);
    setLanguageState(safeLanguage);
    await AsyncStorage.setItem(APP_LANGUAGE_KEY, safeLanguage);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isLanguageReady,
      setLanguage,
      reloadLanguage,
      t,
    }),
    [isLanguageReady, language, reloadLanguage, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useAppLanguage precisa ser usado dentro de LanguageProvider");
  }

  return context;
}
