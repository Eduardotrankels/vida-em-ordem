export type SupportedAppLanguage = "pt" | "en" | "es" | "fr" | "it";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  isPremium?: boolean;
};

type AchievementTranslation = {
  title: string;
  description: string;
};

const ACHIEVEMENT_TRANSLATIONS: Record<
  string,
  Record<SupportedAppLanguage, AchievementTranslation>
> = {
  first_completion: {
    pt: {
      title: "Primeira vitória",
      description: "Conclua seu primeiro hábito.",
    },
    en: {
      title: "First win",
      description: "Complete your first habit.",
    },
    es: {
      title: "Primera victoria",
      description: "Completa tu primer hábito.",
    },
    fr: {
      title: "Première victoire",
      description: "Complétez votre première habitude.",
    },
    it: {
      title: "Prima vittoria",
      description: "Completa la tua prima abitudine.",
    },
  },
  five_completions: {
    pt: {
      title: "Em movimento",
      description: "Conclua 5 hábitos no total.",
    },
    en: {
      title: "In motion",
      description: "Complete 5 habits in total.",
    },
    es: {
      title: "En movimiento",
      description: "Completa 5 hábitos en total.",
    },
    fr: {
      title: "En mouvement",
      description: "Complétez 5 habitudes au total.",
    },
    it: {
      title: "In movimento",
      description: "Completa 5 abitudini in totale.",
    },
  },
  ten_completions: {
    pt: {
      title: "Ritmo criado",
      description: "Conclua 10 hábitos no total.",
    },
    en: {
      title: "Rhythm built",
      description: "Complete 10 habits in total.",
    },
    es: {
      title: "Ritmo creado",
      description: "Completa 10 hábitos en total.",
    },
    fr: {
      title: "Rythme créé",
      description: "Complétez 10 habitudes au total.",
    },
    it: {
      title: "Ritmo creato",
      description: "Completa 10 abitudini in totale.",
    },
  },
  streak_3: {
    pt: {
      title: "Sequência inicial",
      description: "Alcance 3 dias seguidos.",
    },
    en: {
      title: "First streak",
      description: "Reach 3 days in a row.",
    },
    es: {
      title: "Racha inicial",
      description: "Alcanza 3 días seguidos.",
    },
    fr: {
      title: "Série initiale",
      description: "Atteignez 3 jours d'affilée.",
    },
    it: {
      title: "Serie iniziale",
      description: "Raggiungi 3 giorni di fila.",
    },
  },
  streak_7: {
    pt: {
      title: "Disciplina real",
      description: "Alcance 7 dias seguidos.",
    },
    en: {
      title: "Real discipline",
      description: "Reach 7 days in a row.",
    },
    es: {
      title: "Disciplina real",
      description: "Alcanza 7 días seguidos.",
    },
    fr: {
      title: "Discipline réelle",
      description: "Atteignez 7 jours d'affilée.",
    },
    it: {
      title: "Disciplina reale",
      description: "Raggiungi 7 giorni di fila.",
    },
  },
  streak_21: {
    pt: {
      title: "Consistência",
      description: "Alcance 21 dias seguidos.",
    },
    en: {
      title: "Consistency",
      description: "Reach 21 days in a row.",
    },
    es: {
      title: "Constancia",
      description: "Alcanza 21 días seguidos.",
    },
    fr: {
      title: "Constance",
      description: "Atteignez 21 jours d'affilée.",
    },
    it: {
      title: "Costanza",
      description: "Raggiungi 21 giorni di fila.",
    },
  },
  streak_30: {
    pt: {
      title: "Inquebrável",
      description: "Alcance 30 dias seguidos.",
    },
    en: {
      title: "Unbreakable",
      description: "Reach 30 days in a row.",
    },
    es: {
      title: "Imparable",
      description: "Alcanza 30 días seguidos.",
    },
    fr: {
      title: "Inébranlable",
      description: "Atteignez 30 jours d'affilée.",
    },
    it: {
      title: "Infrangibile",
      description: "Raggiungi 30 giorni di fila.",
    },
  },
  consistency_7_60: {
    pt: {
      title: "Boa semana",
      description: "Tenha 60% de consistência nos últimos 7 dias.",
    },
    en: {
      title: "Good week",
      description: "Reach 60% consistency over the last 7 days.",
    },
    es: {
      title: "Buena semana",
      description: "Alcanza un 60% de constancia en los últimos 7 días.",
    },
    fr: {
      title: "Bonne semaine",
      description: "Atteignez 60 % de constance sur les 7 derniers jours.",
    },
    it: {
      title: "Buona settimana",
      description: "Raggiungi il 60% di costanza negli ultimi 7 giorni.",
    },
  },
  consistency_14_70: {
    pt: {
      title: "Evolução contínua",
      description: "Tenha 70% de consistência nos últimos 14 dias.",
    },
    en: {
      title: "Ongoing growth",
      description: "Reach 70% consistency over the last 14 days.",
    },
    es: {
      title: "Evolución continua",
      description: "Alcanza un 70% de constancia en los últimos 14 días.",
    },
    fr: {
      title: "Évolution continue",
      description: "Atteignez 70 % de constance sur les 14 derniers jours.",
    },
    it: {
      title: "Evoluzione continua",
      description: "Raggiungi il 70% di costanza negli ultimi 14 giorni.",
    },
  },
  challenge_1: {
    pt: {
      title: "Desafio aceito",
      description: "Conclua seu primeiro desafio de 21 dias.",
    },
    en: {
      title: "Challenge accepted",
      description: "Complete your first 21-day challenge.",
    },
    es: {
      title: "Desafío aceptado",
      description: "Completa tu primer desafío de 21 días.",
    },
    fr: {
      title: "Défi accepté",
      description: "Terminez votre premier défi de 21 jours.",
    },
    it: {
      title: "Sfida accettata",
      description: "Completa la tua prima sfida di 21 giorni.",
    },
  },
  challenge_3: {
    pt: {
      title: "Transformação visível",
      description: "Conclua 3 desafios de 21 dias.",
    },
    en: {
      title: "Visible transformation",
      description: "Complete 3 different 21-day challenges.",
    },
    es: {
      title: "Transformación visible",
      description: "Completa 3 desafíos de 21 días.",
    },
    fr: {
      title: "Transformation visible",
      description: "Terminez 3 défis de 21 jours.",
    },
    it: {
      title: "Trasformazione visibile",
      description: "Completa 3 sfide di 21 giorni.",
    },
  },
  challenge_5: {
    pt: {
      title: "Lenda da consistência",
      description: "Conclua 5 desafios de 21 dias.",
    },
    en: {
      title: "Consistency legend",
      description: "Complete 5 different 21-day challenges.",
    },
    es: {
      title: "Leyenda de la constancia",
      description: "Completa 5 desafíos de 21 días.",
    },
    fr: {
      title: "Légende de la constance",
      description: "Terminez 5 défis de 21 jours.",
    },
    it: {
      title: "Leggenda della costanza",
      description: "Completa 5 sfide di 21 giorni.",
    },
  },
};

export function getAchievementIconName(id: string) {
  switch (id) {
    case "first_completion":
      return "flag-outline";
    case "five_completions":
      return "rocket-outline";
    case "ten_completions":
      return "flash-outline";
    case "streak_3":
      return "flame-outline";
    case "streak_7":
      return "medal-outline";
    case "streak_21":
      return "trophy-outline";
    case "streak_30":
      return "shield-checkmark-outline";
    case "consistency_7_60":
      return "analytics-outline";
    case "consistency_14_70":
      return "trending-up-outline";
    case "challenge_1":
      return "bullseye-outline";
    case "challenge_3":
      return "ribbon-outline";
    case "challenge_5":
      return "diamond-outline";
    default:
      return "sparkles-outline";
  }
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_completion",
    title: ACHIEVEMENT_TRANSLATIONS.first_completion.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.first_completion.pt.description,
    icon: "🥉",
  },
  {
    id: "five_completions",
    title: ACHIEVEMENT_TRANSLATIONS.five_completions.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.five_completions.pt.description,
    icon: "🚀",
  },
  {
    id: "ten_completions",
    title: ACHIEVEMENT_TRANSLATIONS.ten_completions.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.ten_completions.pt.description,
    icon: "⚡",
  },
  {
    id: "streak_3",
    title: ACHIEVEMENT_TRANSLATIONS.streak_3.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.streak_3.pt.description,
    icon: "🔥",
  },
  {
    id: "streak_7",
    title: ACHIEVEMENT_TRANSLATIONS.streak_7.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.streak_7.pt.description,
    icon: "🥈",
  },
  {
    id: "streak_21",
    title: ACHIEVEMENT_TRANSLATIONS.streak_21.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.streak_21.pt.description,
    icon: "🥇",
  },
  {
    id: "streak_30",
    title: ACHIEVEMENT_TRANSLATIONS.streak_30.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.streak_30.pt.description,
    icon: "🔒",
    isPremium: true,
  },
  {
    id: "consistency_7_60",
    title: ACHIEVEMENT_TRANSLATIONS.consistency_7_60.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.consistency_7_60.pt.description,
    icon: "📈",
  },
  {
    id: "consistency_14_70",
    title: ACHIEVEMENT_TRANSLATIONS.consistency_14_70.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.consistency_14_70.pt.description,
    icon: "🔒",
    isPremium: true,
  },
  {
    id: "challenge_1",
    title: ACHIEVEMENT_TRANSLATIONS.challenge_1.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.challenge_1.pt.description,
    icon: "🎯",
  },
  {
    id: "challenge_3",
    title: ACHIEVEMENT_TRANSLATIONS.challenge_3.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.challenge_3.pt.description,
    icon: "🔒",
    isPremium: true,
  },
  {
    id: "challenge_5",
    title: ACHIEVEMENT_TRANSLATIONS.challenge_5.pt.title,
    description: ACHIEVEMENT_TRANSLATIONS.challenge_5.pt.description,
    icon: "🔒",
    isPremium: true,
  },
];

export function localizeAchievement(
  achievement: Achievement,
  language: SupportedAppLanguage
): Achievement {
  const translation = ACHIEVEMENT_TRANSLATIONS[achievement.id]?.[language];

  if (!translation) {
    return achievement;
  }

  return {
    ...achievement,
    title: translation.title,
    description: translation.description,
  };
}
