import AsyncStorage from "@react-native-async-storage/async-storage";

export const AI_JOURNEY_TOUR_KEY = "@vida_em_ordem_ai_journey_tour_v1";
export const AI_JOURNEY_MODULE_TOUR_KEY =
  "@vida_em_ordem_ai_journey_module_tour_v1";

export type JourneyTourState = {
  started: boolean;
  homeCompleted: boolean;
  planCompleted: boolean;
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
};

export type JourneyModuleTourArea =
  | "financeiro"
  | "saude"
  | "habitos"
  | "tempo"
  | "trabalho"
  | "lazer";

export type JourneyModuleTourState = Record<JourneyModuleTourArea, boolean>;

export function normalizeJourneyTourState(
  raw: Partial<JourneyTourState> | null | undefined
): JourneyTourState {
  return {
    started: true,
    homeCompleted: true,
    planCompleted: true,
    completed: true,
    startedAt: raw?.startedAt || new Date(0).toISOString(),
    completedAt: raw?.completedAt || new Date(0).toISOString(),
  };
}

export function normalizeJourneyModuleTourState(
  raw: Partial<JourneyModuleTourState> | null | undefined
): JourneyModuleTourState {
  return {
    financeiro: true,
    saude: true,
    habitos: true,
    tempo: true,
    trabalho: true,
    lazer: true,
  };
}

export async function readJourneyTourState() {
  try {
    const raw = await AsyncStorage.getItem(AI_JOURNEY_TOUR_KEY);
    return normalizeJourneyTourState(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.log("Erro ao ler tour da jornada:", error);
    return normalizeJourneyTourState(null);
  }
}

export async function readJourneyModuleTourState() {
  try {
    const raw = await AsyncStorage.getItem(AI_JOURNEY_MODULE_TOUR_KEY);
    return normalizeJourneyModuleTourState(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.log("Erro ao ler tour dos módulos da jornada:", error);
    return normalizeJourneyModuleTourState(null);
  }
}

export async function startJourneyTour() {
  return normalizeJourneyTourState(null);
}

export async function completeJourneyTourHome() {
  return normalizeJourneyTourState(null);
}

export async function completeJourneyTourPlan() {
  return normalizeJourneyTourState(null);
}

export async function skipJourneyTour() {
  return normalizeJourneyTourState(null);
}

export async function completeJourneyModuleTour(area: JourneyModuleTourArea) {
  return normalizeJourneyModuleTourState(null);
}

export async function skipJourneyModuleTour(area: JourneyModuleTourArea) {
  return completeJourneyModuleTour(area);
}
