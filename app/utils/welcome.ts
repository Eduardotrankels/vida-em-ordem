import AsyncStorage from "@react-native-async-storage/async-storage";

export const APP_WELCOME_SEEN_KEY = "@vida_em_ordem_welcome_seen_v1";

export async function hasSeenWelcomeScreen() {
  return (await AsyncStorage.getItem(APP_WELCOME_SEEN_KEY)) === "true";
}

export async function markWelcomeScreenSeen() {
  await AsyncStorage.setItem(APP_WELCOME_SEEN_KEY, "true");
}
