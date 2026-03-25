import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAK_KEY = "vidaemordem_streak";
const LAST_DATE_KEY = "vidaemordem_last_date";

export async function registrarCheckin() {
  const hoje = new Date().toDateString();

  const ultimaData = await AsyncStorage.getItem(LAST_DATE_KEY);
  let streak = parseInt((await AsyncStorage.getItem(STREAK_KEY)) || "0");

  if (!ultimaData) {
    streak = 1;
  } else {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    if (ultimaData === ontem.toDateString()) {
      streak += 1;
    }

    if (ultimaData === hoje) {
      return streak;
    }
  }

  await AsyncStorage.setItem(STREAK_KEY, streak.toString());
  await AsyncStorage.setItem(LAST_DATE_KEY, hoje);

  return streak;
}

export async function obterStreak() {
  const streak = await AsyncStorage.getItem(STREAK_KEY);
  return parseInt(streak || "0");
}