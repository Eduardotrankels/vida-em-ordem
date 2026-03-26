import { ACHIEVEMENTS } from "../constants/achievements";

export function checkAchievements(data: {
habitCount: number;
streak: number;
healthCount: number;
financeCount: number;
spiritualCount: number;
goalsCount: number;
level: number;
}) {

const unlocked: string[] = [];

if (data.habitCount >= 1) unlocked.push("first_habit");

if (data.habitCount >= 3) unlocked.push("three_habits");

if (data.streak >= 7) unlocked.push("streak_7");

if (data.streak >= 30) unlocked.push("streak_30");

if (data.healthCount >= 5) unlocked.push("health_5");

if (data.financeCount >= 5) unlocked.push("finance_5");

if (data.spiritualCount >= 5) unlocked.push("spiritual_5");

if (data.goalsCount >= 5) unlocked.push("goals_5");

if (data.level >= 5) unlocked.push("level_5");

return ACHIEVEMENTS.filter(a => unlocked.includes(a.id));

}