import { ACHIEVEMENTS } from "../constants/achievements";

export type Habit = {
  id: string;
  title: string;
  createdAt: string;
  completedDates: string[];
};

export type Challenge21 = {
  id: string;
  habitId: string;
  habitTitle: string;
  startedAt: string;
  completedDates: string[];
  finishedAt: string | null;
  canceledAt: string | null;
};

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateBR(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}`;
}

export function getPastDateKey(offset: number, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - offset);
  return todayKey(d);
}

export function getAllCompletionDates(habits: Habit[]) {
  const set = new Set<string>();

  habits.forEach((habit) => {
    habit.completedDates.forEach((date) => set.add(date));
  });

  return Array.from(set).sort();
}

export function getTotalCompletions(habits: Habit[]) {
  return habits.reduce((acc, habit) => acc + habit.completedDates.length, 0);
}

export function getDoneCountForDate(habits: Habit[], dateKey: string) {
  return habits.reduce(
    (acc, habit) => acc + (habit.completedDates.includes(dateKey) ? 1 : 0),
    0
  );
}

export function getCurrentStreak(habits: Habit[]) {
  let streak = 0;
  const today = todayKey();

  for (let i = 0; i < 365; i++) {
    const date = getPastDateKey(i);
    const hasAny = habits.some((habit) => habit.completedDates.includes(date));

    if (i === 0) {
      if (hasAny) {
        streak++;
      }
    } else {
      if (hasAny) {
        streak++;
      } else {
        break;
      }
    }
  }

  return streak;
}

export function getBestStreak(habits: Habit[]) {
  const dates = getAllCompletionDates(habits);
  if (dates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = parseDateKey(dates[i - 1]).getTime();
    const currentDate = parseDateKey(dates[i]).getTime();
    const diffDays = Math.round((currentDate - prev) / 86400000);

    if (diffDays === 1) {
      current++;
      best = Math.max(best, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return best;
}

export function getConsistency(habits: Habit[], days: number) {
  if (days <= 0) return 0;

  let activeDays = 0;
  for (let i = 0; i < days; i++) {
    const date = getPastDateKey(i);
    const hasAny = habits.some((habit) => habit.completedDates.includes(date));
    if (hasAny) activeDays++;
  }

  return Math.round((activeDays / days) * 100);
}

export function getLastNDaysSummary(habits: Habit[], days: number) {
  const out: Array<{
    dateKey: string;
    label: string;
    done: number;
    total: number;
    percent: number;
  }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const dateKey = getPastDateKey(i);
    const done = getDoneCountForDate(habits, dateKey);
    const total = habits.length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    out.push({
      dateKey,
      label: formatDateBR(dateKey),
      done,
      total,
      percent,
    });
  }

  return out;
}

export function getFeaturedHabits(habits: Habit[]) {
  return [...habits]
    .map((habit) => ({
      ...habit,
      totalDone: habit.completedDates.length,
    }))
    .sort((a, b) => b.totalDone - a.totalDone)
    .slice(0, 5);
}

export function getCompletedChallenges(challenges: Challenge21[]) {
  return challenges.filter((c) => !!c.finishedAt && !c.canceledAt);
}

export function getActiveChallenges(challenges: Challenge21[]) {
  return challenges.filter((c) => !c.finishedAt && !c.canceledAt);
}

export function getCanceledChallenges(challenges: Challenge21[]) {
  return challenges.filter((c) => !!c.canceledAt);
}

export function getUnlockedAchievementIds(
  habits: Habit[],
  challenges: Challenge21[]
) {
  const totalCompletions = getTotalCompletions(habits);
  const currentStreak = getCurrentStreak(habits);
  const bestStreak = getBestStreak(habits);
  const consistency7 = getConsistency(habits, 7);
  const consistency14 = getConsistency(habits, 14);
  const completedChallenges = getCompletedChallenges(challenges).length;

  const unlocked = new Set<string>();

  if (totalCompletions >= 1) unlocked.add("first_completion");
  if (totalCompletions >= 5) unlocked.add("five_completions");
  if (totalCompletions >= 10) unlocked.add("ten_completions");

  if (currentStreak >= 3 || bestStreak >= 3) unlocked.add("streak_3");
  if (currentStreak >= 7 || bestStreak >= 7) unlocked.add("streak_7");
  if (currentStreak >= 21 || bestStreak >= 21) unlocked.add("streak_21");
  if (currentStreak >= 30 || bestStreak >= 30) unlocked.add("streak_30");

  if (consistency7 >= 60) unlocked.add("consistency_7_60");
  if (consistency14 >= 70) unlocked.add("consistency_14_70");

  if (completedChallenges >= 1) unlocked.add("challenge_1");
  if (completedChallenges >= 3) unlocked.add("challenge_3");
  if (completedChallenges >= 5) unlocked.add("challenge_5");

  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked.has(achievement.id),
  }));
}