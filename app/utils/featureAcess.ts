import { AppSettings } from "./appTheme";

export function isPremium(settings: AppSettings) {
  return settings.plan === "premium";
}

// ===== HABITOS =====
export function canAddHabit(settings: AppSettings, currentCount: number) {
  if (settings.plan === "premium") return true;
  return currentCount < 5; // FREE limitado a 5 hábitos
}

// ===== DESAFIOS =====
export function canStartChallenge(settings: AppSettings, activeCount: number) {
  if (settings.plan === "premium") return true;
  return activeCount < 1; // FREE só 1 desafio
}

// ===== DINHEIRO =====
export function canConnectBank(settings: AppSettings) {
  return settings.plan === "premium";
}

export function canViewAdvancedReports(settings: AppSettings) {
  return settings.plan === "premium";
}