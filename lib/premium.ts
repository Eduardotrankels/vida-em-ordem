import AsyncStorage from "@react-native-async-storage/async-storage";

const PREMIUM_KEY = "@vida_em_ordem_subscription_plan_v1";

export type PremiumPlan = "monthly" | "annual" | "lifetime";

export type PremiumState = {
  isPremium: boolean;
  plan: PremiumPlan | null;
  activatedAt: string | null;
};

export async function getPremiumState(): Promise<PremiumState> {
  const raw = await AsyncStorage.getItem(PREMIUM_KEY);
  if (!raw) {
    return { isPremium: false, plan: null, activatedAt: null };
  }
  try {
    return JSON.parse(raw) as PremiumState;
  } catch {
    return { isPremium: false, plan: null, activatedAt: null };
  }
}

export async function setPremium(plan: PremiumPlan): Promise<void> {
  const state: PremiumState = {
    isPremium: true,
    plan,
    activatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(state));
}

export async function clearPremium(): Promise<void> {
  await AsyncStorage.removeItem(PREMIUM_KEY);
}