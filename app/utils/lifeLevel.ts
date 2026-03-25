type BasicHabit = {
  completedDates?: string[];
};

type BasicChallenge = {
  finished?: boolean;
  completedDates?: string[];
};

export function getLifeLevel(
  habits: BasicHabit[] = [],
  challenges: BasicChallenge[] = []
) {
  const totalHabitCompletions = habits.reduce(
    (acc, habit) => acc + (habit.completedDates?.length ?? 0),
    0
  );

  const finishedChallenges = challenges.filter((c) => c.finished).length;

  const points = totalHabitCompletions * 2 + finishedChallenges * 25;

  const level = Math.max(1, Math.floor(points / 20) + 1);

  const currentLevelBase = (level - 1) * 20;
  const nextLevelPoints = level * 20;
  const progressInLevel = points - currentLevelBase;
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round((progressInLevel / 20) * 100))
  );

  let title = "Iniciante";

  if (level >= 2) title = "Em evolução";
  if (level >= 4) title = "Persistente";
  if (level >= 6) title = "Disciplinado";
  if (level >= 8) title = "Focado";
  if (level >= 10) title = "Inabalável";
  if (level >= 15) title = "Mestre da constância";

  return {
    points,
    level,
    title,
    nextLevelPoints,
    progressPercent,
  };
}