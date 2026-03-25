import AsyncStorage from "@react-native-async-storage/async-storage";

export const APP_INTRO_TOUR_KEY = "@vida_em_ordem_app_intro_tour_v1";

export type AppIntroTourState = {
  prompted: boolean;
  completed: boolean;
  skipped: boolean;
  promptedAt?: string;
  completedAt?: string;
  skippedAt?: string;
};

export function normalizeAppIntroTourState(
  raw: Partial<AppIntroTourState> | null | undefined
): AppIntroTourState {
  return {
    prompted: Boolean(raw?.prompted),
    completed: Boolean(raw?.completed),
    skipped: Boolean(raw?.skipped),
    promptedAt: raw?.promptedAt,
    completedAt: raw?.completedAt,
    skippedAt: raw?.skippedAt,
  };
}

export async function readAppIntroTourState() {
  try {
    const raw = await AsyncStorage.getItem(APP_INTRO_TOUR_KEY);
    return normalizeAppIntroTourState(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.log("Erro ao ler tour introdutório:", error);
    return normalizeAppIntroTourState(null);
  }
}

async function persistAppIntroTourState(nextState: AppIntroTourState) {
  await AsyncStorage.setItem(APP_INTRO_TOUR_KEY, JSON.stringify(nextState));
  return nextState;
}

export async function markAppIntroTourPrompted() {
  const nextState = normalizeAppIntroTourState({
    prompted: true,
    completed: false,
    skipped: false,
    promptedAt: new Date().toISOString(),
  });

  return persistAppIntroTourState(nextState);
}

export async function skipAppIntroTour() {
  const nextState = normalizeAppIntroTourState({
    prompted: true,
    completed: false,
    skipped: true,
    promptedAt: new Date().toISOString(),
    skippedAt: new Date().toISOString(),
  });

  return persistAppIntroTourState(nextState);
}

export async function completeAppIntroTour() {
  const nextState = normalizeAppIntroTourState({
    prompted: true,
    completed: true,
    skipped: false,
    promptedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  return persistAppIntroTourState(nextState);
}
