import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
} from "./appTheme";

const APP_UNLOCKED_KEY = "@vida_em_ordem_app_unlocked_v1";

type LockCallback = () => void;

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let currentTimeoutMs = 0;
let currentCallback: LockCallback | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let isStarted = false;
let isLocking = false;

function minutesToMs(minutes: number) {
  return minutes * 60 * 1000;
}

async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    const parsedSettings = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;

    return {
      theme:
        parsedSettings?.theme === "light" ||
        parsedSettings?.theme === "system"
          ? parsedSettings.theme
          : "dark",
      accentColor: parsedSettings?.accentColor || DEFAULT_SETTINGS.accentColor,
      inactivityLockMinutes:
        parsedSettings?.inactivityLockMinutes === 1 ||
        parsedSettings?.inactivityLockMinutes === 3 ||
        parsedSettings?.inactivityLockMinutes === 5 ||
        parsedSettings?.inactivityLockMinutes === 10
          ? parsedSettings.inactivityLockMinutes
          : 0,
      plan: parsedSettings?.plan === "premium" ? "premium" : "free",
      regionPreference:
        parsedSettings?.regionPreference === "BR" ||
        parsedSettings?.regionPreference === "US" ||
        parsedSettings?.regionPreference === "ES" ||
        parsedSettings?.regionPreference === "FR" ||
        parsedSettings?.regionPreference === "IT"
          ? parsedSettings.regionPreference
          : "auto",
      currencyPreference:
        parsedSettings?.currencyPreference === "BRL" ||
        parsedSettings?.currencyPreference === "USD" ||
        parsedSettings?.currencyPreference === "EUR"
          ? parsedSettings.currencyPreference
          : "auto",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

async function performLock() {
  if (isLocking || !currentCallback) return;

  try {
    isLocking = true;
    await AsyncStorage.setItem(APP_UNLOCKED_KEY, "false");
    currentCallback();
  } catch (error) {
    console.log("Erro ao bloquear por inatividade:", error);
  } finally {
    setTimeout(() => {
      isLocking = false;
    }, 400);
  }
}

function startTimer() {
  clearInactivityTimer();

  if (!isStarted || currentTimeoutMs <= 0) return;

  inactivityTimer = setTimeout(() => {
    performLock();
  }, currentTimeoutMs);
}

async function refreshTimeoutFromSettings() {
  const settings = await loadSettings();
  currentTimeoutMs = minutesToMs(settings.inactivityLockMinutes);
}

async function handleAppStateChange(nextAppState: AppStateStatus) {
  if (!isStarted) return;

  if (nextAppState === "active") {
    startTimer();
  } else if (nextAppState === "background" || nextAppState === "inactive") {
    clearInactivityTimer();
  }
}

export async function startInactivityWatcher(onLock: LockCallback) {
  currentCallback = onLock;
  await refreshTimeoutFromSettings();

  clearInactivityTimer();

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
  isStarted = true;
  startTimer();
}

export function stopInactivityWatcher() {
  isStarted = false;
  clearInactivityTimer();
  currentCallback = null;

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

export function resetInactivityWatcher() {
  if (!isStarted || currentTimeoutMs <= 0) return;
  startTimer();
}

export async function reloadInactivityWatcherConfig() {
  if (!isStarted) return;
  await refreshTimeoutFromSettings();
  startTimer();
}
