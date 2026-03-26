import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_PREFILL_KEY = "@vida_em_ordem_auth_prefill_v1";

export type AuthPrefill = {
  name?: string;
  nickname?: string;
  email?: string;
  photoUri?: string;
};

export async function saveAuthPrefill(prefill: AuthPrefill) {
  await AsyncStorage.setItem(AUTH_PREFILL_KEY, JSON.stringify(prefill));
}

export async function readAuthPrefill() {
  const raw = await AsyncStorage.getItem(AUTH_PREFILL_KEY);
  return raw ? (JSON.parse(raw) as AuthPrefill) : null;
}

export async function clearAuthPrefill() {
  await AsyncStorage.removeItem(AUTH_PREFILL_KEY);
}
