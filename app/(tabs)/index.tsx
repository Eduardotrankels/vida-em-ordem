import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import GuidedTourOverlay from "../../components/GuidedTourOverlay";
import SubtlePremiumHint from "../../components/SubtlePremiumHint";
import Svg, {
  Circle,
  Line,
  Polygon,
  Text as SvgText,
} from "react-native-svg";
import {
  AI_PLAN_KEY,
  getLifeAreaMeta,
  getLifeAreaLabel,
  LifeJourneyPlan,
  normalizeLifeJourneyPlan,
} from "../utils/lifeJourney";
import {
  completeJourneyTourHome,
  readJourneyTourState,
  skipJourneyTour,
  startJourneyTour,
} from "../utils/journeyTour";
import type { AppLanguage } from "../utils/i18n";
import {
  markAppIntroTourPrompted,
  readAppIntroTourState,
  skipAppIntroTour,
} from "../utils/appIntroTour";
import { useAppLanguage } from "../utils/languageContext";
import { getScreenContentBottomPadding } from "../utils/safeArea";
import { hasTourRectChanged, measureTourTarget } from "../utils/tourLayout";
import { useAppTheme } from "../utils/themeContext";

type Habit = {
  id: string;
  title: string;
  createdAt: string;
  completedDates: string[];
};

type MoneyEntryType = "entrada" | "saida";

type MoneyEntry = {
  id: string;
  title: string;
  amount: number;
  type: MoneyEntryType;
  category: string;
  createdAt: string;
};

type FixedBill = {
  id: string;
  title: string;
  amount: number;
  dueDay: number;
  category: string;
  lastPaidPeriod?: string | null;
  createdAt: string;
};

type MedicationItem = {
  id: string;
  name: string;
  dosage: string;
  time: string;
  notes: string;
  active: boolean;
  takenTodayDates: string[];
  createdAt: string;
};

type UserProfile = {
  name: string;
  nickname: string;
  email: string;
  age: string;
  address: string;
  photoUri?: string;
  avatarBorderColor?: string;
  createdAt: string;
};

type AppRoute =
  | "/saude"
  | "/dinheiro"
  | "/habitos"
  | "/checkin"
  | "/conquistas"
  | "/metas"
  | "/lazer"
  | "/trabalho"
  | "/tempo"
  | "/aprendizado"
  | "/espiritualidade"
  | "/perfil"
  | "/assinatura";

const HABITS_KEY = "@vida_em_ordem_habitos_v1";
const MONEY_ENTRIES_KEY = "@vida_em_ordem_money_entries_v1";
const MONEY_FIXED_BILLS_KEY = "@vida_em_ordem_money_fixed_bills_v2";
const MEDICATIONS_KEY = "@vida_em_ordem_health_medications_v1";
const USER_PROFILE_KEY = "@vida_em_ordem_user_profile_v1";
const DEFAULT_AVATAR_BORDER_COLOR = "#2563eb";

type TourTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type HomeTourKey = "hero" | "card" | "start" | "plan" | "areas";
type RadarMetricId =
  | "saude"
  | "financeiro"
  | "habitos"
  | "constancia"
  | "organizacao"
  | "evolucao";

const HOME_STATIC_COPY: Record<
  AppLanguage,
  {
    areaHealth: string;
    areaMoney: string;
    areaGoals: string;
    areaLeisure: string;
    areaWork: string;
    areaTime: string;
    areaLearning: string;
    areaSpirituality: string;
    radarConsistency: string;
    radarOrganization: string;
    radarEvolution: string;
    journeyDirection: string;
    journeyAction: string;
    journeyVictory: string;
    microVictoryLabel: string;
    detailTitleExpanded: string;
    detailTitleCollapsed: string;
    detailTextExpanded: string;
    detailTextCollapsed: string;
    detailHide: string;
    detailOpen: string;
    subtlePremiumTitle: string;
    subtlePremiumText: string;
    subtlePremiumCta: string;
    dayTrailTitle: string;
    snapshotTitle: string;
    snapshotSubtitle: string;
    snapshotDone: string;
    snapshotPending: string;
    snapshotStreakOne: string;
    snapshotStreakMany: string;
    snapshotLevel: string;
    snapshotProgress: (percent: number) => string;
    radarSectionTitle: string;
    radarTitle: string;
    radarSubtitlePremium: string;
    radarSubtitleFree: string;
    radarTapToOpen: string;
    radarExpandedTitle: string;
    radarExpandedText: string;
    radarExpandedCta: string;
    areasTitle: string;
    smartInsightsTitle: string;
    smartInsightsCta: string;
  }
> = {
  pt: {
    areaHealth: "Saúde",
    areaMoney: "Dinheiro",
    areaGoals: "Metas",
    areaLeisure: "Lazer",
    areaWork: "Trabalho",
    areaTime: "Tempo",
    areaLearning: "Aprendizado",
    areaSpirituality: "Espiritualidade",
    radarConsistency: "Constância",
    radarOrganization: "Organização",
    radarEvolution: "Evolução",
    journeyDirection: "Direção",
    journeyAction: "Ação",
    journeyVictory: "Vitória",
    microVictoryLabel: "Microvitória do dia",
    detailTitleExpanded: "Painel detalhado ativo",
    detailTitleCollapsed: "Quer ver a leitura completa do seu dia?",
    detailTextExpanded:
      "Aqui ficam os detalhes mais profundos de evolução, radar, trilha do dia e ajustes inteligentes.",
    detailTextCollapsed:
      "O essencial já está acima. Se quiser, você pode abrir uma visão mais completa sem poluir sua Home principal.",
    detailHide: "Ocultar visão detalhada",
    detailOpen: "Abrir visão detalhada",
    subtlePremiumTitle: "Premium sem pressão",
    subtlePremiumText:
      "Se o app fizer sentido para você, o Premium aprofunda a análise e libera mais autonomia. O essencial continua funcionando no Free.",
    subtlePremiumCta: "Conhecer plano",
    dayTrailTitle: "Trilha do dia",
    snapshotTitle: "Snapshot do dia",
    snapshotSubtitle: "Sua leitura geral de desempenho",
    snapshotDone: "feitos",
    snapshotPending: "pendentes",
    snapshotStreakOne: "dia seguido",
    snapshotStreakMany: "dias seguidos",
    snapshotLevel: "nível",
    snapshotProgress: (percent) =>
      `Evolução de vida: ${percent}% do nível atual`,
    radarSectionTitle: "Radar da vida",
    radarTitle: "Radar da sua evolução",
    radarSubtitlePremium:
      "Toque em uma área para abrir o módulo correspondente.",
    radarSubtitleFree:
      "No Free você vê uma leitura essencial. Se quiser ampliar a análise, o radar completo fica no Premium.",
    radarTapToOpen: "Toque para abrir",
    radarExpandedTitle: "Radar expandido disponível",
    radarExpandedText:
      "Se quiser ampliar a leitura, o Premium libera todas as áreas, uma visão mais profunda e mais contexto sobre sua evolução.",
    radarExpandedCta: "Conhecer Premium",
    areasTitle: "Áreas da vida",
    smartInsightsTitle: "Ajustes inteligentes",
    smartInsightsCta: "Conhecer análise completa",
  },
  en: {
    areaHealth: "Health",
    areaMoney: "Money",
    areaGoals: "Goals",
    areaLeisure: "Leisure",
    areaWork: "Work",
    areaTime: "Time",
    areaLearning: "Learning",
    areaSpirituality: "Spirituality",
    radarConsistency: "Consistency",
    radarOrganization: "Organization",
    radarEvolution: "Growth",
    journeyDirection: "Direction",
    journeyAction: "Action",
    journeyVictory: "Win",
    microVictoryLabel: "Micro-win of the day",
    detailTitleExpanded: "Detailed dashboard active",
    detailTitleCollapsed: "Want to see the full reading of your day?",
    detailTextExpanded:
      "This is where the deeper details of progress, radar, day trail and smart insights live.",
    detailTextCollapsed:
      "The essentials are already above. If you want, you can open a fuller view without cluttering your main Home.",
    detailHide: "Hide detailed view",
    detailOpen: "Open detailed view",
    subtlePremiumTitle: "Premium without pressure",
    subtlePremiumText:
      "If the app makes sense for you, Premium deepens the analysis and unlocks more autonomy. The essentials still work in Free.",
    subtlePremiumCta: "Explore plan",
    dayTrailTitle: "Day trail",
    snapshotTitle: "Day snapshot",
    snapshotSubtitle: "Your overall performance reading",
    snapshotDone: "done",
    snapshotPending: "pending",
    snapshotStreakOne: "day in a row",
    snapshotStreakMany: "days in a row",
    snapshotLevel: "level",
    snapshotProgress: (percent) =>
      `Life progress: ${percent}% of the current level`,
    radarSectionTitle: "Life radar",
    radarTitle: "Radar of your progress",
    radarSubtitlePremium:
      "Tap an area to open the corresponding module.",
    radarSubtitleFree:
      "On Free you see an essential reading. If you want to expand the analysis, the full radar is in Premium.",
    radarTapToOpen: "Tap to open",
    radarExpandedTitle: "Expanded radar available",
    radarExpandedText:
      "If you want to go deeper, Premium unlocks all areas, a broader view and more context about your evolution.",
    radarExpandedCta: "Explore Premium",
    areasTitle: "Life areas",
    smartInsightsTitle: "Smart adjustments",
    smartInsightsCta: "See full analysis",
  },
  es: {
    areaHealth: "Salud",
    areaMoney: "Dinero",
    areaGoals: "Metas",
    areaLeisure: "Ocio",
    areaWork: "Trabajo",
    areaTime: "Tiempo",
    areaLearning: "Aprendizaje",
    areaSpirituality: "Espiritualidad",
    radarConsistency: "Constancia",
    radarOrganization: "Organización",
    radarEvolution: "Evolución",
    journeyDirection: "Dirección",
    journeyAction: "Acción",
    journeyVictory: "Victoria",
    microVictoryLabel: "Microvictoria del día",
    detailTitleExpanded: "Panel detallado activo",
    detailTitleCollapsed: "¿Quieres ver la lectura completa de tu día?",
    detailTextExpanded:
      "Aquí quedan los detalles más profundos de evolución, radar, ruta del día y ajustes inteligentes.",
    detailTextCollapsed:
      "Lo esencial ya está arriba. Si quieres, puedes abrir una visión más completa sin contaminar tu Home principal.",
    detailHide: "Ocultar vista detallada",
    detailOpen: "Abrir vista detallada",
    subtlePremiumTitle: "Premium sin presión",
    subtlePremiumText:
      "Si la app tiene sentido para ti, Premium profundiza el análisis y libera más autonomía. Lo esencial sigue funcionando en Free.",
    subtlePremiumCta: "Conocer plan",
    dayTrailTitle: "Ruta del día",
    snapshotTitle: "Resumen del día",
    snapshotSubtitle: "Tu lectura general de rendimiento",
    snapshotDone: "hechos",
    snapshotPending: "pendientes",
    snapshotStreakOne: "día seguido",
    snapshotStreakMany: "días seguidos",
    snapshotLevel: "nivel",
    snapshotProgress: (percent) =>
      `Evolución de vida: ${percent}% del nivel actual`,
    radarSectionTitle: "Radar de la vida",
    radarTitle: "Radar de tu evolución",
    radarSubtitlePremium:
      "Toca un área para abrir el módulo correspondiente.",
    radarSubtitleFree:
      "En Free ves una lectura esencial. Si quieres ampliar el análisis, el radar completo está en Premium.",
    radarTapToOpen: "Toca para abrir",
    radarExpandedTitle: "Radar ampliado disponible",
    radarExpandedText:
      "Si quieres ampliar la lectura, Premium libera todas las áreas, una visión más profunda y más contexto sobre tu evolución.",
    radarExpandedCta: "Conocer Premium",
    areasTitle: "Áreas de la vida",
    smartInsightsTitle: "Ajustes inteligentes",
    smartInsightsCta: "Conocer análisis completo",
  },
  fr: {
    areaHealth: "Santé",
    areaMoney: "Argent",
    areaGoals: "Objectifs",
    areaLeisure: "Loisirs",
    areaWork: "Travail",
    areaTime: "Temps",
    areaLearning: "Apprentissage",
    areaSpirituality: "Spiritualité",
    radarConsistency: "Constance",
    radarOrganization: "Organisation",
    radarEvolution: "Évolution",
    journeyDirection: "Direction",
    journeyAction: "Action",
    journeyVictory: "Victoire",
    microVictoryLabel: "Micro-victoire du jour",
    detailTitleExpanded: "Panneau détaillé actif",
    detailTitleCollapsed: "Voulez-vous voir la lecture complète de votre journée ?",
    detailTextExpanded:
      "Ici se trouvent les détails plus profonds de l'évolution, du radar, du parcours du jour et des ajustements intelligents.",
    detailTextCollapsed:
      "L'essentiel est déjà au-dessus. Si vous le souhaitez, vous pouvez ouvrir une vue plus complète sans surcharger votre Home principale.",
    detailHide: "Masquer la vue détaillée",
    detailOpen: "Ouvrir la vue détaillée",
    subtlePremiumTitle: "Premium sans pression",
    subtlePremiumText:
      "Si l'app vous semble utile, Premium approfondit l'analyse et débloque plus d'autonomie. L'essentiel continue de fonctionner en Free.",
    subtlePremiumCta: "Voir l'offre",
    dayTrailTitle: "Parcours du jour",
    snapshotTitle: "Instantané du jour",
    snapshotSubtitle: "Votre lecture générale de performance",
    snapshotDone: "faits",
    snapshotPending: "en attente",
    snapshotStreakOne: "jour d'affilée",
    snapshotStreakMany: "jours d'affilée",
    snapshotLevel: "niveau",
    snapshotProgress: (percent) =>
      `Évolution de vie : ${percent}% du niveau actuel`,
    radarSectionTitle: "Radar de la vie",
    radarTitle: "Radar de votre évolution",
    radarSubtitlePremium:
      "Touchez une zone pour ouvrir le module correspondant.",
    radarSubtitleFree:
      "En Free, vous voyez une lecture essentielle. Si vous voulez aller plus loin, le radar complet est disponible en Premium.",
    radarTapToOpen: "Touchez pour ouvrir",
    radarExpandedTitle: "Radar étendu disponible",
    radarExpandedText:
      "Si vous voulez approfondir, Premium débloque toutes les zones, une lecture plus profonde et plus de contexte sur votre évolution.",
    radarExpandedCta: "Découvrir Premium",
    areasTitle: "Domaines de vie",
    smartInsightsTitle: "Ajustements intelligents",
    smartInsightsCta: "Voir l'analyse complète",
  },
  it: {
    areaHealth: "Salute",
    areaMoney: "Denaro",
    areaGoals: "Obiettivi",
    areaLeisure: "Svago",
    areaWork: "Lavoro",
    areaTime: "Tempo",
    areaLearning: "Apprendimento",
    areaSpirituality: "Spiritualità",
    radarConsistency: "Costanza",
    radarOrganization: "Organizzazione",
    radarEvolution: "Evoluzione",
    journeyDirection: "Direzione",
    journeyAction: "Azione",
    journeyVictory: "Vittoria",
    microVictoryLabel: "Microvittoria del giorno",
    detailTitleExpanded: "Pannello dettagliato attivo",
    detailTitleCollapsed: "Vuoi vedere la lettura completa della tua giornata?",
    detailTextExpanded:
      "Qui trovi i dettagli più profondi di evoluzione, radar, percorso del giorno e regolazioni intelligenti.",
    detailTextCollapsed:
      "L'essenziale è già sopra. Se vuoi, puoi aprire una vista più completa senza appesantire la tua Home principale.",
    detailHide: "Nascondi vista dettagliata",
    detailOpen: "Apri vista dettagliata",
    subtlePremiumTitle: "Premium senza pressione",
    subtlePremiumText:
      "Se l'app ha senso per te, Premium approfondisce l'analisi e sblocca più autonomia. L'essenziale continua a funzionare in Free.",
    subtlePremiumCta: "Scopri il piano",
    dayTrailTitle: "Percorso del giorno",
    snapshotTitle: "Snapshot del giorno",
    snapshotSubtitle: "La tua lettura generale delle prestazioni",
    snapshotDone: "fatti",
    snapshotPending: "in sospeso",
    snapshotStreakOne: "giorno di fila",
    snapshotStreakMany: "giorni di fila",
    snapshotLevel: "livello",
    snapshotProgress: (percent) =>
      `Evoluzione di vita: ${percent}% del livello attuale`,
    radarSectionTitle: "Radar della vita",
    radarTitle: "Radar della tua evoluzione",
    radarSubtitlePremium:
      "Tocca un'area per aprire il modulo corrispondente.",
    radarSubtitleFree:
      "In Free vedi una lettura essenziale. Se vuoi ampliare l'analisi, il radar completo è nel Premium.",
    radarTapToOpen: "Tocca per aprire",
    radarExpandedTitle: "Radar esteso disponibile",
    radarExpandedText:
      "Se vuoi ampliare la lettura, Premium sblocca tutte le aree, una visione più profonda e più contesto sulla tua evoluzione.",
    radarExpandedCta: "Scopri Premium",
    areasTitle: "Aree della vita",
    smartInsightsTitle: "Regolazioni intelligenti",
    smartInsightsCta: "Scopri l'analisi completa",
  },
};

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentPeriodKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);

  const value = Number.parseInt(safeHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRadarStatusColor(score: number, accentColor: string, isDark: boolean) {
  if (score >= 80) return isDark ? accentColor : "#2563EB";
  if (score >= 60) return isDark ? "#E5E7EB" : "#0F766E";
  if (score >= 40) return isDark ? "#FBBF24" : "#D97706";
  return isDark ? "#FB7185" : "#DC2626";
}


function getCurrentStreak(habits: Habit[]) {
  const completedSet = new Set<string>();

  habits.forEach((habit) => {
    (habit.completedDates || []).forEach((date) => completedSet.add(date));
  });

  let streak = 0;
  let cursor = new Date();
  const today = todayKey();

  if (!completedSet.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = todayKey(cursor);
    if (!completedSet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getTotalCompletions(habits: Habit[]) {
  return habits.reduce(
    (acc, habit) => acc + new Set(habit.completedDates || []).size,
    0
  );
}

function getLevelData(totalCompletions: number) {
  const pointsPerLevel = 20;
  const level = Math.floor(totalCompletions / pointsPerLevel) + 1;
  const currentLevelBase = (level - 1) * pointsPerLevel;
  const currentProgress = totalCompletions - currentLevelBase;
  const missing = Math.max(pointsPerLevel - currentProgress, 0);
  const percent = Math.max(
    0,
    Math.min(100, Math.round((currentProgress / pointsPerLevel) * 100))
  );

  return {
    level,
    missing,
    percent,
  };
}

function getCurrentMomentLabel(
  t: (key: string, params?: Record<string, string | number>) => string
) {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.moment.morning");
  if (hour < 18) return t("home.moment.afternoon");
  return t("home.moment.evening");
}

function getGreeting(
  t: (key: string, params?: Record<string, string | number>) => string
) {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.greeting.morning");
  if (hour < 18) return t("home.greeting.afternoon");
  return t("home.greeting.evening");
}

function getMomentPhrase(
  feitosHoje: number,
  totalHabitos: number,
  streak: number,
  pendingMeds: number,
  language: AppLanguage
) {
  const hour = new Date().getHours();

  if (pendingMeds > 0) {
    return pendingMeds === 1
      ? {
          pt: "Você tem 1 medicamento pendente hoje. Cuide de você com carinho.",
          en: "You have 1 medication pending today. Take care of yourself kindly.",
          es: "Tienes 1 medicamento pendiente hoy. Cuídate con cariño.",
          fr: "Vous avez 1 médicament en attente aujourd'hui. Prenez soin de vous avec douceur.",
          it: "Hai 1 farmaco in sospeso oggi. Prenditi cura di te con gentilezza.",
        }[language]
      : {
          pt: `Você tem ${pendingMeds} medicamentos pendentes hoje. Seu cuidado também é prioridade.`,
          en: `You have ${pendingMeds} medications pending today. Your care is also a priority.`,
          es: `Tienes ${pendingMeds} medicamentos pendientes hoy. Tu cuidado también es una prioridad.`,
          fr: `Vous avez ${pendingMeds} médicaments en attente aujourd'hui. Votre soin est aussi une priorité.`,
          it: `Hai ${pendingMeds} farmaci in sospeso oggi. Anche la tua cura è una priorità.`,
        }[language];
  }

  if (totalHabitos === 0) {
    return hour < 12
      ? {
          pt: "Comece pequeno hoje. Uma ação certa já muda a direção do dia.",
          en: "Start small today. One right action already changes the direction of the day.",
          es: "Empieza pequeño hoy. Una acción correcta ya cambia la dirección del día.",
          fr: "Commencez petit aujourd'hui. Une bonne action change déjà la direction de la journée.",
          it: "Inizia in piccolo oggi. Una sola azione giusta cambia già la direzione della giornata.",
        }[language]
      : {
          pt: "Ainda dá tempo de organizar o dia com uma pequena vitória.",
          en: "There is still time to organize the day with a small win.",
          es: "Todavía hay tiempo para ordenar el día con una pequeña victoria.",
          fr: "Il est encore temps d'organiser la journée avec une petite victoire.",
          it: "C'è ancora tempo per organizzare la giornata con una piccola vittoria.",
        }[language];
  }

  if (feitosHoje === totalHabitos && totalHabitos > 0) {
    return {
      pt: "Dia completo. Disciplina assim constrói uma nova identidade.",
      en: "Full day. This kind of discipline builds a new identity.",
      es: "Día completo. Una disciplina así construye una nueva identidad.",
      fr: "Journée complète. Une telle discipline construit une nouvelle identité.",
      it: "Giornata completa. Una disciplina così costruisce una nuova identità.",
    }[language];
  }

  if (streak >= 7) {
    return {
      pt: "Sua sequência já mostra que consistência deixou de ser esforço e virou rotina.",
      en: "Your streak already shows that consistency is no longer effort, but routine.",
      es: "Tu secuencia ya muestra que la constancia dejó de ser esfuerzo y se volvió rutina.",
      fr: "Votre série montre déjà que la constance n'est plus un effort, mais une routine.",
      it: "La tua sequenza mostra già che la costanza ha smesso di essere sforzo ed è diventata routine.",
    }[language];
  }

  if (feitosHoje === 0) {
    return {
      pt: "Ainda dá tempo de vencer o dia com a primeira ação certa.",
      en: "There is still time to win the day with the first right action.",
      es: "Todavía hay tiempo para ganar el día con la primera acción correcta.",
      fr: "Il est encore temps de gagner la journée avec la première bonne action.",
      it: "C'è ancora tempo per vincere la giornata con la prima azione giusta.",
    }[language];
  }

  if (hour < 12) {
    return {
      pt: "Manhã forte, mente firme. O resto do dia acompanha.",
      en: "Strong morning, steady mind. The rest of the day follows.",
      es: "Mañana fuerte, mente firme. El resto del día acompaña.",
      fr: "Matin solide, esprit stable. Le reste de la journée suit.",
      it: "Mattina forte, mente salda. Il resto della giornata segue.",
    }[language];
  }

  if (hour < 18) {
    return {
      pt: "A metade do dia também pode ser o começo de uma grande virada.",
      en: "The middle of the day can also be the beginning of a major turn.",
      es: "La mitad del día también puede ser el comienzo de un gran giro.",
      fr: "Le milieu de la journée peut aussi être le début d'un grand tournant.",
      it: "Anche la metà della giornata può essere l'inizio di una grande svolta.",
    }[language];
  }

  return {
    pt: "A rotina certa pode reconstruir uma vida inteira.",
    en: "The right routine can rebuild an entire life.",
    es: "La rutina correcta puede reconstruir una vida entera.",
    fr: "La bonne routine peut reconstruire une vie entière.",
    it: "La routine giusta può ricostruire un'intera vita.",
  }[language];
}

function isBillPaidInCurrentMonth(bill: FixedBill, currentPeriod: string) {
  return bill.lastPaidPeriod === currentPeriod;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function buildPolygonPoints(
  values: number[],
  cx: number,
  cy: number,
  radius: number,
  maxValue: number
) {
  return values
    .map((value, index) => {
      const angle = (360 / values.length) * index;
      const point = polarToCartesian(
        cx,
        cy,
        (radius * value) / maxValue,
        angle
      );
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function getScoreLabel(
  score: number,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (score >= 85) return t("home.score.veryStrong");
  if (score >= 70) return t("home.score.strong");
  if (score >= 55) return t("home.score.goodBase");
  if (score >= 40) return t("home.score.building");
  return t("home.score.starting");
}

function getAreaHint(score: number, language: AppLanguage) {
  if (score >= 80) {
    return {
      pt: "Muito forte",
      en: "Very strong",
      es: "Muy fuerte",
      fr: "Très solide",
      it: "Molto solida",
    }[language];
  }

  if (score >= 60) {
    return {
      pt: "Boa evolução",
      en: "Good progress",
      es: "Buena evolución",
      fr: "Bonne évolution",
      it: "Buona evoluzione",
    }[language];
  }

  if (score >= 40) {
    return {
      pt: "Em construção",
      en: "Building",
      es: "En construcción",
      fr: "En construction",
      it: "In costruzione",
    }[language];
  }

  return {
    pt: "Precisa atenção",
    en: "Needs attention",
    es: "Necesita atención",
    fr: "À surveiller",
    it: "Richiede attenzione",
  }[language];
}

function getRadarRoute(metricId: RadarMetricId): AppRoute {
  switch (metricId) {
    case "saude":
      return "/saude";
    case "financeiro":
      return "/dinheiro";
    case "habitos":
      return "/habitos";
    case "constancia":
      return "/habitos";
    case "organizacao":
      return "/checkin";
    case "evolucao":
      return "/conquistas";
    default:
      return "/metas";
  }
}

function getFocusData(params: {
  pendingMedicationsToday: number;
  contasVencemHoje: number;
  contasPendentes: number;
  pendentesHoje: number;
  totalHabitos: number;
  feitosHoje: number;
}, language: AppLanguage) {
  const {
    pendingMedicationsToday,
    contasVencemHoje,
    contasPendentes,
    pendentesHoje,
    totalHabitos,
    feitosHoje,
  } = params;

  if (pendingMedicationsToday > 0) {
    return {
      title: {
        pt: "Seu foco agora",
        en: "Your focus now",
        es: "Tu foco ahora",
        fr: "Votre focus maintenant",
        it: "Il tuo focus ora",
      }[language],
      subtitle:
        pendingMedicationsToday === 1
          ? {
              pt: "Você tem 1 medicamento pendente hoje.",
              en: "You have 1 medication pending today.",
              es: "Tienes 1 medicamento pendiente hoy.",
              fr: "Vous avez 1 médicament en attente aujourd'hui.",
              it: "Hai 1 farmaco in sospeso oggi.",
            }[language]
          : {
              pt: `Você tem ${pendingMedicationsToday} medicamentos pendentes hoje.`,
              en: `You have ${pendingMedicationsToday} medications pending today.`,
              es: `Tienes ${pendingMedicationsToday} medicamentos pendientes hoy.`,
              fr: `Vous avez ${pendingMedicationsToday} médicaments en attente aujourd'hui.`,
              it: `Hai ${pendingMedicationsToday} farmaci in sospeso oggi.`,
            }[language],
      cta: {
        pt: "Abrir Saúde",
        en: "Open Health",
        es: "Abrir Salud",
        fr: "Ouvrir Santé",
        it: "Apri Salute",
      }[language],
      route: "/saude" as AppRoute,
      icon: "medical-outline" as const,
    };
  }

  if (contasVencemHoje > 0) {
    return {
      title: {
        pt: "Seu foco agora",
        en: "Your focus now",
        es: "Tu foco ahora",
        fr: "Votre focus maintenant",
        it: "Il tuo focus ora",
      }[language],
      subtitle:
        contasVencemHoje === 1
          ? {
              pt: "Você tem 1 conta vencendo hoje.",
              en: "You have 1 bill due today.",
              es: "Tienes 1 cuenta que vence hoy.",
              fr: "Vous avez 1 facture qui arrive à échéance aujourd'hui.",
              it: "Hai 1 conto in scadenza oggi.",
            }[language]
          : {
              pt: `Você tem ${contasVencemHoje} contas vencendo hoje.`,
              en: `You have ${contasVencemHoje} bills due today.`,
              es: `Tienes ${contasVencemHoje} cuentas que vencen hoy.`,
              fr: `Vous avez ${contasVencemHoje} factures qui arrivent à échéance aujourd'hui.`,
              it: `Hai ${contasVencemHoje} conti in scadenza oggi.`,
            }[language],
      cta: {
        pt: "Abrir Dinheiro",
        en: "Open Money",
        es: "Abrir Dinero",
        fr: "Ouvrir Argent",
        it: "Apri Denaro",
      }[language],
      route: "/dinheiro" as AppRoute,
      icon: "wallet-outline" as const,
    };
  }

  if (contasPendentes > 0) {
    return {
      title: {
        pt: "Seu foco agora",
        en: "Your focus now",
        es: "Tu foco ahora",
        fr: "Votre focus maintenant",
        it: "Il tuo focus ora",
      }[language],
      subtitle:
        contasPendentes === 1
          ? {
              pt: "Existe 1 conta pendente para organizar.",
              en: "There is 1 pending bill to organize.",
              es: "Hay 1 cuenta pendiente por organizar.",
              fr: "Il y a 1 facture en attente à organiser.",
              it: "C'è 1 conto in sospeso da organizzare.",
            }[language]
          : {
              pt: `Existem ${contasPendentes} contas pendentes para organizar.`,
              en: `There are ${contasPendentes} pending bills to organize.`,
              es: `Hay ${contasPendentes} cuentas pendientes por organizar.`,
              fr: `Il y a ${contasPendentes} factures en attente à organiser.`,
              it: `Ci sono ${contasPendentes} conti in sospeso da organizzare.`,
            }[language],
      cta: {
        pt: "Ver finanças",
        en: "See finances",
        es: "Ver finanzas",
        fr: "Voir les finances",
        it: "Vedi finanze",
      }[language],
      route: "/dinheiro" as AppRoute,
      icon: "wallet-outline" as const,
    };
  }

  if (pendentesHoje > 0 && totalHabitos > 0) {
    return {
      title: {
        pt: "Seu foco agora",
        en: "Your focus now",
        es: "Tu foco ahora",
        fr: "Votre focus maintenant",
        it: "Il tuo focus ora",
      }[language],
      subtitle:
        pendentesHoje === 1
          ? {
              pt: "Falta 1 hábito para fechar seu dia melhor.",
              en: "1 habit is missing to close your day better.",
              es: "Falta 1 hábito para cerrar mejor tu día.",
              fr: "Il manque 1 habitude pour mieux conclure votre journée.",
              it: "Manca 1 abitudine per chiudere meglio la tua giornata.",
            }[language]
          : {
              pt: `Faltam ${pendentesHoje} hábitos para elevar seu dia.`,
              en: `${pendentesHoje} habits are still missing to lift your day.`,
              es: `Faltan ${pendentesHoje} hábitos para elevar tu día.`,
              fr: `Il manque encore ${pendentesHoje} habitudes pour élever votre journée.`,
              it: `Mancano ancora ${pendentesHoje} abitudini per elevare la tua giornata.`,
            }[language],
      cta: {
        pt: "Abrir Hábitos",
        en: "Open Habits",
        es: "Abrir Hábitos",
        fr: "Ouvrir Habitudes",
        it: "Apri Abitudini",
      }[language],
      route: "/habitos" as AppRoute,
      icon: "checkmark-circle-outline" as const,
    };
  }

  if (totalHabitos > 0 && feitosHoje === totalHabitos) {
    return {
      title: {
        pt: "Seu foco agora",
        en: "Your focus now",
        es: "Tu foco ahora",
        fr: "Votre focus maintenant",
        it: "Il tuo focus ora",
      }[language],
      subtitle: {
        pt: "Todos os hábitos do dia foram concluídos. Excelente ritmo.",
        en: "All habits for today were completed. Great rhythm.",
        es: "Todos los hábitos del día fueron completados. Excelente ritmo.",
        fr: "Toutes les habitudes du jour ont été terminées. Excellent rythme.",
        it: "Tutte le abitudini del giorno sono state completate. Ottimo ritmo.",
      }[language],
      cta: {
        pt: "Ver conquistas",
        en: "View achievements",
        es: "Ver logros",
        fr: "Voir les réussites",
        it: "Vedi conquiste",
      }[language],
      route: "/conquistas" as AppRoute,
      icon: "trophy-outline" as const,
    };
  }

  return {
    title: {
      pt: "Seu foco agora",
      en: "Your focus now",
      es: "Tu foco ahora",
      fr: "Votre focus maintenant",
      it: "Il tuo focus ora",
    }[language],
    subtitle: {
      pt: "Seu dia está limpo. Escolha uma meta e avance mais um passo.",
      en: "Your day is clear. Choose a goal and move one step forward.",
      es: "Tu día está limpio. Elige una meta y avanza un paso más.",
      fr: "Votre journée est claire. Choisissez un objectif et avancez d'un pas.",
      it: "La tua giornata è pulita. Scegli un obiettivo e fai un altro passo.",
    }[language],
    cta: {
      pt: "Abrir Metas",
      en: "Open Goals",
      es: "Abrir Metas",
      fr: "Ouvrir Objectifs",
      it: "Apri Obiettivi",
    }[language],
    route: "/metas" as AppRoute,
    icon: "flag-outline" as const,
  };
}

function getFinancialHealthLabel(score: number, language: AppLanguage) {
  if (score >= 90) {
    return {
      pt: "Excelente",
      en: "Excellent",
      es: "Excelente",
      fr: "Excellente",
      it: "Eccellente",
    }[language];
  }
  if (score >= 70) {
    return {
      pt: "Boa",
      en: "Strong",
      es: "Buena",
      fr: "Bonne",
      it: "Buona",
    }[language];
  }
  if (score >= 40) {
    return {
      pt: "Moderada",
      en: "Moderate",
      es: "Moderada",
      fr: "Modérée",
      it: "Moderata",
    }[language];
  }
  return {
    pt: "Em atenção",
    en: "Needs attention",
    es: "En atención",
    fr: "À surveiller",
    it: "Da attenzionare",
  }[language];
}

function getFinancialHealthMessage(score: number, language: AppLanguage) {
  if (score >= 90) {
    return {
      pt: "Sua organização financeira está muito forte.",
      en: "Your financial organization is very strong.",
      es: "Tu organización financiera está muy fuerte.",
      fr: "Votre organisation financière est très solide.",
      it: "La tua organizzazione finanziaria è molto solida.",
    }[language];
  }
  if (score >= 70) {
    return {
      pt: "Você está indo bem e ainda pode evoluir.",
      en: "You are doing well and can still improve.",
      es: "Vas bien y todavía puedes evolucionar.",
      fr: "Vous avancez bien et vous pouvez encore progresser.",
      it: "Stai andando bene e puoi ancora migliorare.",
    }[language];
  }
  if (score >= 40) {
    return {
      pt: "Seu controle financeiro está razoável, mas pede ajustes.",
      en: "Your financial control is fair, but it still needs adjustments.",
      es: "Tu control financiero es razonable, pero pide ajustes.",
      fr: "Votre contrôle financier est correct, mais demande encore des ajustements.",
      it: "Il tuo controllo finanziario è discreto, ma richiede ancora aggiustamenti.",
    }[language];
  }
  return {
    pt: "Sua vida financeira precisa de atenção imediata.",
    en: "Your financial life needs immediate attention.",
    es: "Tu vida financiera necesita atención inmediata.",
    fr: "Votre vie financière demande une attention immédiate.",
    it: "La tua vita finanziaria richiede attenzione immediata.",
  }[language];
}

function getFinancialCTA(score: number, language: AppLanguage) {
  if (score < 40) {
    return {
      pt: "Ajustar agora",
      en: "Adjust now",
      es: "Ajustar ahora",
      fr: "Ajuster maintenant",
      it: "Aggiusta ora",
    }[language];
  }
  if (score < 70) {
    return {
      pt: "Ver melhorias",
      en: "See improvements",
      es: "Ver mejoras",
      fr: "Voir les améliorations",
      it: "Vedi miglioramenti",
    }[language];
  }
  return {
    pt: "Continuar evolução",
    en: "Keep evolving",
    es: "Seguir evolucionando",
    fr: "Continuer à évoluer",
    it: "Continuare a evolvere",
  }[language];
}

function getFinancialInsights(params: {
  totalEntradasMes: number;
  totalSaidasMes: number;
  saldoMes: number;
  contasPendentes: number;
  contasVencemHoje: number;
}, language: AppLanguage) {
  const {
    totalEntradasMes,
    totalSaidasMes,
    saldoMes,
    contasPendentes,
    contasVencemHoje,
  } = params;

  const insights: string[] = [];

  if (totalEntradasMes <= 0 && totalSaidasMes <= 0) {
    insights.push(
      {
        pt: "Registre entradas e saídas para gerar análises mais precisas.",
        en: "Log income and expenses to generate more accurate insights.",
        es: "Registra ingresos y gastos para generar análisis más precisos.",
        fr: "Enregistrez vos entrées et sorties pour générer des analyses plus précises.",
        it: "Registra entrate e uscite per generare analisi più precise.",
      }[language]
    );
  }

  if (saldoMes < 0) {
    insights.push(
      {
        pt: "Suas saídas estão acima das entradas neste mês.",
        en: "Your expenses are above your income this month.",
        es: "Tus salidas están por encima de tus ingresos este mes.",
        fr: "Vos sorties sont au-dessus de vos entrées ce mois-ci.",
        it: "Le tue uscite sono superiori alle entrate questo mese.",
      }[language]
    );
  }

  if (contasPendentes > 0) {
    insights.push(
      contasPendentes === 1
        ? {
            pt: "Você tem 1 conta pendente para revisar.",
            en: "You have 1 pending bill to review.",
            es: "Tienes 1 cuenta pendiente por revisar.",
            fr: "Vous avez 1 facture en attente à revoir.",
            it: "Hai 1 conto in sospeso da rivedere.",
          }[language]
        : {
            pt: `Você tem ${contasPendentes} contas pendentes para revisar.`,
            en: `You have ${contasPendentes} pending bills to review.`,
            es: `Tienes ${contasPendentes} cuentas pendientes por revisar.`,
            fr: `Vous avez ${contasPendentes} factures en attente à revoir.`,
            it: `Hai ${contasPendentes} conti in sospeso da rivedere.`,
          }[language]
    );
  }

  if (contasVencemHoje > 0) {
    insights.push(
      contasVencemHoje === 1
        ? {
            pt: "Existe 1 conta vencendo hoje.",
            en: "There is 1 bill due today.",
            es: "Hay 1 cuenta que vence hoy.",
            fr: "Il y a 1 facture qui arrive à échéance aujourd'hui.",
            it: "C'è 1 conto in scadenza oggi.",
          }[language]
        : {
            pt: `Existem ${contasVencemHoje} contas vencendo hoje.`,
            en: `There are ${contasVencemHoje} bills due today.`,
            es: `Hay ${contasVencemHoje} cuentas que vencen hoy.`,
            fr: `Il y a ${contasVencemHoje} factures qui arrivent à échéance aujourd'hui.`,
            it: `Ci sono ${contasVencemHoje} conti in scadenza oggi.`,
          }[language]
    );
  }

  if (saldoMes >= 0 && contasPendentes === 0 && totalEntradasMes > 0) {
    insights.push(
      {
        pt: "Seu mês está equilibrado até aqui. Continue mantendo o controle.",
        en: "Your month is balanced so far. Keep the control steady.",
        es: "Tu mes está equilibrado hasta aquí. Sigue manteniendo el control.",
        fr: "Votre mois est équilibré jusqu'ici. Continuez à garder le contrôle.",
        it: "Il tuo mese è equilibrato fin qui. Continua a mantenere il controllo.",
      }[language]
    );
  }

  return insights.slice(0, 3);
}

function getFallbackSnapshotMessage(params: {
  feitosHoje: number;
  pendentesHoje: number;
  sequenciaAtual: number;
  totalHabitos: number;
}, language: AppLanguage) {
  const { feitosHoje, pendentesHoje, sequenciaAtual, totalHabitos } = params;

  if (totalHabitos === 0) {
    return {
      pt: "Crie seu primeiro hábito e comece a construir consistência.",
      en: "Create your first habit and start building consistency.",
      es: "Crea tu primer hábito y empieza a construir constancia.",
      fr: "Créez votre première habitude et commencez à construire de la constance.",
      it: "Crea la tua prima abitudine e inizia a costruire costanza.",
    }[language];
  }
  if (pendentesHoje === 0) {
    return {
      pt: "Hoje você fechou tudo com excelência.",
      en: "Today you closed everything with excellence.",
      es: "Hoy cerraste todo con excelencia.",
      fr: "Aujourd'hui, vous avez tout bouclé avec excellence.",
      it: "Oggi hai chiuso tutto con eccellenza.",
    }[language];
  }
  if (sequenciaAtual >= 7) {
    return {
      pt: "Sua sequência está forte. Preserve o ritmo.",
      en: "Your streak is strong. Protect the rhythm.",
      es: "Tu secuencia está fuerte. Mantén el ritmo.",
      fr: "Votre séquence est solide. Préservez le rythme.",
      it: "La tua sequenza è forte. Proteggi il ritmo.",
    }[language];
  }
  if (feitosHoje === 0) {
    return {
      pt: "Comece por uma pequena vitória e ganhe tração.",
      en: "Start with a small win and gain traction.",
      es: "Empieza por una pequeña victoria y gana tracción.",
      fr: "Commencez par une petite victoire et prenez de l'élan.",
      it: "Inizia con una piccola vittoria e prendi slancio.",
    }[language];
  }
  return {
    pt: "Você já começou bem. Falta pouco para elevar o dia.",
    en: "You already started well. Just a little more to lift the day.",
    es: "Ya empezaste bien. Falta poco para elevar tu día.",
    fr: "Vous avez déjà bien commencé. Il reste peu pour élever votre journée.",
    it: "Hai già iniziato bene. Manca poco per alzare il livello della giornata.",
  }[language];
}

function getAiHeaderMessage(
  plan: LifeJourneyPlan | null,
  language: AppLanguage
) {
  if (!plan) {
    return null;
  }

  const primaryLabel = getLifeAreaLabel(plan.primaryArea, language);
  const secondaryLabel = getLifeAreaLabel(plan.secondaryArea, language);

  switch (plan.primaryArea) {
    case "financeiro":
      return {
        pt: `Seu foco agora é ${primaryLabel}. Quando o dinheiro clareia, a mente organiza melhor ${secondaryLabel}.`,
        en: `Your focus right now is ${primaryLabel}. When money gets clearer, your mind organizes ${secondaryLabel} better.`,
        es: `Tu foco ahora es ${primaryLabel}. Cuando el dinero se aclara, tu mente organiza mejor ${secondaryLabel}.`,
        fr: `Votre focus du moment est ${primaryLabel}. Quand l'argent devient plus clair, votre esprit organise mieux ${secondaryLabel}.`,
        it: `Il tuo focus adesso è ${primaryLabel}. Quando il denaro si chiarisce, la mente organizza meglio ${secondaryLabel}.`,
      }[language];
    case "saude":
      return {
        pt: `Sua base agora é ${primaryLabel}. Cuidar da energia certa sustenta tudo o que você quer destravar em ${secondaryLabel}.`,
        en: `Your foundation right now is ${primaryLabel}. Protecting your energy supports everything you want to unlock in ${secondaryLabel}.`,
        es: `Tu base ahora es ${primaryLabel}. Cuidar la energía correcta sostiene todo lo que quieres destrabar en ${secondaryLabel}.`,
        fr: `Votre base du moment est ${primaryLabel}. Protéger votre énergie soutient tout ce que vous voulez débloquer en ${secondaryLabel}.`,
        it: `La tua base adesso è ${primaryLabel}. Proteggere l'energia giusta sostiene tutto ciò che vuoi sbloccare in ${secondaryLabel}.`,
      }[language];
    case "tempo":
      return {
        pt: `Seu próximo salto vem de ${primaryLabel}. Quando a rotina entra no eixo, ${secondaryLabel} ganha mais espaço para fluir.`,
        en: `Your next leap comes from ${primaryLabel}. When your routine aligns, ${secondaryLabel} gets more room to flow.`,
        es: `Tu próximo salto viene de ${primaryLabel}. Cuando la rutina entra en eje, ${secondaryLabel} gana más espacio para fluir.`,
        fr: `Votre prochain saut vient de ${primaryLabel}. Quand la routine s'aligne, ${secondaryLabel} gagne plus d'espace pour avancer.`,
        it: `Il tuo prossimo salto parte da ${primaryLabel}. Quando la routine entra in asse, ${secondaryLabel} trova più spazio per fluire.`,
      }[language];
    case "trabalho":
      return {
        pt: `A IA leu que ${primaryLabel} precisa de direção. Um passo consistente aqui pode mudar o ritmo de ${secondaryLabel}.`,
        en: `The AI read that ${primaryLabel} needs direction. One consistent step here can change the rhythm of ${secondaryLabel}.`,
        es: `La IA leyó que ${primaryLabel} necesita dirección. Un paso consistente aquí puede cambiar el ritmo de ${secondaryLabel}.`,
        fr: `L'IA a lu que ${primaryLabel} a besoin de direction. Un pas cohérent ici peut changer le rythme de ${secondaryLabel}.`,
        it: `L'IA ha letto che ${primaryLabel} ha bisogno di direzione. Un passo coerente qui può cambiare il ritmo di ${secondaryLabel}.`,
      }[language];
    case "habitos":
      return {
        pt: `Sua virada começa em ${primaryLabel}. Pequenas repetições bem feitas têm força para reorganizar ${secondaryLabel}.`,
        en: `Your turning point begins in ${primaryLabel}. Well-made small repetitions can reorganize ${secondaryLabel}.`,
        es: `Tu cambio empieza en ${primaryLabel}. Pequeñas repeticiones bien hechas pueden reorganizar ${secondaryLabel}.`,
        fr: `Votre changement commence par ${primaryLabel}. De petites répétitions bien faites peuvent réorganiser ${secondaryLabel}.`,
        it: `La tua svolta inizia da ${primaryLabel}. Piccole ripetizioni ben fatte possono riorganizzare ${secondaryLabel}.`,
      }[language];
    case "lazer":
      return {
        pt: `Seu momento pede mais respiro em ${primaryLabel}. Recuperar fôlego agora ajuda você a sustentar melhor ${secondaryLabel}.`,
        en: `This phase asks for more breathing room in ${primaryLabel}. Recovering your energy now helps you sustain ${secondaryLabel} better.`,
        es: `Tu momento pide más respiro en ${primaryLabel}. Recuperar energía ahora te ayuda a sostener mejor ${secondaryLabel}.`,
        fr: `Cette phase demande plus d'espace en ${primaryLabel}. Retrouver du souffle maintenant vous aide à mieux soutenir ${secondaryLabel}.`,
        it: `Questo momento chiede più respiro in ${primaryLabel}. Recuperare energia adesso ti aiuta a sostenere meglio ${secondaryLabel}.`,
      }[language];
    case "espiritualidade":
      return {
        pt: `Seu centro está em ${primaryLabel}. Quando a mente desacelera, você enxerga com mais clareza o caminho em ${secondaryLabel}.`,
        en: `Your center right now is ${primaryLabel}. When the mind slows down, you can see the path in ${secondaryLabel} more clearly.`,
        es: `Tu centro ahora está en ${primaryLabel}. Cuando la mente desacelera, ves con más claridad el camino en ${secondaryLabel}.`,
        fr: `Votre centre du moment est ${primaryLabel}. Quand l'esprit ralentit, vous voyez plus clairement le chemin en ${secondaryLabel}.`,
        it: `Il tuo centro adesso è ${primaryLabel}. Quando la mente rallenta, vedi con più chiarezza il cammino in ${secondaryLabel}.`,
      }[language];
    default:
      return null;
  }
}

function getAiJourneyCardCopy(
  plan: LifeJourneyPlan | null,
  language: AppLanguage
) {
  if (!plan) {
    return {
      title: {
        pt: "Sua próxima fase está pronta",
        en: "Your next phase is ready",
        es: "Tu próxima fase está lista",
        fr: "Votre prochaine étape est prête",
        it: "La tua prossima fase è pronta",
      }[language],
      text: {
        pt: "A IA organizou um caminho simples para você começar pelo que mais importa agora.",
        en: "AI has organized a simple path so you can begin with what matters most right now.",
        es: "La IA organizó una ruta simple para que empieces por lo que más importa ahora.",
        fr: "L'IA a organisé un chemin simple pour que vous commenciez par ce qui compte le plus maintenant.",
        it: "L'IA ha organizzato un percorso semplice per iniziare da ciò che conta di più adesso.",
      }[language],
    };
  }

  switch (plan.primaryArea) {
    case "financeiro":
      return {
        title: {
          pt: "Clareza financeira primeiro",
          en: "Financial clarity first",
          es: "Claridad financiera primero",
          fr: "Clarté financière d'abord",
          it: "Chiarezza finanziaria prima di tutto",
        }[language],
        text: {
          pt: "Suas próximas ações focam em entradas, contas fixas e visão do mês para tirar o dinheiro da névoa.",
          en: "Your next actions focus on income, fixed bills, and a clearer monthly view so money stops feeling blurry.",
          es: "Tus próximas acciones se enfocan en ingresos, gastos fijos y visión del mes para sacar el dinero de la niebla.",
          fr: "Vos prochaines actions se concentrent sur les entrées, les charges fixes et une vision plus claire du mois pour rendre l'argent lisible.",
          it: "Le tue prossime azioni si concentrano su entrate, spese fisse e visione del mese per rendere il denaro più chiaro.",
        }[language],
      };
    case "saude":
      return {
        title: {
          pt: "Sua energia vem primeiro",
          en: "Your energy comes first",
          es: "Tu energía va primero",
          fr: "Votre énergie passe d'abord",
          it: "La tua energia viene prima",
        }[language],
        text: {
          pt: "O plano desta fase prioriza cuidado, sinais do corpo e estabilidade para sustentar o resto da sua rotina.",
          en: "This phase prioritizes care, body signals, and stability so the rest of your routine can stand on solid ground.",
          es: "Esta fase prioriza cuidado, señales del cuerpo y estabilidad para sostener mejor el resto de tu rutina.",
          fr: "Cette phase privilégie le soin, les signaux du corps et la stabilité pour soutenir le reste de votre routine.",
          it: "Questa fase dà priorità alla cura, ai segnali del corpo e alla stabilità per sostenere meglio il resto della tua routine.",
        }[language],
      };
    case "habitos":
      return {
        title: {
          pt: "Constância antes de intensidade",
          en: "Consistency before intensity",
          es: "Constancia antes que intensidad",
          fr: "La régularité avant l'intensité",
          it: "Costanza prima dell'intensità",
        }[language],
        text: {
          pt: "As próximas tarefas foram pensadas para criar ritmo com leveza, sem sobrecarregar seu dia logo no começo.",
          en: "The next tasks are designed to build rhythm lightly, without overwhelming your day right away.",
          es: "Las próximas tareas fueron pensadas para crear ritmo con ligereza, sin sobrecargar tu día desde el inicio.",
          fr: "Les prochaines tâches sont conçues pour créer du rythme avec légèreté, sans surcharger votre journée dès le début.",
          it: "Le prossime attività sono pensate per creare ritmo con leggerezza, senza sovraccaricare la tua giornata fin dall'inizio.",
        }[language],
      };
    case "trabalho":
      return {
        title: {
          pt: "Seu foco profissional agora",
          en: "Your professional focus now",
          es: "Tu foco profesional ahora",
          fr: "Votre focus professionnel maintenant",
          it: "Il tuo focus professionale ora",
        }[language],
        text: {
          pt: "A rota desta fase organiza prioridades, entregas e clareza de direção para você voltar a avançar com firmeza.",
          en: "This phase organizes priorities, deliveries, and direction so you can move forward with confidence again.",
          es: "Esta fase organiza prioridades, entregas y claridad de dirección para que vuelvas a avanzar con firmeza.",
          fr: "Cette phase organise les priorités, les livrables et la clarté de direction pour vous faire avancer avec assurance.",
          it: "Questa fase organizza priorità, consegne e chiarezza di direzione per aiutarti ad avanzare con più sicurezza.",
        }[language],
      };
    case "tempo":
      return {
        title: {
          pt: "Sua rotina precisa de espaço",
          en: "Your routine needs room",
          es: "Tu rutina necesita espacio",
          fr: "Votre routine a besoin d'espace",
          it: "La tua routine ha bisogno di spazio",
        }[language],
        text: {
          pt: "As próximas ações foram montadas para reduzir ruído, proteger foco e devolver mais fôlego ao seu dia.",
          en: "The next actions are set up to reduce noise, protect focus, and give your day more breathing room.",
          es: "Las próximas acciones están pensadas para reducir ruido, proteger tu foco y devolver aire a tu día.",
          fr: "Les prochaines actions sont conçues pour réduire le bruit, protéger votre concentration et redonner de l'air à votre journée.",
          it: "Le prossime azioni sono pensate per ridurre il rumore, proteggere il focus e ridare respiro alla tua giornata.",
        }[language],
      };
    case "aprendizado":
      return {
        title: {
          pt: "Aprender com direção",
          en: "Learn with direction",
          es: "Aprender con dirección",
          fr: "Apprendre avec direction",
          it: "Imparare con direzione",
        }[language],
        text: {
          pt: "Esta etapa organiza pequenos avanços de aprendizado para transformar curiosidade em evolução consistente.",
          en: "This stage organizes small learning steps to turn curiosity into consistent progress.",
          es: "Esta etapa organiza pequeños avances de aprendizaje para convertir la curiosidad en evolución constante.",
          fr: "Cette étape organise de petites avancées d'apprentissage pour transformer la curiosité en progression régulière.",
          it: "Questa fase organizza piccoli passi di apprendimento per trasformare la curiosità in una crescita costante.",
        }[language],
      };
    case "lazer":
      return {
        title: {
          pt: "Recuperar respiro também importa",
          en: "Restoring breathing room also matters",
          es: "Recuperar respiro también importa",
          fr: "Retrouver du souffle compte aussi",
          it: "Recuperare respiro conta anche",
        }[language],
        text: {
          pt: "Seu plano agora abre espaço para descanso e prazer com intenção, sem culpa e sem perder o ritmo do restante.",
          en: "Your plan now makes room for rest and joy with intention, without guilt and without losing momentum elsewhere.",
          es: "Tu plan ahora abre espacio para descanso y disfrute con intención, sin culpa y sin perder el ritmo de lo demás.",
          fr: "Votre plan ouvre maintenant un espace pour le repos et le plaisir avec intention, sans culpabilité et sans perdre le rythme du reste.",
          it: "Il tuo piano ora apre spazio al riposo e al piacere con intenzione, senza sensi di colpa e senza perdere il ritmo del resto.",
        }[language],
      };
    case "espiritualidade":
      return {
        title: {
          pt: "Presença antes do excesso",
          en: "Presence before overload",
          es: "Presencia antes que exceso",
          fr: "La présence avant l'excès",
          it: "Presenza prima dell'eccesso",
        }[language],
        text: {
          pt: "Esta fase foi desenhada para devolver silêncio, presença e clareza interior ao seu dia a dia.",
          en: "This phase is designed to bring silence, presence, and inner clarity back into your day-to-day life.",
          es: "Esta fase fue diseñada para devolver silencio, presencia y claridad interior a tu día a día.",
          fr: "Cette phase a été conçue pour ramener le silence, la présence et la clarté intérieure dans votre quotidien.",
          it: "Questa fase è stata pensata per riportare silenzio, presenza e chiarezza interiore nella tua vita quotidiana.",
        }[language],
      };
    default:
      return {
        title: {
          pt: "Sua próxima fase está pronta",
          en: "Your next phase is ready",
          es: "Tu próxima fase está lista",
          fr: "Votre prochaine étape est prête",
          it: "La tua prossima fase è pronta",
        }[language],
        text: {
          pt: "A IA organizou um caminho simples para você começar pelo que mais importa agora.",
          en: "AI has organized a simple path so you can begin with what matters most right now.",
          es: "La IA organizó una ruta simple para que empieces por lo que más importa ahora.",
          fr: "L'IA a organisé un chemin simple pour que vous commenciez par ce qui compte le plus maintenant.",
          it: "L'IA ha organizzato un percorso semplice per iniziare da ciò che conta di più adesso.",
        }[language],
      };
  }
}

function getMicroVictory(params: {
  feitosHoje: number;
  totalHabitos: number;
  sequenciaAtual: number;
  financeScore: number;
  pendingMedicationsToday: number;
}, language: AppLanguage) {
  const {
    feitosHoje,
    totalHabitos,
    sequenciaAtual,
    financeScore,
    pendingMedicationsToday,
  } = params;

  if (totalHabitos > 0 && feitosHoje === totalHabitos) {
    return {
      pt: "Sua rotina está fechada com excelência.",
      en: "Your routine is closed with excellence.",
      es: "Tu rutina está cerrada con excelencia.",
      fr: "Votre routine est bouclée avec excellence.",
      it: "La tua routine è chiusa con eccellenza.",
    }[language];
  }

  if (sequenciaAtual >= 7) {
    return {
      pt: `Você sustenta uma sequência de ${sequenciaAtual} dias.`,
      en: `You are sustaining a ${sequenciaAtual}-day streak.`,
      es: `Estás sosteniendo una secuencia de ${sequenciaAtual} días.`,
      fr: `Vous tenez une séquence de ${sequenciaAtual} jours.`,
      it: `Stai sostenendo una sequenza di ${sequenciaAtual} giorni.`,
    }[language];
  }

  if (financeScore >= 70) {
    return {
      pt: "Sua saúde financeira está em zona de estabilidade.",
      en: "Your financial health is in a stability zone.",
      es: "Tu salud financiera está en una zona de estabilidad.",
      fr: "Votre santé financière est dans une zone de stabilité.",
      it: "La tua salute finanziaria è in una zona di stabilità.",
    }[language];
  }

  if (pendingMedicationsToday === 0) {
    return {
      pt: "Sua rotina de cuidado está em dia.",
      en: "Your care routine is up to date.",
      es: "Tu rutina de cuidado está al día.",
      fr: "Votre routine de soin est à jour.",
      it: "La tua routine di cura è in regola.",
    }[language];
  }

  if (feitosHoje > 0) {
    return {
      pt: `Você já venceu ${feitosHoje} etapa(s) hoje.`,
      en: `You already won ${feitosHoje} step(s) today.`,
      es: `Ya superaste ${feitosHoje} etapa(s) hoy.`,
      fr: `Vous avez déjà franchi ${feitosHoje} étape(s) aujourd'hui.`,
      it: `Hai già superato ${feitosHoje} fase/i oggi.`,
    }[language];
  }

  return {
    pt: "Seu sistema está pronto para construir um grande dia.",
    en: "Your system is ready to build a great day.",
    es: "Tu sistema está listo para construir un gran día.",
    fr: "Votre système est prêt à construire une grande journée.",
    it: "Il tuo sistema è pronto per costruire una grande giornata.",
  }[language];
}

function getDynamicHeroData(params: {
  financeScore: number;
  financialHealthLabel: string;
  financialHealthMessage: string;
  financialCTA: string;
  contasPendentes: number;
  contasVencemHoje: number;
  focusData: ReturnType<typeof getFocusData>;
  lifeScore: number;
  lifeScoreLabel: string;
  totalHabitos: number;
  feitosHoje: number;
  sequenciaAtual: number;
}, language: AppLanguage) {
  const {
    financeScore,
    financialHealthLabel,
    financialHealthMessage,
    financialCTA,
    contasPendentes,
    contasVencemHoje,
    focusData,
    lifeScore,
    lifeScoreLabel,
    totalHabitos,
    feitosHoje,
    sequenciaAtual,
  } = params;

  if (financeScore < 45 || contasPendentes > 0 || contasVencemHoje > 0) {
    return {
      eyebrow: {
        pt: "Prioridade do momento",
        en: "Priority right now",
        es: "Prioridad del momento",
        fr: "Priorité du moment",
        it: "Priorità del momento",
      }[language],
      badge: financialHealthLabel,
      title: {
        pt: `Saúde financeira: ${financeScore}/100`,
        en: `Financial health: ${financeScore}/100`,
        es: `Salud financiera: ${financeScore}/100`,
        fr: `Santé financière : ${financeScore}/100`,
        it: `Salute finanziaria: ${financeScore}/100`,
      }[language],
      subtitle: financialHealthMessage,
      cta: financialCTA,
      route: "/dinheiro" as AppRoute,
      progress: financeScore,
      icon: "wallet-outline" as const,
    };
  }

  if (focusData.route === "/saude") {
    return {
      eyebrow: {
        pt: "Prioridade do momento",
        en: "Priority right now",
        es: "Prioridad del momento",
        fr: "Priorité du moment",
        it: "Priorità del momento",
      }[language],
      badge: {
        pt: "Em atenção",
        en: "Needs attention",
        es: "En atención",
        fr: "À surveiller",
        it: "Da attenzionare",
      }[language],
      title: {
        pt: "Seu cuidado precisa entrar no trilho",
        en: "Your care needs to get back on track",
        es: "Tu cuidado necesita volver al eje",
        fr: "Votre routine de soin doit revenir sur les rails",
        it: "La tua cura ha bisogno di rientrare in carreggiata",
      }[language],
      subtitle: focusData.subtitle,
      cta: {
        pt: "Abrir Saúde",
        en: "Open Health",
        es: "Abrir Salud",
        fr: "Ouvrir Santé",
        it: "Apri Salute",
      }[language],
      route: "/saude" as AppRoute,
      progress: 40,
      icon: "medical-outline" as const,
    };
  }

  if (totalHabitos > 0 && feitosHoje < totalHabitos) {
    return {
      eyebrow: {
        pt: "Prioridade do momento",
        en: "Priority right now",
        es: "Prioridad del momento",
        fr: "Priorité du moment",
        it: "Priorità del momento",
      }[language],
      badge: {
        pt: "Hoje",
        en: "Today",
        es: "Hoy",
        fr: "Aujourd'hui",
        it: "Oggi",
      }[language],
      title: {
        pt: "Sua rotina de hábitos ainda pede ação",
        en: "Your habit routine still needs action",
        es: "Tu rutina de hábitos todavía pide acción",
        fr: "Votre routine d'habitudes demande encore de l'action",
        it: "La tua routine di abitudini richiede ancora azione",
      }[language],
      subtitle:
        feitosHoje === 0
          ? {
              pt: "Comece por uma microvitória e ganhe tração.",
              en: "Start with a micro-win and gain traction.",
              es: "Empieza por una microvictoria y gana tracción.",
              fr: "Commencez par une micro-victoire et prenez de l'élan.",
              it: "Inizia con una microvittoria e prendi slancio.",
            }[language]
          : {
              pt: `Você já concluiu ${feitosHoje} de ${totalHabitos} hábitos hoje.`,
              en: `You already completed ${feitosHoje} of ${totalHabitos} habits today.`,
              es: `Ya completaste ${feitosHoje} de ${totalHabitos} hábitos hoy.`,
              fr: `Vous avez déjà terminé ${feitosHoje} sur ${totalHabitos} habitudes aujourd'hui.`,
              it: `Hai già completato ${feitosHoje} di ${totalHabitos} abitudini oggi.`,
            }[language],
      cta: {
        pt: "Abrir Hábitos",
        en: "Open Habits",
        es: "Abrir Hábitos",
        fr: "Ouvrir Habitudes",
        it: "Apri Abitudini",
      }[language],
      route: "/habitos" as AppRoute,
      progress: Math.round((feitosHoje / Math.max(totalHabitos, 1)) * 100),
      icon: "checkmark-circle-outline" as const,
    };
  }

  if (sequenciaAtual >= 7) {
    return {
      eyebrow: {
        pt: "Seu sistema hoje",
        en: "Your system today",
        es: "Tu sistema hoy",
        fr: "Votre système aujourd'hui",
        it: "Il tuo sistema oggi",
      }[language],
      badge: `${lifeScore}/100`,
      title: {
        pt: "Você está em ritmo de evolução real",
        en: "You are in a real growth rhythm",
        es: "Estás en un ritmo de evolución real",
        fr: "Vous êtes dans un vrai rythme d'évolution",
        it: "Sei in un ritmo di evoluzione reale",
      }[language],
      subtitle: lifeScoreLabel,
      cta: {
        pt: "Abrir conquistas",
        en: "Open achievements",
        es: "Abrir logros",
        fr: "Ouvrir les réussites",
        it: "Apri conquiste",
      }[language],
      route: "/conquistas" as AppRoute,
      progress: lifeScore,
      icon: "trending-up-outline" as const,
    };
  }

  return {
    eyebrow: {
      pt: "Seu sistema hoje",
      en: "Your system today",
      es: "Tu sistema hoy",
      fr: "Votre système aujourd'hui",
      it: "Il tuo sistema oggi",
    }[language],
    badge: `${lifeScore}/100`,
    title: {
      pt: "Seu painel de evolução está ativo",
      en: "Your growth dashboard is active",
      es: "Tu panel de evolución está activo",
      fr: "Votre tableau d'évolution est actif",
      it: "Il tuo pannello di evoluzione è attivo",
    }[language],
    subtitle: lifeScoreLabel,
    cta: {
      pt: "Abrir conquistas",
      en: "Open achievements",
      es: "Abrir logros",
      fr: "Ouvrir les réussites",
      it: "Apri conquiste",
    }[language],
    route: "/conquistas" as AppRoute,
    progress: lifeScore,
    icon: "sparkles-outline" as const,
  };
}

function ScaleButton({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.timing(scale, {
      toValue: 0.98,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { settings, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const lifeAreaMeta = useMemo(() => getLifeAreaMeta(language), [language]);
  const homeTourSteps = useMemo(
    () => [
      {
        key: "hero" as HomeTourKey,
        icon: "sparkles-outline" as const,
        title: t("home.tour.step1.title"),
        description: t("home.tour.step1.description"),
        primaryLabel: t("common.continue"),
      },
      {
        key: "card" as HomeTourKey,
        icon: "sparkles-outline" as const,
        title: t("home.tour.step2.title"),
        description: t("home.tour.step2.description"),
        primaryLabel: t("common.continue"),
      },
      {
        key: "start" as HomeTourKey,
        icon: "play-outline" as const,
        title: t("home.tour.step3.title"),
        description: t("home.tour.step3.description"),
        primaryLabel: t("common.continue"),
      },
      {
        key: "plan" as HomeTourKey,
        icon: "map-outline" as const,
        title: t("home.tour.step4.title"),
        description: t("home.tour.step4.description"),
        primaryLabel: t("common.continue"),
      },
      {
        key: "areas" as HomeTourKey,
        icon: "grid-outline" as const,
        title: t("home.tour.step5.title"),
        description: t("home.tour.step5.description"),
        primaryLabel: t("common.continue"),
      },
    ],
    [t]
  );

  const [habits, setHabits] = useState<Habit[]>([]);
  const [moneyEntries, setMoneyEntries] = useState<MoneyEntry[]>([]);
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([]);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lifeJourneyPlan, setLifeJourneyPlan] = useState<LifeJourneyPlan | null>(
    null
  );
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showDetailedHome, setShowDetailedHome] = useState(false);
  const [showAppTourPrompt, setShowAppTourPrompt] = useState(false);
  const [showJourneyTourInvite, setShowJourneyTourInvite] = useState(false);
  const [showJourneyTour, setShowJourneyTour] = useState(false);
  const [journeyTourStepIndex, setJourneyTourStepIndex] = useState(0);
  const [tourTargets, setTourTargets] = useState<{
    hero: TourTargetRect | null;
    card: TourTargetRect | null;
    start: TourTargetRect | null;
    plan: TourTargetRect | null;
    areas: TourTargetRect | null;
  }>({
    hero: null,
    card: null,
    start: null,
    plan: null,
    areas: null,
  });
  const scrollRef = useRef<ScrollView | null>(null);
  const homeTourOffsetsRef = useRef<Record<HomeTourKey, number>>({
    hero: 0,
    card: 0,
    start: 0,
    plan: 0,
    areas: 0,
  });
  const heroTourRef = useRef<View | null>(null);
  const cardTourRef = useRef<View | null>(null);
  const startTourRef = useRef<View | null>(null);
  const planTourRef = useRef<View | null>(null);
  const areasTourRef = useRef<View | null>(null);

  const radarAnim = useRef(new Animated.Value(0)).current;
  const pageAnim = useRef(new Animated.Value(0)).current;

  const isPremium = settings.plan === "premium";
  const homeBackground = colors.isDark ? "#0A0A0B" : colors.background;
  const homeSurface = colors.isDark ? "#111214" : colors.surface;
  const homeSurfaceAlt = colors.isDark ? "#17181B" : colors.surfaceAlt;
  const homeBorder = colors.isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const homeShadow = colors.isDark ? "rgba(0,0,0,0.38)" : colors.shadow;
  const surfaceMuted = colors.isDark
    ? "#1D1F23"
    : (colors as any).surfaceMuted || colors.surfaceAlt || colors.surface;
  const homeSuccess = colors.isDark ? "#D1D5DB" : colors.success;
  const homeWarning = colors.isDark ? "#9CA3AF" : colors.warning;
  const homeHeroGlowPrimary = colors.isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(37,99,235,0.10)";
  const homeHeroGlowSecondary = colors.isDark
    ? "rgba(156,163,175,0.10)"
    : "rgba(16,185,129,0.07)";

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const showPremiumAlert = useCallback(
    (feature: string) => {
      Alert.alert(
        t("home.premiumAlertTitle"),
        t("home.premiumAlertText", { feature }),
        [
          { text: t("common.nowNot"), style: "cancel" },
          { text: t("common.knowPremium"), onPress: goToPremium },
        ]
      );
    },
    [goToPremium, t]
  );

  const loadDashboardData = useCallback(async () => {
    try {
      const [
        habitsRaw,
        moneyRaw,
        billsRaw,
        medsRaw,
        profileRaw,
        aiPlanRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(HABITS_KEY),
        AsyncStorage.getItem(MONEY_ENTRIES_KEY),
        AsyncStorage.getItem(MONEY_FIXED_BILLS_KEY),
        AsyncStorage.getItem(MEDICATIONS_KEY),
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(AI_PLAN_KEY),
      ]);

      const parsedHabits = habitsRaw ? JSON.parse(habitsRaw) : [];
      const parsedMoney = moneyRaw ? JSON.parse(moneyRaw) : [];
      const parsedBills = billsRaw ? JSON.parse(billsRaw) : [];
      const parsedMeds = medsRaw ? JSON.parse(medsRaw) : [];

      const normalizedHabits: Habit[] = Array.isArray(parsedHabits)
        ? parsedHabits.map((item: any) => ({
            id: String(item.id ?? ""),
            title: String(item.title ?? ""),
            createdAt: String(item.createdAt ?? new Date().toISOString()),
            completedDates: Array.isArray(item.completedDates)
              ? item.completedDates.map(String)
              : [],
          }))
        : [];

      const normalizedMoney: MoneyEntry[] = Array.isArray(parsedMoney)
        ? parsedMoney.map((item: any) => ({
            id: String(item.id ?? ""),
            title: String(item.title ?? ""),
            amount: Number(item.amount ?? 0),
            type: item.type === "entrada" ? "entrada" : "saida",
            category: String(item.category ?? "Outros"),
            createdAt: String(item.createdAt ?? new Date().toISOString()),
          }))
        : [];

      const normalizedBills: FixedBill[] = Array.isArray(parsedBills)
        ? parsedBills.map((item: any) => ({
            id: String(item.id ?? ""),
            title: String(item.title ?? ""),
            amount: Number(item.amount ?? 0),
            dueDay: Number(item.dueDay ?? 1),
            category: String(item.category ?? "Outros"),
            lastPaidPeriod: item.lastPaidPeriod ?? null,
            createdAt: String(item.createdAt ?? new Date().toISOString()),
          }))
        : [];

      const normalizedMeds: MedicationItem[] = Array.isArray(parsedMeds)
        ? parsedMeds.map((item: any) => ({
            id: String(item.id ?? ""),
            name: String(item.name ?? ""),
            dosage: String(item.dosage ?? ""),
            time: String(item.time ?? ""),
            notes: String(item.notes ?? ""),
            active: !!item.active,
            takenTodayDates: Array.isArray(item.takenTodayDates)
              ? item.takenTodayDates.map(String)
              : [],
            createdAt: String(item.createdAt ?? new Date().toISOString()),
          }))
        : [];

      setHabits(normalizedHabits);
      setMoneyEntries(normalizedMoney);
      setFixedBills(normalizedBills);
      setMedications(normalizedMeds);
      setProfile(profileRaw ? JSON.parse(profileRaw) : null);
      const normalizedPlan = aiPlanRaw
        ? normalizeLifeJourneyPlan(JSON.parse(aiPlanRaw), language)
        : null;

      setLifeJourneyPlan(normalizedPlan);

      await readJourneyTourState();
      const appIntroState = await readAppIntroTourState();

      setShowJourneyTourInvite(false);
      setShowJourneyTour(false);
      setShowAppTourPrompt(
        Boolean(
          normalizedPlan &&
            !appIntroState.prompted &&
            !appIntroState.completed &&
            !appIntroState.skipped
        )
      );
    } catch (error) {
      console.log("Erro ao carregar dashboard:", error);
      setHabits([]);
      setMoneyEntries([]);
      setFixedBills([]);
      setMedications([]);
      setProfile(null);
      setLifeJourneyPlan(null);
      setShowAppTourPrompt(false);
      setShowJourneyTourInvite(false);
      setShowJourneyTour(false);
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const today = useMemo(() => todayKey(), []);
  const currentPeriod = useMemo(() => getCurrentPeriodKey(), []);
  const todayDay = useMemo(() => new Date().getDate(), []);

  const totalHabitos = habits.length;

  const feitosHoje = useMemo(() => {
    return habits.reduce(
      (acc, habit) => acc + (habit.completedDates.includes(today) ? 1 : 0),
      0
    );
  }, [habits, today]);

  const pendentesHoje = Math.max(totalHabitos - feitosHoje, 0);
  const sequenciaAtual = useMemo(() => getCurrentStreak(habits), [habits]);
  const totalConclusoes = useMemo(() => getTotalCompletions(habits), [habits]);
  const levelData = useMemo(
    () => getLevelData(totalConclusoes),
    [totalConclusoes]
  );

  const currentMonthEntries = useMemo(() => {
    return moneyEntries.filter(
      (entry) =>
        entry.createdAt && entry.createdAt.slice(0, 7) === currentPeriod
    );
  }, [moneyEntries, currentPeriod]);

  const totalEntradasMes = useMemo(() => {
    return currentMonthEntries
      .filter((entry) => entry.type === "entrada")
      .reduce((acc, entry) => acc + entry.amount, 0);
  }, [currentMonthEntries]);

  const totalSaidasMes = useMemo(() => {
    return currentMonthEntries
      .filter((entry) => entry.type === "saida")
      .reduce((acc, entry) => acc + entry.amount, 0);
  }, [currentMonthEntries]);

  const saldoMes = totalEntradasMes - totalSaidasMes;

  const contasPendentes = useMemo(() => {
    return fixedBills.filter(
      (bill) => !isBillPaidInCurrentMonth(bill, currentPeriod)
    ).length;
  }, [fixedBills, currentPeriod]);

  const contasVencemHoje = useMemo(() => {
    return fixedBills.filter(
      (bill) =>
        !isBillPaidInCurrentMonth(bill, currentPeriod) &&
        bill.dueDay === todayDay
    ).length;
  }, [fixedBills, currentPeriod, todayDay]);

  const activeMedications = useMemo(() => {
    return medications.filter((item) => item.active);
  }, [medications]);

  const pendingMedicationsToday = useMemo(() => {
    return activeMedications.filter(
      (item) => !item.takenTodayDates.includes(today)
    ).length;
  }, [activeMedications, today]);

  const momentLabel = useMemo(() => getCurrentMomentLabel(t), [t]);
  const greeting = useMemo(() => getGreeting(t), [t]);
  const quoteText = useMemo(() => {
    return getMomentPhrase(
      feitosHoje,
      totalHabitos,
      sequenciaAtual,
      pendingMedicationsToday,
      language
    );
  }, [
    feitosHoje,
    totalHabitos,
    sequenciaAtual,
    pendingMedicationsToday,
    language,
  ]);

  const displayName =
    profile?.nickname?.trim() || profile?.name?.trim() || "Vida em Ordem";

  const avatarLetter =
    profile?.nickname?.trim()?.charAt(0)?.toUpperCase() ||
    profile?.name?.trim()?.charAt(0)?.toUpperCase() ||
    "V";

  const avatarBorderColor =
    profile?.avatarBorderColor ||
    settings.accentColor ||
    DEFAULT_AVATAR_BORDER_COLOR;

  const avatarAccentLuminance = (() => {
    const { r, g, b } = hexToRgb(avatarBorderColor);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  })();

  const homeAccent = colors.accent;
  const homeAccentSoft = colors.accentSoft;
  const homeAccentBorder = colors.accentBorder;
  const radarAccent =
    !colors.isDark && avatarAccentLuminance > 0.82 ? "#2563EB" : homeAccent;
  const primaryButtonTextColor = colors.accentButtonText;
  const journeyPrimaryMeta = lifeJourneyPlan
    ? lifeAreaMeta[lifeJourneyPlan.primaryArea]
    : null;
  const journeySecondaryMeta = lifeJourneyPlan
    ? lifeAreaMeta[lifeJourneyPlan.secondaryArea]
    : null;
  const homeUi = useMemo(() => HOME_STATIC_COPY[language], [language]);

  const healthScore = useMemo(() => {
    if (activeMedications.length === 0) {
      return totalHabitos > 0
        ? Math.round((feitosHoje / Math.max(totalHabitos, 1)) * 100)
        : 60;
    }

    const taken = activeMedications.length - pendingMedicationsToday;
    return clamp(
      Math.round((taken / Math.max(activeMedications.length, 1)) * 100),
      0,
      100
    );
  }, [
    activeMedications.length,
    pendingMedicationsToday,
    totalHabitos,
    feitosHoje,
  ]);

  const financeScore = useMemo(() => {
    const base =
      totalEntradasMes > 0 || totalSaidasMes > 0
        ? 50 +
          ((saldoMes / Math.max(totalEntradasMes + totalSaidasMes, 1)) * 100)
        : 55;

    const penalty = contasPendentes * 8 + contasVencemHoje * 12;
    return clamp(Math.round(base - penalty), 0, 100);
  }, [
    saldoMes,
    totalEntradasMes,
    totalSaidasMes,
    contasPendentes,
    contasVencemHoje,
  ]);

  const financialHealthLabel = useMemo(
    () => getFinancialHealthLabel(financeScore, language),
    [financeScore, language]
  );

  const financialHealthMessage = useMemo(
    () => getFinancialHealthMessage(financeScore, language),
    [financeScore, language]
  );

  const financialCTA = useMemo(
    () => getFinancialCTA(financeScore, language),
    [financeScore, language]
  );

  const financialInsights = useMemo(
    () =>
      getFinancialInsights({
        totalEntradasMes,
        totalSaidasMes,
        saldoMes,
        contasPendentes,
        contasVencemHoje,
      }, language),
    [
      totalEntradasMes,
      totalSaidasMes,
      saldoMes,
      contasPendentes,
      contasVencemHoje,
      language,
    ]
  );

  const habitsScore = useMemo(() => {
    if (totalHabitos === 0) return 0;
    return clamp(
      Math.round((feitosHoje / Math.max(totalHabitos, 1)) * 100),
      0,
      100
    );
  }, [feitosHoje, totalHabitos]);

  const consistencyScore = useMemo(() => {
    return clamp(Math.round((sequenciaAtual / 7) * 100), 0, 100);
  }, [sequenciaAtual]);

  const organizationScore = useMemo(() => {
    let points = 0;
    if (totalHabitos > 0) points += 25;
    if (moneyEntries.length > 0) points += 25;
    if (fixedBills.length > 0) points += 25;
    if (activeMedications.length > 0) points += 25;
    return clamp(points, 0, 100);
  }, [
    totalHabitos,
    moneyEntries.length,
    fixedBills.length,
    activeMedications.length,
  ]);

  const evolutionScore = useMemo(() => {
    return clamp(Math.round((totalConclusoes / 20) * 100), 0, 100);
  }, [totalConclusoes]);

  const radarData = useMemo(
    () => [
      {
        id: "saude" as RadarMetricId,
        label: homeUi.areaHealth,
        value: healthScore,
        route: getRadarRoute("saude"),
      },
      {
        id: "financeiro" as RadarMetricId,
        label: homeUi.areaMoney,
        value: financeScore,
        route: getRadarRoute("financeiro"),
      },
      {
        id: "habitos" as RadarMetricId,
        label: t("home.priority.habits"),
        value: habitsScore,
        route: getRadarRoute("habitos"),
      },
      {
        id: "constancia" as RadarMetricId,
        label: homeUi.radarConsistency,
        value: consistencyScore,
        route: getRadarRoute("constancia"),
      },
      {
        id: "organizacao" as RadarMetricId,
        label: homeUi.radarOrganization,
        value: organizationScore,
        route: getRadarRoute("organizacao"),
      },
      {
        id: "evolucao" as RadarMetricId,
        label: homeUi.radarEvolution,
        value: evolutionScore,
        route: getRadarRoute("evolucao"),
      },
    ],
    [
      homeUi.areaHealth,
      homeUi.areaMoney,
      homeUi.radarConsistency,
      homeUi.radarOrganization,
      homeUi.radarEvolution,
      healthScore,
      financeScore,
      habitsScore,
      consistencyScore,
      organizationScore,
      evolutionScore,
      t,
    ]
  );

  const focusData = useMemo(
    () =>
      getFocusData({
        pendingMedicationsToday,
        contasVencemHoje,
        contasPendentes,
        pendentesHoje,
        totalHabitos,
        feitosHoje,
      }, language),
    [
      pendingMedicationsToday,
      contasVencemHoje,
      contasPendentes,
      pendentesHoje,
      totalHabitos,
      feitosHoje,
      language,
    ]
  );

  const snapshotMessage = useMemo(
    () => {
      const aiMessage = getAiHeaderMessage(lifeJourneyPlan, language);

      if (aiMessage) {
        return aiMessage;
      }

      return getFallbackSnapshotMessage(
        {
          feitosHoje,
          pendentesHoje,
          sequenciaAtual,
          totalHabitos,
        },
        language
      );
    },
    [
      feitosHoje,
      pendentesHoje,
      sequenciaAtual,
      totalHabitos,
      language,
      lifeJourneyPlan,
    ]
  );

  const aiJourneyCardCopy = useMemo(
    () => getAiJourneyCardCopy(lifeJourneyPlan, language),
    [language, lifeJourneyPlan]
  );

  const microVictoryText = useMemo(
    () =>
      getMicroVictory({
        feitosHoje,
        totalHabitos,
        sequenciaAtual,
        financeScore,
        pendingMedicationsToday,
      }, language),
    [
      feitosHoje,
      totalHabitos,
      sequenciaAtual,
      financeScore,
      pendingMedicationsToday,
      language,
    ]
  );

  const radarSize = 250;
  const radarRadius = 78;
  const radarLevels = [25, 50, 75, 100];

  const lifeScoreBase = Math.round(
    radarData.reduce((acc, item) => acc + item.value, 0) / radarData.length
  );

  const lifeScoreLabel = getScoreLabel(lifeScoreBase, t);

  const dynamicHeroData = useMemo(
    () =>
      getDynamicHeroData({
        financeScore,
        financialHealthLabel,
        financialHealthMessage,
        financialCTA,
        contasPendentes,
        contasVencemHoje,
        focusData,
        lifeScore: lifeScoreBase,
        lifeScoreLabel,
        totalHabitos,
        feitosHoje,
        sequenciaAtual,
      }, language),
    [
      financeScore,
      financialHealthLabel,
      financialHealthMessage,
      financialCTA,
      contasPendentes,
      contasVencemHoje,
      focusData,
      lifeScoreBase,
      lifeScoreLabel,
      totalHabitos,
      feitosHoje,
      sequenciaAtual,
      language,
    ]
  );

  const heroSupportPills = useMemo(
    () => [
      {
        icon: "flame-outline" as const,
        text:
          sequenciaAtual > 0
            ? t("home.hero.support.streak", { count: sequenciaAtual })
            : t("home.hero.support.buildStreak"),
      },
      {
        icon: "cash-outline" as const,
        text:
          saldoMes >= 0
            ? t("home.hero.support.positiveBalance")
            : t("home.hero.support.balanceAttention"),
      },
      {
        icon: "medical-outline" as const,
        text:
          pendingMedicationsToday > 0
            ? t("home.hero.support.pendingCare", {
                count: pendingMedicationsToday,
              })
            : t("home.hero.support.careUpToDate"),
      },
    ],
    [sequenciaAtual, saldoMes, pendingMedicationsToday, t]
  );

  const prioritiesRail = useMemo(
    () => [
      {
        title: t("home.priority.finances"),
        subtitle:
          saldoMes >= 0
            ? t("home.priority.monthUnderControl")
            : t("home.priority.adjustOutputs"),
        value: `${financeScore}/100`,
        route: "/dinheiro" as AppRoute,
        icon: "wallet-outline" as const,
        progress: financeScore,
        status:
          financeScore < 40
            ? t("home.priority.timeToAct")
            : financeScore < 70
              ? t("home.priority.goodProgress")
              : t("home.priority.stable"),
      },
      {
        title: t("home.priority.habits"),
        subtitle:
          pendentesHoje === 0
            ? t("home.priority.dayClosed")
            : t("home.priority.pendingToday", { count: pendentesHoje }),
        value: `${feitosHoje}/${Math.max(totalHabitos, 0)}`,
        route: "/habitos" as AppRoute,
        icon: "flame-outline" as const,
        progress: habitsScore,
        status:
          habitsScore >= 60
            ? t("home.priority.goodProgress")
            : t("home.priority.timeToAct"),
      },
    ],
    [
      saldoMes,
      financeScore,
      pendentesHoje,
      feitosHoje,
      totalHabitos,
      habitsScore,
      t,
    ]
  );

  const journeySteps = useMemo(
    () => [
      {
        step: "1",
        title: homeUi.journeyDirection,
        text: dynamicHeroData.title,
        icon: "compass-outline" as const,
      },
      {
        step: "2",
        title: homeUi.journeyAction,
        text: focusData.subtitle,
        icon: "flash-outline" as const,
      },
      {
        step: "3",
        title: homeUi.journeyVictory,
        text: microVictoryText,
        icon: "ribbon-outline" as const,
      },
    ],
    [
      dynamicHeroData.title,
      focusData.subtitle,
      homeUi.journeyAction,
      homeUi.journeyDirection,
      homeUi.journeyVictory,
      microVictoryText,
    ]
  );

  const areaCards = useMemo(
    () => [
      {
        icon: "fitness-outline" as const,
        label: homeUi.areaHealth,
        score: healthScore,
        route: "/saude" as AppRoute,
      },
      {
        icon: "wallet-outline" as const,
        label: homeUi.areaMoney,
        score: financeScore,
        route: "/dinheiro" as AppRoute,
      },
      {
        icon: "flag-outline" as const,
        label: homeUi.areaGoals,
        score: 100,
        route: "/metas" as AppRoute,
      },
      {
        icon: "game-controller-outline" as const,
        label: homeUi.areaLeisure,
        score: 60,
        route: "/lazer" as AppRoute,
      },
      {
        icon: "briefcase-outline" as const,
        label: homeUi.areaWork,
        score: 100,
        route: "/trabalho" as AppRoute,
      },
      {
        icon: "hourglass-outline" as const,
        label: homeUi.areaTime,
        score: 14,
        route: "/tempo" as AppRoute,
      },
      {
        icon: "school-outline" as const,
        label: homeUi.areaLearning,
        score: 100,
        route: "/aprendizado" as AppRoute,
      },
      {
        icon: "sparkles-outline" as const,
        label: homeUi.areaSpirituality,
        score: 58,
        route: "/espiritualidade" as AppRoute,
      },
    ],
    [
      homeUi.areaGoals,
      homeUi.areaHealth,
      homeUi.areaLearning,
      homeUi.areaLeisure,
      homeUi.areaMoney,
      homeUi.areaSpirituality,
      homeUi.areaTime,
      homeUi.areaWork,
      healthScore,
      financeScore,
    ]
  );

  useEffect(() => {
    const listener = radarAnim.addListener(({ value }) => {
      setAnimatedProgress(value);
    });

    radarAnim.setValue(0);

    Animated.timing(radarAnim, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      radarAnim.removeListener(listener);
    };
  }, [radarAnim, radarData]);

  useEffect(() => {
    pageAnim.setValue(0);

    Animated.timing(pageAnim, {
      toValue: 1,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pageAnim, settings.theme, lifeScoreBase, financeScore]);

  const animatedLifeScore = Math.round(lifeScoreBase * animatedProgress);

  const getSectionAnimatedStyle = (index: number) => {
    const start = index * 0.07;
    const end = Math.min(start + 0.28, 1);

    return {
      opacity: pageAnim.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
      transform: [
        {
          translateY: pageAnim.interpolate({
            inputRange: [start, end],
            outputRange: [18, 0],
            extrapolate: "clamp",
          }),
        },
      ],
    };
  };

  const premiumRadarData = isPremium ? radarData : radarData.slice(0, 3);
  const activeHomeTourStep = homeTourSteps[journeyTourStepIndex];
  const activeHomeTourTarget = activeHomeTourStep
    ? tourTargets[activeHomeTourStep.key]
    : null;
  const syncHomeTourTarget = useCallback(
    (key: HomeTourKey, next: TourTargetRect) => {
      setTourTargets((current) =>
        hasTourRectChanged(current[key], next)
          ? {
              ...current,
              [key]: next,
            }
          : current
      );
    },
    []
  );
  const measureHomeTourSpotlight = useCallback(
    (key: HomeTourKey, target: View | null) => {
      measureTourTarget(target, (next) => {
        syncHomeTourTarget(key, next);
      });
    },
    [syncHomeTourTarget]
  );

  const syncHomeTourOffset = useCallback((key: HomeTourKey, next: number) => {
    homeTourOffsetsRef.current[key] = next;
  }, []);

  const getHomeTourRef = useCallback((key: HomeTourKey) => {
    switch (key) {
      case "hero":
        return heroTourRef.current;
      case "card":
        return cardTourRef.current;
      case "start":
        return startTourRef.current;
      case "plan":
        return planTourRef.current;
      case "areas":
        return areasTourRef.current;
      default:
        return null;
    }
  }, []);

  useEffect(() => {
    if (!showJourneyTour) return;
    if (!activeHomeTourStep) return;

    const targetOffset =
      activeHomeTourStep.key === "start" || activeHomeTourStep.key === "plan"
        ? homeTourOffsetsRef.current.card
        : homeTourOffsetsRef.current[activeHomeTourStep.key];
    const nextScrollY = Math.max(targetOffset - 140, 0);

    scrollRef.current?.scrollTo({
      y: nextScrollY,
      animated: true,
    });

    const targetRef = getHomeTourRef(activeHomeTourStep.key);
    const timeouts = [120, 280, 520].map((delay) =>
      setTimeout(() => {
        measureHomeTourSpotlight(activeHomeTourStep.key, targetRef);
      }, delay)
    );

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [
    activeHomeTourStep,
    getHomeTourRef,
    journeyTourStepIndex,
    measureHomeTourSpotlight,
    showJourneyTour,
  ]);

  const handleStartJourneyTour = useCallback(async () => {
    await startJourneyTour();
    setJourneyTourStepIndex(0);
    setShowJourneyTourInvite(false);
    setShowJourneyTour(true);
  }, []);

  const handleAdvanceJourneyTour = useCallback(async () => {
    const lastStep = journeyTourStepIndex >= homeTourSteps.length - 1;

    if (!lastStep) {
      setJourneyTourStepIndex((current) => current + 1);
      return;
    }

    await completeJourneyTourHome();
    setShowJourneyTour(false);
  }, [homeTourSteps.length, journeyTourStepIndex]);

  const handleSkipJourneyTour = useCallback(async () => {
    await skipJourneyTour();
    setShowJourneyTourInvite(false);
    setShowJourneyTour(false);
  }, []);

  const handleStartAppTour = useCallback(async () => {
    await markAppIntroTourPrompted();
    setShowAppTourPrompt(false);
    router.push("/tour-app");
  }, []);

  const handleSkipAppTour = useCallback(async () => {
    await skipAppIntroTour();
    setShowAppTourPrompt(false);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: homeBackground }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: homeBackground }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenContentBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={getSectionAnimatedStyle(0)}>
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <ScaleButton onPress={() => router.push("/perfil")}>
                <View
                  style={[
                    styles.avatarButton,
                    {
                      shadowColor: homeShadow,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.miniAvatarWrap,
                      {
                        borderColor: avatarBorderColor,
                        backgroundColor: homeBackground,
                      },
                    ]}
                  >
                    {profile?.photoUri ? (
                      <Image
                        source={{ uri: profile.photoUri }}
                        style={styles.miniAvatarImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.miniAvatarFallback,
                          { backgroundColor: avatarBorderColor },
                        ]}
                      >
                        <Text style={styles.miniAvatarText}>{avatarLetter}</Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.miniAvatarBadge,
                      {
                        backgroundColor: homeSurfaceAlt,
                        borderColor: homeBorder,
                      },
                    ]}
                  >
                    <Ionicons name="pencil" size={10} color={colors.textMuted} />
                  </View>
                </View>
              </ScaleButton>

              <View style={styles.headerTextWrap}>
                <Text style={[styles.greetingText, { color: homeAccent }]}>
                  {greeting},
                </Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {displayName}
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {snapshotMessage}
                </Text>
              </View>

              <View style={styles.headerActions}>
                {isPremium ? (
                  <ScaleButton onPress={goToPremium}>
                    <View
                      style={[
                        styles.planPill,
                        {
                          backgroundColor: colors.isDark
                            ? "rgba(255,255,255,0.08)"
                            : colors.successSoft,
                          borderColor: colors.isDark
                            ? "rgba(255,255,255,0.12)"
                            : colors.success,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.planPillText,
                          {
                            color: colors.isDark ? "#F3F4F6" : colors.success,
                          },
                        ]}
                      >
                        {t("common.premium")}
                      </Text>
                    </View>
                  </ScaleButton>
                ) : (
                  <View
                    style={[
                      styles.planPill,
                      {
                        backgroundColor: homeSurfaceAlt,
                        borderColor: homeBorder,
                        opacity: 0.82,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.planPillText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {t("common.free")}
                    </Text>
                  </View>
                )}

                <ScaleButton onPress={() => router.push("/perfil")}>
                  <View
                    style={[
                      styles.profileButton,
                      {
                        backgroundColor: homeSurface,
                        borderColor: homeBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.profileButtonText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {t("home.profile")}
                    </Text>
                  </View>
                </ScaleButton>
              </View>
            </View>
          </View>
        </Animated.View>

        {lifeJourneyPlan && journeyPrimaryMeta ? (
          <Animated.View style={getSectionAnimatedStyle(3)}>
            <View
              ref={cardTourRef}
              collapsable={false}
              style={[
                styles.aiJourneyCard,
                {
                  backgroundColor: homeSurface,
                  borderColor: homeAccentBorder,
                },
              ]}
              onLayout={(event) => {
                syncHomeTourOffset("card", event.nativeEvent.layout.y);
                measureHomeTourSpotlight("card", cardTourRef.current);
              }}
            >
              <View style={styles.aiJourneyHeader}>
                <View style={styles.aiJourneyTitleWrap}>
                  <Text style={[styles.aiJourneyEyebrow, { color: homeAccent }]}>
                    {t("home.ai.eyebrow")}
                  </Text>
                  <Text style={[styles.aiJourneyTitle, { color: colors.text }]}>
                    {aiJourneyCardCopy.title}
                  </Text>
                </View>

                <View
                  style={[
                    styles.aiJourneyIconBadge,
                    {
                      backgroundColor: homeAccentSoft,
                      borderColor: homeAccentBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={journeyPrimaryMeta.icon}
                    size={18}
                    color={homeAccent}
                  />
                </View>
              </View>

              <Text
                style={[styles.aiJourneyText, { color: colors.textSecondary }]}
              >
                {aiJourneyCardCopy.text}
              </Text>

              <View
                style={[
                  styles.aiJourneyGoalPill,
                  {
                    backgroundColor: homeSurfaceAlt,
                    borderColor: homeBorder,
                  },
                ]}
              >
                <Text style={[styles.aiJourneyGoalText, { color: colors.text }]}>
                  {lifeJourneyPlan.weeklyGoal}
                </Text>
              </View>

              <View style={styles.aiJourneySteps}>
                {lifeJourneyPlan.firstSteps.map((step, index) => (
                  <View key={`${step}-${index}`} style={styles.aiJourneyStepRow}>
                    <View
                      style={[
                        styles.aiJourneyStepDot,
                        { backgroundColor: homeAccent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.aiJourneyStepText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.aiJourneyActionRow}>
                <View style={styles.aiJourneyButtonsRow}>
                  <Pressable
                    ref={startTourRef}
                    collapsable={false}
                    onLayout={(event) => {
                      syncHomeTourOffset("start", event.nativeEvent.layout.y);
                      measureHomeTourSpotlight("start", startTourRef.current);
                    }}
                    onPress={() => router.push(lifeJourneyPlan.recommendedRoute)}
                    style={styles.aiJourneyPrimaryWrap}
                  >
                    <View
                      style={[
                        styles.aiJourneyPrimaryButton,
                        {
                          backgroundColor: colors.accentButtonBackground,
                          borderColor: colors.accentButtonBorder,
                        },
                        colors.isWhiteAccentButton && styles.whiteAccentButton,
                      ]}
                    >
                      <Text
                        style={[
                          styles.aiJourneyPrimaryButtonText,
                          { color: primaryButtonTextColor },
                        ]}
                      >
                        {t("home.ai.startNow")}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    ref={planTourRef}
                    collapsable={false}
                    onLayout={(event) => {
                      syncHomeTourOffset("plan", event.nativeEvent.layout.y);
                      measureHomeTourSpotlight("plan", planTourRef.current);
                    }}
                    onPress={() => router.push("/plano-ia")}
                    style={styles.aiJourneySecondaryButtonWrap}
                  >
                    <View
                      style={[
                        styles.aiJourneySecondaryButton,
                        {
                          backgroundColor: homeSurfaceAlt,
                          borderColor: homeBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.aiJourneySecondaryButtonText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("home.ai.viewPlan")}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {journeySecondaryMeta ? (
                  <View
                    style={[
                      styles.aiJourneySecondaryPill,
                      {
                        backgroundColor: homeSurfaceAlt,
                        borderColor: homeBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.aiJourneySecondaryText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {t("home.ai.nextFront", {
                        value: journeySecondaryMeta.label,
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View style={getSectionAnimatedStyle(3.5)}>
          <View
            ref={heroTourRef}
            collapsable={false}
            style={[
              styles.heroCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeAccentBorder,
                shadowColor: homeShadow,
              },
            ]}
            onLayout={(event) => {
              syncHomeTourOffset("hero", event.nativeEvent.layout.y);
              measureHomeTourSpotlight("hero", heroTourRef.current);
            }}
          >
            <View
              style={[
                styles.heroGlowOrb,
                {
                  backgroundColor: homeHeroGlowPrimary,
                },
              ]}
            />
            <View
              style={[
                styles.heroGlowOrbSecondary,
                {
                  backgroundColor: homeHeroGlowSecondary,
                },
              ]}
            />

            <View style={styles.heroTopRow}>
              <Text style={[styles.heroEyebrow, { color: homeAccent }]}>
                {dynamicHeroData.eyebrow}
              </Text>
              <View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor: homeAccentSoft,
                    borderColor: homeAccentBorder,
                  },
                ]}
              >
                <Text style={[styles.heroBadgeText, { color: homeAccent }]}>
                  {dynamicHeroData.badge}
                </Text>
              </View>
            </View>

            <View style={styles.heroTitleRow}>
              <Ionicons
                name={dynamicHeroData.icon}
                size={26}
                color={homeAccent}
                style={styles.heroLeadingIcon}
              />
              <Text style={[styles.heroMainTitle, { color: colors.text }]}>
                {dynamicHeroData.title}
              </Text>
            </View>

            <Text
              style={[styles.heroMainSubtitle, { color: colors.textSecondary }]}
            >
              {dynamicHeroData.subtitle}
            </Text>

            <View style={styles.heroSupportRow}>
              {heroSupportPills.map((pill, index) => (
                <View
                  key={`${pill.text}-${index}`}
                  style={[
                    styles.heroSupportPill,
                    {
                      backgroundColor: homeSurfaceAlt,
                      borderColor: homeBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={pill.icon}
                    size={13}
                    color={colors.textSecondary}
                    style={styles.inlineIcon}
                  />
                  <Text
                    style={[
                      styles.heroSupportPillText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {pill.text}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.heroProgressTrack,
                { backgroundColor: surfaceMuted },
              ]}
            >
              <View
                style={[
                  styles.heroProgressFill,
                  {
                    width: `${Math.max(dynamicHeroData.progress, 5)}%`,
                    backgroundColor: homeAccent,
                  },
                ]}
              />
            </View>

            <ScaleButton onPress={() => router.push(dynamicHeroData.route)}>
              <View
                style={[
                  styles.heroCTAButton,
                  {
                    backgroundColor: colors.accentButtonBackground,
                    borderColor: colors.accentButtonBorder,
                  },
                  colors.isWhiteAccentButton && styles.whiteAccentButton,
                ]}
              >
                <Text style={[styles.heroCTAButtonText, { color: primaryButtonTextColor }]}>
                  {dynamicHeroData.cta}
                </Text>
              </View>
            </ScaleButton>
          </View>
        </Animated.View>

        <Animated.View style={getSectionAnimatedStyle(4)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("home.priorities")}
          </Text>

          <View style={styles.priorityGrid}>
            {prioritiesRail.map((item) => (
              <ScaleButton
                key={item.title}
                onPress={() => router.push(item.route)}
                style={styles.priorityButtonWrap}
              >
                <View
                  style={[
                    styles.priorityCard,
                    {
                      backgroundColor: homeSurface,
                      borderColor: homeBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={homeAccent}
                    style={styles.priorityIcon}
                  />
                  <Text style={[styles.priorityTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.prioritySubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.subtitle}
                  </Text>

                  <View
                    style={[
                      styles.priorityStatusPill,
                      {
                        backgroundColor: homeSurfaceAlt,
                        borderColor: homeBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityStatusPillText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>

                  <Text
                    style={[styles.priorityValue, { color: colors.text }]}
                  >
                    {item.value}
                  </Text>

                  <View
                    style={[
                      styles.priorityTrack,
                      { backgroundColor: surfaceMuted },
                    ]}
                  >
                    <View
                      style={[
                        styles.priorityFill,
                        {
                          width: `${Math.max(item.progress, 5)}%`,
                          backgroundColor: homeAccent,
                        },
                      ]}
                    />
                  </View>
                </View>
              </ScaleButton>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={getSectionAnimatedStyle(5)}>
          <View
            style={[
              styles.microVictoryCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeBorder,
              },
            ]}
          >
            <Text style={[styles.microVictoryLabel, { color: homeSuccess }]}>
              {homeUi.microVictoryLabel}
            </Text>
            <View style={styles.microVictoryRow}>
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={homeSuccess}
                style={styles.inlineIcon}
              />
              <Text style={[styles.microVictoryText, { color: colors.text }]}>
                {microVictoryText}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={getSectionAnimatedStyle(5.5)}>
          <View
            style={[
              styles.detailToggleCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeBorder,
              },
            ]}
          >
            <Text style={[styles.detailToggleTitle, { color: colors.text }]}>
              {showDetailedHome
                ? homeUi.detailTitleExpanded
                : homeUi.detailTitleCollapsed}
            </Text>
            <Text
              style={[
                styles.detailToggleText,
                { color: colors.textSecondary },
              ]}
            >
              {showDetailedHome
                ? homeUi.detailTextExpanded
                : homeUi.detailTextCollapsed}
            </Text>

            <ScaleButton onPress={() => setShowDetailedHome((current) => !current)}>
              <View
                style={[
                  styles.detailToggleButton,
                  {
                    backgroundColor: colors.accentButtonBackground,
                    borderColor: colors.accentButtonBorder,
                  },
                  colors.isWhiteAccentButton && styles.whiteAccentButton,
                ]}
              >
                <Text
                  style={[
                    styles.detailToggleButtonText,
                    { color: primaryButtonTextColor },
                  ]}
                >
                  {showDetailedHome
                    ? homeUi.detailHide
                    : homeUi.detailOpen}
                </Text>
              </View>
            </ScaleButton>
          </View>
        </Animated.View>

        {!isPremium ? (
          <Animated.View style={getSectionAnimatedStyle(5.7)}>
            <SubtlePremiumHint
              title={homeUi.subtlePremiumTitle}
              text={homeUi.subtlePremiumText}
              ctaLabel={homeUi.subtlePremiumCta}
              onPress={goToPremium}
            />
          </Animated.View>
        ) : null}

        {showDetailedHome ? (
          <>
        <Animated.View style={getSectionAnimatedStyle(6)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {homeUi.dayTrailTitle}
          </Text>

          <View
            style={[
              styles.journeyCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeBorder,
              },
            ]}
          >
            {journeySteps.map((item, index) => (
              <View
                key={item.step}
                style={[
                  styles.journeyRow,
                  index < journeySteps.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.journeyStepCircle,
                    {
                      backgroundColor: homeAccentSoft,
                      borderColor: homeAccentBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.journeyStepCircleText,
                      { color: homeAccent },
                    ]}
                  >
                    {item.step}
                  </Text>
                </View>

                <View style={styles.journeyContent}>
                  <View style={styles.journeyTitleRow}>
                    <Ionicons
                      name={item.icon}
                      size={15}
                      color={homeAccent}
                      style={styles.inlineIcon}
                    />
                    <Text style={[styles.journeyTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.journeyText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={getSectionAnimatedStyle(7)}>
          <View
            style={[
              styles.snapshotCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeBorder,
              },
            ]}
          >
            <View style={styles.snapshotHeader}>
              <View>
                <Text style={[styles.snapshotTitle, { color: colors.text }]}>
                  {homeUi.snapshotTitle}
                </Text>
                <Text
                  style={[
                    styles.snapshotSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {homeUi.snapshotSubtitle}
                </Text>
              </View>

              <View
                style={[
                  styles.snapshotScoreBadge,
                  {
                    backgroundColor: homeAccentSoft,
                    borderColor: homeAccentBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.snapshotScoreText, { color: homeAccent }]}
                >
                  {animatedLifeScore}/100
                </Text>
              </View>
            </View>

            <View style={styles.snapshotGrid}>
              {[
                {
                  value: feitosHoje,
                  label: homeUi.snapshotDone,
                  icon: "checkmark-done-outline" as const,
                },
                {
                  value: pendentesHoje,
                  label: homeUi.snapshotPending,
                  icon: "time-outline" as const,
                },
                {
                  value: sequenciaAtual,
                  label:
                    sequenciaAtual === 1
                      ? homeUi.snapshotStreakOne
                      : homeUi.snapshotStreakMany,
                  icon: "flame-outline" as const,
                },
                {
                  value: levelData.level,
                  label: homeUi.snapshotLevel,
                  icon: "stats-chart-outline" as const,
                },
              ].map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.snapshotItem,
                    {
                      backgroundColor: homeSurfaceAlt,
                      borderColor: homeBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={homeAccent}
                    style={styles.snapshotItemIcon}
                  />
                  <Text style={[styles.snapshotValue, { color: colors.text }]}>
                    {item.value}
                  </Text>
                  <Text
                    style={[
                      styles.snapshotLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.snapshotLevelTrack,
                { backgroundColor: surfaceMuted },
              ]}
            >
              <View
                style={[
                  styles.snapshotLevelFill,
                  {
                    width: `${Math.max(levelData.percent, 5)}%`,
                    backgroundColor: homeWarning,
                  },
                ]}
              />
            </View>

            <Text
              style={[styles.snapshotLevelText, { color: homeWarning }]}
            >
              {homeUi.snapshotProgress(levelData.percent)}
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={getSectionAnimatedStyle(8)}>
          <View
            style={[
              styles.focusCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeBorder,
              },
            ]}
          >
            <View style={styles.focusHeader}>
              <Ionicons
                name={focusData.icon}
                size={28}
                color={homeAccent}
              />
              <View style={styles.focusTextWrap}>
                <Text style={[styles.focusTitle, { color: colors.text }]}>
                  {focusData.title}
                </Text>
                <Text
                  style={[styles.focusSubtitle, { color: colors.textMuted }]}
                >
                  {focusData.subtitle}
                </Text>
              </View>
            </View>

            <ScaleButton onPress={() => router.push(focusData.route)}>
              <View
                style={[
                  styles.focusButton,
                  {
                    backgroundColor: colors.accentButtonBackground,
                    borderColor: colors.accentButtonBorder,
                  },
                  colors.isWhiteAccentButton && styles.whiteAccentButton,
                ]}
              >
                <Text style={[styles.focusButtonText, { color: primaryButtonTextColor }]}>{focusData.cta}</Text>
              </View>
            </ScaleButton>
          </View>
        </Animated.View>

        <Animated.View style={getSectionAnimatedStyle(9)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {homeUi.radarSectionTitle}
          </Text>

          <View
            style={[
              styles.radarCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeBorder,
              },
            ]}
          >
            <View style={styles.radarHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.radarTitle, { color: colors.text }]}>
                  {homeUi.radarTitle}
                </Text>
                <Text
                  style={[styles.radarSubtitle, { color: colors.textSecondary }]}
                >
                  {isPremium
                    ? homeUi.radarSubtitlePremium
                    : homeUi.radarSubtitleFree}
                </Text>
              </View>

              {!isPremium ? (
                <ScaleButton onPress={goToPremium}>
                  <View
                    style={[
                      styles.radarPremiumBadge,
                      {
                        backgroundColor: homeAccentSoft,
                        borderColor: homeAccentBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.radarPremiumBadgeText,
                        { color: homeAccent },
                      ]}
                    >
                      {t("common.premium")}
                    </Text>
                  </View>
                </ScaleButton>
              ) : null}
            </View>

            <View style={styles.radarSvgWrap}>
              <Svg width={radarSize} height={radarSize}>
                {radarLevels.map((level) => (
                  <Polygon
                    key={level}
                    points={buildPolygonPoints(
                      premiumRadarData.map(() => level),
                      125,
                      125,
                      radarRadius,
                      100
                    )}
                    fill="none"
                    stroke={colors.isDark ? "rgba(255,255,255,0.10)" : colors.border}
                    strokeWidth={1}
                  />
                ))}

                {premiumRadarData.map((item, index) => {
                  const angle = (360 / premiumRadarData.length) * index;
                  const outer = polarToCartesian(
                    125,
                    125,
                    radarRadius + 20,
                    angle
                  );
                  const axisEnd = polarToCartesian(
                    125,
                    125,
                    radarRadius,
                    angle
                  );
                  const touchPoint = polarToCartesian(
                    125,
                    125,
                    radarRadius + 28,
                    angle
                  );
                  const route = item.route;
                  return (
                    <React.Fragment key={item.label}>
                      <Line
                        x1={125}
                        y1={125}
                        x2={axisEnd.x}
                        y2={axisEnd.y}
                        stroke={colors.isDark ? "rgba(255,255,255,0.10)" : colors.border}
                        strokeWidth={1}
                      />
                      <Circle
                        cx={axisEnd.x}
                        cy={axisEnd.y}
                        r={3.5}
                        fill={getRadarStatusColor(item.value, homeAccent, colors.isDark)}
                      />
                      <Circle
                        cx={touchPoint.x}
                        cy={touchPoint.y}
                        r={18}
                        fill="transparent"
                        onPress={() => {
                          if (!isPremium && index > 1) {
                            showPremiumAlert(t("home.feature.fullRadar"));
                            return;
                          }
                          router.push(route);
                        }}
                      />
                      <SvgText
                        x={outer.x}
                        y={outer.y}
                        fontSize="11"
                        fontWeight="700"
                        fill={colors.textMuted}
                        textAnchor="middle"
                        onPress={() => {
                          if (!isPremium && index > 1) {
                            showPremiumAlert(t("home.feature.fullRadar"));
                            return;
                          }
                          router.push(route);
                        }}
                      >
                        {item.label}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                <Circle cx={125} cy={125} r={3} fill={radarAccent} />

                <Polygon
                  points={buildPolygonPoints(
                    premiumRadarData.map((item) => item.value * animatedProgress),
                    125,
                    125,
                    radarRadius,
                    100
                  )}
                  fill={withAlpha(radarAccent, colors.isDark ? 0.22 : 0.18)}
                  stroke={radarAccent}
                  strokeWidth={2}
                />
              </Svg>
            </View>

            <View style={styles.radarLegendGrid}>
              {premiumRadarData.map((item, index) => {
                const route = item.route;
                const radarStatusColor = getRadarStatusColor(
                  Math.round(item.value * animatedProgress),
                  homeAccent,
                  colors.isDark
                );

                return (
                  <ScaleButton
                    key={item.label}
                    onPress={() => {
                      if (!isPremium && index > 1) {
                        showPremiumAlert(t("home.feature.fullRadar"));
                        return;
                      }
                      router.push(route);
                    }}
                  >
                    <View
                      style={[
                        styles.radarLegendItem,
                        {
                          backgroundColor: homeSurfaceAlt,
                          borderColor: homeBorder,
                        },
                      ]}
                    >
                      <View style={styles.radarLegendLabelRow}>
                        <View
                          style={[
                            styles.radarLegendDot,
                            { backgroundColor: radarStatusColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.radarLegendLabel,
                            { color: colors.textMuted },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.radarLegendValue,
                          { color: radarAccent },
                        ]}
                      >
                        {Math.round(item.value * animatedProgress)}%
                      </Text>
                      <Text
                        style={[
                          styles.radarLegendHint,
                          { color: colors.textSecondary },
                        ]}
                        >
                        {homeUi.radarTapToOpen}
                      </Text>
                    </View>
                  </ScaleButton>
                );
              })}
            </View>

            {!isPremium ? (
              <View
                style={[
                  styles.lockedMiniCard,
                  {
                    backgroundColor: homeSurfaceAlt,
                    borderColor: homeBorder,
                  },
                ]}
              >
                <Text style={[styles.lockedMiniTitle, { color: colors.text }]}>
                  {homeUi.radarExpandedTitle}
                </Text>
                <Text
                  style={[
                    styles.lockedMiniText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {homeUi.radarExpandedText}
                </Text>
                <ScaleButton onPress={goToPremium}>
                  <View
                    style={[
                      styles.lockedMiniButton,
                      {
                        backgroundColor: colors.accentButtonBackground,
                        borderColor: colors.accentButtonBorder,
                      },
                      colors.isWhiteAccentButton && styles.whiteAccentButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.lockedMiniButtonText,
                        { color: primaryButtonTextColor },
                      ]}
                      >
                      {homeUi.radarExpandedCta}
                    </Text>
                  </View>
                </ScaleButton>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View style={getSectionAnimatedStyle(10)}>
          <View
            ref={areasTourRef}
            collapsable={false}
            onLayout={(event) => {
              syncHomeTourOffset("areas", event.nativeEvent.layout.y);
              measureHomeTourSpotlight("areas", areasTourRef.current);
            }}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {homeUi.areasTitle}
            </Text>

            <View style={styles.areasGrid}>
              {areaCards.map((item) => (
                <ScaleButton
                  key={item.label}
                  onPress={() => router.push(item.route)}
                  style={styles.areaButtonWrap}
                >
                  <View
                    style={[
                      styles.areaCard,
                      {
                        backgroundColor: homeSurface,
                        borderColor: homeBorder,
                      },
                    ]}
                  >
                    <View style={styles.areaCardTop}>
                      <Ionicons
                        name={item.icon}
                        size={26}
                        color={homeAccent}
                      />
                      <View
                        style={[
                          styles.areaScoreBadge,
                          {
                            backgroundColor: homeSurfaceAlt,
                            borderColor: homeBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.areaScoreBadgeText,
                            { color: homeAccent },
                          ]}
                        >
                          {item.score}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.areaText, { color: colors.text }]}>
                      {item.label}
                    </Text>

                    <Text
                      style={[styles.areaHint, { color: colors.textSecondary }]}
                    >
                      {getAreaHint(item.score, language)}
                    </Text>

                    <View
                      style={[
                        styles.areaMiniTrack,
                        { backgroundColor: surfaceMuted },
                      ]}
                    >
                      <View
                        style={[
                          styles.areaMiniFill,
                          {
                            width: `${Math.max(item.score, 5)}%`,
                            backgroundColor: homeAccent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </ScaleButton>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View style={getSectionAnimatedStyle(11)}>
          <View
            style={[
              styles.quoteMomentCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeBorder,
              },
            ]}
          >
            <Text style={[styles.quoteMomentLabel, { color: homeSuccess }]}>
              {momentLabel}
            </Text>
            <Text style={[styles.quoteMomentText, { color: colors.text }]}>
              {quoteText}
            </Text>
          </View>
        </Animated.View>

        {financialInsights.length > 0 && (
          <Animated.View style={getSectionAnimatedStyle(12)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {homeUi.smartInsightsTitle}
            </Text>
            <View
              style={[
                styles.insightsCard,
                {
                  backgroundColor: homeSurface,
                  borderColor: homeBorder,
                },
              ]}
            >
              {(isPremium ? financialInsights : financialInsights.slice(0, 1)).map(
                (insight, index) => (
                  <View key={`${insight}-${index}`} style={styles.insightRow}>
                    <View
                      style={[
                        styles.insightDot,
                        { backgroundColor: homeAccent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.insightText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {insight}
                    </Text>
                  </View>
                )
              )}

              {!isPremium && financialInsights.length > 1 ? (
                <ScaleButton onPress={() => showPremiumAlert(t("home.feature.fullInsights"))}>
                  <View
                    style={[
                      styles.lockedInsightButton,
                      {
                        backgroundColor: homeSurfaceAlt,
                        borderColor: homeBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lockedInsightButtonText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {homeUi.smartInsightsCta}
                    </Text>
                  </View>
                </ScaleButton>
              ) : null}
            </View>
          </Animated.View>
        )}
          </>
        ) : null}
      </ScrollView>

      {showAppTourPrompt ? (
        <View style={styles.introPromptBackdrop}>
          <View
            style={[
              styles.introPromptCard,
              {
                backgroundColor: homeSurface,
                borderColor: homeBorder,
              },
            ]}
          >
            <View
              style={[
                styles.introPromptIconWrap,
                {
                  backgroundColor: `${homeAccent}16`,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Ionicons name="sparkles-outline" size={24} color={homeAccent} />
            </View>

            <Text style={[styles.introPromptEyebrow, { color: homeAccent }]}>
              {t("home.introTourEyebrow")}
            </Text>
            <Text style={[styles.introPromptTitle, { color: colors.text }]}>
              {t("home.introTourTitle")}
            </Text>
            <Text
              style={[
                styles.introPromptText,
              { color: colors.textSecondary },
            ]}
          >
              {t("home.introTourDescription")}
            </Text>

            <View style={styles.introPromptActions}>
              <ScaleButton onPress={handleStartAppTour}>
                <View
                  style={[
                    styles.introPromptPrimaryButton,
                    {
                      backgroundColor: homeAccent,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.introPromptPrimaryButtonText,
                      { color: colors.accentContrast },
                    ]}
                  >
                    {t("home.introTourPrimary")}
                  </Text>
                </View>
              </ScaleButton>

              <ScaleButton onPress={handleSkipAppTour}>
                <View
                  style={[
                    styles.introPromptSecondaryButton,
                    {
                      backgroundColor: homeSurfaceAlt,
                      borderColor: homeBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.introPromptSecondaryButtonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("common.nowNot")}
                  </Text>
                </View>
              </ScaleButton>
            </View>
          </View>
        </View>
      ) : null}

      {showJourneyTourInvite ? (
        <GuidedTourOverlay
          visible={showJourneyTourInvite}
          mode="intro"
          icon="sparkles-outline"
          title={t("home.tour.inviteTitle")}
          description={t("home.tour.inviteDescription")}
          stepLabel={t("home.tour.label")}
          accentColor={homeAccent}
          surfaceColor={homeSurface}
          borderColor={homeBorder}
          textColor={colors.text}
          textSecondaryColor={colors.textSecondary}
          primaryLabel={t("common.startTour")}
          onPrimary={() => {
            void handleStartJourneyTour();
          }}
          secondaryLabel={t("common.nowNot")}
          onSecondary={() => {
            void handleSkipJourneyTour();
          }}
        />
      ) : null}

      {showJourneyTour && activeHomeTourStep ? (
        <GuidedTourOverlay
          visible={showJourneyTour}
          icon={activeHomeTourStep.icon}
          title={activeHomeTourStep.title}
          description={activeHomeTourStep.description}
          stepLabel={`${t("home.tour.guidedLabel")} • ${journeyTourStepIndex + 1}/${homeTourSteps.length}`}
          accentColor={homeAccent}
          surfaceColor={homeSurface}
          borderColor={homeBorder}
          textColor={colors.text}
          textSecondaryColor={colors.textSecondary}
          targetRect={activeHomeTourTarget}
          primaryLabel={activeHomeTourStep.primaryLabel}
          onPrimary={() => {
            void handleAdvanceJourneyTour();
          }}
          secondaryLabel={t("home.tour.skip")}
          onSecondary={() => {
            void handleSkipJourneyTour();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  introPromptBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 7, 18, 0.76)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  introPromptCard: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
  },
  introPromptIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  introPromptEyebrow: {
    fontSize: 12,
    fontWeight: "900",
  },
  introPromptTitle: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
    marginTop: 12,
  },
  introPromptText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  introPromptActions: {
    gap: 12,
    marginTop: 22,
  },
  introPromptPrimaryButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  introPromptPrimaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },
  introPromptSecondaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  introPromptSecondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },

  inlineIcon: {
    marginRight: 6,
  },

  header: {
    marginBottom: 18,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarButton: {
    position: "relative",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 7,
  },
  miniAvatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarImage: {
    width: "100%",
    height: "100%",
  },
  miniAvatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
  },
  miniAvatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTextWrap: {
    flex: 1,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "900",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 18,
  },
  headerActions: {
    gap: 8,
    alignItems: "flex-end",
  },
  planPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  planPillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  profileButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  profileButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },

  upgradeCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  upgradeText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  upgradeButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
  },
  upgradeButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },

  momentStrip: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  momentChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  momentChipText: {
    fontSize: 11,
    fontWeight: "900",
  },
  momentStripText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },

  heroCard: {
    overflow: "hidden",
    position: "relative",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  heroGlowOrb: {
    position: "absolute",
    top: -30,
    right: -18,
    width: 130,
    height: 130,
    borderRadius: 999,
  },
  heroGlowOrbSecondary: {
    position: "absolute",
    bottom: -34,
    left: -22,
    width: 120,
    height: 120,
    borderRadius: 999,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
  },
  heroBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  heroLeadingIcon: {
    marginRight: 8,
  },
  heroMainTitle: {
    flex: 1,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  heroMainSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  heroSupportRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  heroSupportPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroSupportPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  heroProgressTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 16,
  },
  heroProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  heroCTAButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
  },
  heroCTAButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },

  aiJourneyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  aiJourneyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  aiJourneyTitleWrap: {
    flex: 1,
  },
  aiJourneyEyebrow: {
    fontSize: 12,
    fontWeight: "800",
  },
  aiJourneyTitle: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 8,
    lineHeight: 24,
  },
  aiJourneyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  aiJourneyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  aiJourneyGoalPill: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 14,
  },
  aiJourneyGoalText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  aiJourneySteps: {
    gap: 10,
    marginTop: 14,
  },
  aiJourneyStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  aiJourneyStepDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    marginTop: 5,
  },
  aiJourneyStepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  aiJourneyActionRow: {
    marginTop: 16,
    gap: 10,
  },
  aiJourneyButtonsRow: {
    gap: 10,
  },
  aiJourneyPrimaryWrap: {
    width: "100%",
  },
  aiJourneyPrimaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  aiJourneyPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  aiJourneySecondaryButtonWrap: {
    width: "100%",
  },
  aiJourneySecondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  aiJourneySecondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  aiJourneySecondaryPill: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignSelf: "flex-start",
  },
  aiJourneySecondaryText: {
    fontSize: 12,
    fontWeight: "800",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },

  priorityGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  priorityButtonWrap: {
    flex: 1,
  },
  priorityCard: {
    minHeight: 220,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  priorityIcon: {
    marginBottom: 10,
  },
  priorityTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  prioritySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    minHeight: 40,
  },
  priorityStatusPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
  },
  priorityStatusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  priorityValue: {
    fontSize: 20,
    fontWeight: "900",
    marginTop: 16,
  },
  priorityTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 10,
  },
  priorityFill: {
    height: "100%",
    borderRadius: 999,
  },

  microVictoryCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  microVictoryLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  microVictoryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  microVictoryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },

  detailToggleCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  detailToggleTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  detailToggleText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  detailToggleButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
  },
  detailToggleButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  journeyCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 18,
    overflow: "hidden",
  },
  journeyRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  journeyStepCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  journeyStepCircleText: {
    fontSize: 13,
    fontWeight: "900",
  },
  journeyContent: {
    flex: 1,
  },
  journeyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  journeyTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  journeyText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  snapshotCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  snapshotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  snapshotTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  snapshotSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 230,
  },
  snapshotScoreBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  snapshotScoreText: {
    fontSize: 12,
    fontWeight: "900",
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 16,
  },
  snapshotItem: {
    width: "48.5%",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  snapshotItemIcon: {
    marginBottom: 8,
  },
  snapshotValue: {
    fontSize: 28,
    fontWeight: "900",
  },
  snapshotLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  snapshotLevelTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 16,
  },
  snapshotLevelFill: {
    height: "100%",
    borderRadius: 999,
  },
  snapshotLevelText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
  },

  focusCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  focusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  focusTextWrap: {
    flex: 1,
  },
  focusTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  focusSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  focusButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
  },
  focusButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },

  radarCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  radarHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  radarTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  radarSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  radarPremiumBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  radarPremiumBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  radarSvgWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 16,
  },
  radarLegendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  radarLegendItem: {
    width: 160,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  radarLegendLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radarLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  radarLegendLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  radarLegendValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  radarLegendHint: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },

  lockedMiniCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  lockedMiniTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  lockedMiniText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  lockedMiniButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },
  lockedMiniButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },

  areasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  areaButtonWrap: {
    width: "48%",
  },
  areaCard: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  areaCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  areaScoreBadge: {
    minWidth: 42,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  areaScoreBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  areaText: {
    fontWeight: "900",
    fontSize: 15,
    marginTop: 14,
  },
  areaHint: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  areaMiniTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },
  areaMiniFill: {
    height: "100%",
    borderRadius: 999,
  },

  quoteMomentCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
  },
  quoteMomentLabel: {
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 8,
  },
  quoteMomentText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "800",
  },

  insightsCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  insightDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 5,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  lockedInsightButton: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  lockedInsightButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
