import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Ionicons } from "@expo/vector-icons";
import type { AppLanguage } from "./i18n";
import {
  AI_JOURNEY_PROGRESS_KEY,
  AIJourneyProgress,
  AI_PLAN_KEY,
  evaluateJourney,
  getLifeAreaLabel,
  LifeArea,
  LifeJourneyPlan,
  normalizeJourneyProgress,
  normalizeLifeJourneyPlan,
  type JourneyTaskValidationType,
} from "./lifeJourney";

type JourneyModuleKey = LifeArea | "metas" | "checkin";

type JourneyCardCopy = {
  eyebrow: string;
  title: string;
  text: string;
  actionLabel?: string;
  actionRoute?: string;
  timerLabel?: string;
  timerValue?: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  tone?: "accent" | "warning" | "success";
};

const JOURNEY_MODULE_META: Record<
  JourneyModuleKey,
  {
    route:
      | "/dinheiro"
      | "/saude"
      | "/tempo"
      | "/trabalho"
      | "/aprendizado"
      | "/habitos"
      | "/lazer"
      | "/espiritualidade"
      | "/metas"
      | "/checkin";
    iconName: React.ComponentProps<typeof Ionicons>["name"];
  }
> = {
  financeiro: { route: "/dinheiro", iconName: "wallet-outline" },
  saude: { route: "/saude", iconName: "medical-outline" },
  tempo: { route: "/tempo", iconName: "time-outline" },
  trabalho: { route: "/trabalho", iconName: "briefcase-outline" },
  aprendizado: { route: "/aprendizado", iconName: "school-outline" },
  habitos: { route: "/habitos", iconName: "leaf-outline" },
  lazer: { route: "/lazer", iconName: "game-controller-outline" },
  espiritualidade: {
    route: "/espiritualidade",
    iconName: "sparkles-outline",
  },
  metas: { route: "/metas", iconName: "flag-outline" },
  checkin: { route: "/checkin", iconName: "pulse-outline" },
};

const STATIC_LABELS: Record<
  AppLanguage,
  { goals: string; checkin: string; status: string; nextDay: string }
> = {
  pt: {
    goals: "Metas",
    checkin: "Check-in",
    status: "Status da jornada",
    nextDay: "Próximo dia",
  },
  en: {
    goals: "Goals",
    checkin: "Check-in",
    status: "Journey status",
    nextDay: "Next day",
  },
  es: {
    goals: "Metas",
    checkin: "Check-in",
    status: "Estado de la jornada",
    nextDay: "Próximo día",
  },
  fr: {
    goals: "Objectifs",
    checkin: "Check-in",
    status: "Statut du parcours",
    nextDay: "Jour suivant",
  },
  it: {
    goals: "Obiettivi",
    checkin: "Check-in",
    status: "Stato del percorso",
    nextDay: "Giorno successivo",
  },
};

const HOME_COPY: Record<
  AppLanguage,
  {
    analyzingTitle: string;
    analyzingText: string;
    waitingTitle: string;
    waitingButton: string;
    activeTitle: (day: number) => string;
    activeText: (module: string, task: string) => string;
    activeButton: (module: string) => string;
    completedTitle: string;
    completedText: string;
    completedButton: string;
  }
> = {
  pt: {
    analyzingTitle: "A IA está analisando o seu dia",
    analyzingText:
      "Ela está lendo o que você concluiu para entregar um feedback coerente e preparar a próxima fase da jornada.",
    waitingTitle: "O próximo dia já está programado",
    waitingButton: "Abrir evolução",
    activeTitle: (day) => `Dia ${day} disponível agora`,
    activeText: (module, task) =>
      `A próxima ação da sua jornada está em ${module}: ${task}. Quando isso for concluído, a IA recalcula o restante do dia.`,
    activeButton: (module) => `Ir para ${module}`,
    completedTitle: "Sua primeira jornada está concluída",
    completedText:
      "A IA já fechou esta fase. Agora você pode revisar sua evolução e decidir a próxima frente da sua vida.",
    completedButton: "Ver evolução",
  },
  en: {
    analyzingTitle: "The AI is analyzing your day",
    analyzingText:
      "It is reading what you completed to deliver a coherent summary and prepare the next phase of the journey.",
    waitingTitle: "The next day is already scheduled",
    waitingButton: "Open evolution",
    activeTitle: (day) => `Day ${day} is available now`,
    activeText: (module, task) =>
      `The next action in your journey is in ${module}: ${task}. Once that is done, the AI recalculates the rest of the day.`,
    activeButton: (module) => `Go to ${module}`,
    completedTitle: "Your first journey is complete",
    completedText:
      "The AI has finished this phase. Now you can review your evolution and choose the next front of your life.",
    completedButton: "See evolution",
  },
  es: {
    analyzingTitle: "La IA está analizando tu día",
    analyzingText:
      "Está leyendo lo que completaste para entregar un resumen coherente y preparar la siguiente fase de la jornada.",
    waitingTitle: "El próximo día ya está programado",
    waitingButton: "Abrir evolución",
    activeTitle: (day) => `Día ${day} disponible ahora`,
    activeText: (module, task) =>
      `La próxima acción de tu jornada está en ${module}: ${task}. Cuando eso termine, la IA recalcula el resto del día.`,
    activeButton: (module) => `Ir a ${module}`,
    completedTitle: "Tu primera jornada está completa",
    completedText:
      "La IA ya cerró esta fase. Ahora puedes revisar tu evolución y decidir el siguiente frente de tu vida.",
    completedButton: "Ver evolución",
  },
  fr: {
    analyzingTitle: "L'IA analyse votre journée",
    analyzingText:
      "Elle lit ce que vous avez terminé pour livrer un résumé cohérent et préparer la phase suivante du parcours.",
    waitingTitle: "Le jour suivant est déjà programmé",
    waitingButton: "Ouvrir l'évolution",
    activeTitle: (day) => `Jour ${day} disponible maintenant`,
    activeText: (module, task) =>
      `La prochaine action de votre parcours se trouve dans ${module} : ${task}. Une fois cela terminé, l'IA recalcule le reste de la journée.`,
    activeButton: (module) => `Aller vers ${module}`,
    completedTitle: "Votre premier parcours est terminé",
    completedText:
      "L'IA a clôturé cette phase. Vous pouvez maintenant revoir votre évolution et choisir la prochaine priorité de votre vie.",
    completedButton: "Voir l'évolution",
  },
  it: {
    analyzingTitle: "L'IA sta analizzando la tua giornata",
    analyzingText:
      "Sta leggendo ciò che hai completato per offrire un riepilogo coerente e preparare la fase successiva del percorso.",
    waitingTitle: "Il giorno successivo è già programmato",
    waitingButton: "Apri evoluzione",
    activeTitle: (day) => `Giorno ${day} disponibile ora`,
    activeText: (module, task) =>
      `La prossima azione del tuo percorso è in ${module}: ${task}. Quando sarà conclusa, l'IA ricalcolerà il resto della giornata.`,
    activeButton: (module) => `Vai a ${module}`,
    completedTitle: "Il tuo primo percorso è completo",
    completedText:
      "L'IA ha chiuso questa fase. Ora puoi rivedere la tua evoluzione e scegliere il prossimo fronte della tua vita.",
    completedButton: "Vedi evoluzione",
  },
};

const MODULE_COPY: Record<
  AppLanguage,
  {
    analyzingTitle: string;
    analyzingText: string;
    waitingTitle: string;
    waitingText: string;
    waitingButton: string;
    activeTitle: (module: string) => string;
    activeText: (task: string) => string;
    bridgeTitle: (module: string) => string;
    bridgeText: (module: string, task: string) => string;
    bridgeButton: (module: string) => string;
    completedTitle: string;
    completedText: string;
    completedButton: string;
  }
> = {
  pt: {
    analyzingTitle: "A IA está lendo o seu dia",
    analyzingText:
      "Ela está cruzando o que você concluiu nos módulos para preparar a próxima leitura da jornada.",
    waitingTitle: "Este módulo já entregou a parte dele",
    waitingText:
      "Agora a jornada aguarda a virada para a meia-noite. Até lá, você pode acompanhar a análise e o feedback da IA.",
    waitingButton: "Ver evolução",
    activeTitle: (module) => `Hoje a ação está em ${module}`,
    activeText: (task) =>
      `Este módulo foi liberado no dia atual. O passo que falta aqui é: ${task}.`,
    bridgeTitle: (module) => `${module} já fez a parte dele hoje`,
    bridgeText: (module, task) =>
      `Para a jornada continuar organizando sua vida, a próxima ação está em ${module}: ${task}.`,
    bridgeButton: (module) => `Ir para ${module}`,
    completedTitle: "Este ciclo já foi concluído",
    completedText:
      "A IA encerrou a jornada atual. Agora o melhor próximo passo é acompanhar a evolução geral.",
    completedButton: "Abrir evolução",
  },
  en: {
    analyzingTitle: "The AI is reading your day",
    analyzingText:
      "It is crossing what you completed across modules to prepare the next journey reading.",
    waitingTitle: "This module has already delivered its part",
    waitingText:
      "Now the journey is waiting for midnight. Until then, you can follow the AI analysis and feedback.",
    waitingButton: "See evolution",
    activeTitle: (module) => `Today's action is in ${module}`,
    activeText: (task) =>
      `This module was unlocked for the current day. The remaining step here is: ${task}.`,
    bridgeTitle: (module) => `${module} already did its part today`,
    bridgeText: (module, task) =>
      `For the journey to keep organizing your life, the next action is in ${module}: ${task}.`,
    bridgeButton: (module) => `Go to ${module}`,
    completedTitle: "This cycle is already complete",
    completedText:
      "The AI has finished the current journey. The best next step now is to follow your overall evolution.",
    completedButton: "Open evolution",
  },
  es: {
    analyzingTitle: "La IA está leyendo tu día",
    analyzingText:
      "Está cruzando lo que completaste en los módulos para preparar la siguiente lectura de la jornada.",
    waitingTitle: "Este módulo ya entregó su parte",
    waitingText:
      "Ahora la jornada espera hasta la medianoche. Hasta entonces, puedes seguir el análisis y el feedback de la IA.",
    waitingButton: "Ver evolución",
    activeTitle: (module) => `La acción de hoy está en ${module}`,
    activeText: (task) =>
      `Este módulo fue liberado para el día actual. El paso que falta aquí es: ${task}.`,
    bridgeTitle: (module) => `${module} ya hizo su parte hoy`,
    bridgeText: (module, task) =>
      `Para que la jornada siga organizando tu vida, la próxima acción está en ${module}: ${task}.`,
    bridgeButton: (module) => `Ir a ${module}`,
    completedTitle: "Este ciclo ya está completo",
    completedText:
      "La IA cerró la jornada actual. El mejor siguiente paso ahora es seguir tu evolución general.",
    completedButton: "Abrir evolución",
  },
  fr: {
    analyzingTitle: "L'IA lit votre journée",
    analyzingText:
      "Elle croise ce que vous avez terminé dans les modules pour préparer la lecture suivante du parcours.",
    waitingTitle: "Ce module a déjà livré sa part",
    waitingText:
      "Le parcours attend maintenant minuit. En attendant, vous pouvez suivre l'analyse et le retour de l'IA.",
    waitingButton: "Voir l'évolution",
    activeTitle: (module) => `L'action d'aujourd'hui est dans ${module}`,
    activeText: (task) =>
      `Ce module a été libéré pour la journée en cours. L'étape restante ici est : ${task}.`,
    bridgeTitle: (module) => `${module} a déjà fait sa part aujourd'hui`,
    bridgeText: (module, task) =>
      `Pour que le parcours continue à organiser votre vie, la prochaine action se trouve dans ${module} : ${task}.`,
    bridgeButton: (module) => `Aller vers ${module}`,
    completedTitle: "Ce cycle est déjà terminé",
    completedText:
      "L'IA a clôturé le parcours actuel. Le meilleur prochain pas est maintenant de suivre votre évolution globale.",
    completedButton: "Ouvrir l'évolution",
  },
  it: {
    analyzingTitle: "L'IA sta leggendo la tua giornata",
    analyzingText:
      "Sta incrociando ciò che hai completato nei moduli per preparare la lettura successiva del percorso.",
    waitingTitle: "Questo modulo ha già dato la sua parte",
    waitingText:
      "Ora il percorso aspetta la mezzanotte. Fino ad allora, puoi seguire l'analisi e il feedback dell'IA.",
    waitingButton: "Vedi evoluzione",
    activeTitle: (module) => `L'azione di oggi è in ${module}`,
    activeText: (task) =>
      `Questo modulo è stato sbloccato per il giorno attuale. Il passo che manca qui è: ${task}.`,
    bridgeTitle: (module) => `${module} ha già fatto la sua parte oggi`,
    bridgeText: (module, task) =>
      `Per far continuare il percorso a organizzare la tua vita, la prossima azione è in ${module}: ${task}.`,
    bridgeButton: (module) => `Vai a ${module}`,
    completedTitle: "Questo ciclo è già completo",
    completedText:
      "L'IA ha chiuso il percorso attuale. Il miglior passo successivo ora è seguire la tua evoluzione generale.",
    completedButton: "Apri evoluzione",
  },
};

function getJourneyModuleKey(
  validationType: JourneyTaskValidationType
): JourneyModuleKey {
  if (
    validationType === "money_entries_total" ||
    validationType === "money_entries_today" ||
    validationType === "fixed_bills_total"
  ) {
    return "financeiro";
  }
  if (validationType === "goals_total" || validationType === "goals_today") {
    return "metas";
  }
  if (
    validationType === "learning_items_total" ||
    validationType === "learning_today"
  ) {
    return "aprendizado";
  }
  if (validationType === "time_items_total" || validationType === "time_today") {
    return "tempo";
  }
  if (validationType === "work_items_total" || validationType === "work_today") {
    return "trabalho";
  }
  if (
    validationType === "leisure_items_total" ||
    validationType === "leisure_today"
  ) {
    return "lazer";
  }
  if (
    validationType === "spiritual_items_total" ||
    validationType === "spiritual_today"
  ) {
    return "espiritualidade";
  }
  if (
    validationType === "medications_total" ||
    validationType === "medications_taken_today"
  ) {
    return "saude";
  }
  if (
    validationType === "habits_total" ||
    validationType === "habits_completed_today"
  ) {
    return "habitos";
  }
  return "checkin";
}

function getModuleLabel(
  moduleKey: JourneyModuleKey,
  language: AppLanguage
): string {
  if (moduleKey === "metas") return STATIC_LABELS[language].goals;
  if (moduleKey === "checkin") return STATIC_LABELS[language].checkin;
  return getLifeAreaLabel(moduleKey, language);
}

function getCurrentJourneyDay(
  plan: LifeJourneyPlan | null,
  progress: AIJourneyProgress
) {
  if (!plan) return null;
  return (
    plan.journeyDays.find((day) => day.day === progress.currentDay) ??
    plan.journeyDays[0] ??
    null
  );
}

function getPendingTask(day: LifeJourneyPlan["journeyDays"][number] | null) {
  if (!day) return null;
  return day.tasks.find((task) => !task.completed) ?? null;
}

function isAnalysisActive(progress: AIJourneyProgress, nowMs: number) {
  if (progress.analysisStatus !== "processing" || !progress.analysisCompletedAt) {
    return false;
  }
  return new Date(progress.analysisCompletedAt).getTime() > nowMs;
}

function isJourneyCompleted(
  plan: LifeJourneyPlan | null,
  progress: AIJourneyProgress
) {
  if (!plan) return false;
  return progress.completedDays.length >= plan.journeyDays.length;
}

export function formatJourneyCountdown(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export async function loadJourneyState(language: AppLanguage) {
  const [planRaw, progressRaw] = await Promise.all([
    AsyncStorage.getItem(AI_PLAN_KEY),
    AsyncStorage.getItem(AI_JOURNEY_PROGRESS_KEY),
  ]);

  const evaluated = await evaluateJourney(
    planRaw ? JSON.parse(planRaw) : null,
    progressRaw ? JSON.parse(progressRaw) : null,
    language
  );

  if (evaluated.plan) {
    await Promise.all([
      AsyncStorage.setItem(AI_PLAN_KEY, JSON.stringify(evaluated.plan)),
      AsyncStorage.setItem(
        AI_JOURNEY_PROGRESS_KEY,
        JSON.stringify(evaluated.progress)
      ),
    ]);
  }

  return {
    plan: normalizeLifeJourneyPlan(evaluated.plan, language),
    progress: normalizeJourneyProgress(evaluated.progress),
  };
}

export function buildHomeJourneyStatusCard(
  plan: LifeJourneyPlan | null,
  progress: AIJourneyProgress,
  language: AppLanguage,
  nowMs = Date.now()
): JourneyCardCopy | null {
  if (!plan) return null;

  const copy = HOME_COPY[language];
  const currentDay = getCurrentJourneyDay(plan, progress);
  const pendingTask = getPendingTask(currentDay);
  const countdownMs = progress.nextDayUnlockAt
    ? new Date(progress.nextDayUnlockAt).getTime() - nowMs
    : null;
  const countdownValue =
    countdownMs !== null ? formatJourneyCountdown(countdownMs) : undefined;

  if (isJourneyCompleted(plan, progress)) {
    return {
      eyebrow: STATIC_LABELS[language].status,
      title: copy.completedTitle,
      text: copy.completedText,
      actionLabel: copy.completedButton,
      actionRoute: "/evolucao-ia",
      iconName: "trophy-outline",
      tone: "success",
    };
  }

  if (isAnalysisActive(progress, nowMs)) {
    return {
      eyebrow: STATIC_LABELS[language].status,
      title: copy.analyzingTitle,
      text: progress.pendingFeedbackText || copy.analyzingText,
      timerLabel: STATIC_LABELS[language].nextDay,
      timerValue: countdownValue,
      actionLabel: copy.waitingButton,
      actionRoute: "/evolucao-ia",
      iconName: "sparkles-outline",
      tone: "warning",
    };
  }

  if (progress.nextDayUnlockAt) {
    return {
      eyebrow: STATIC_LABELS[language].status,
      title: progress.latestFeedbackTitle || copy.waitingTitle,
      text: progress.latestFeedbackText || copy.analyzingText,
      timerLabel: STATIC_LABELS[language].nextDay,
      timerValue: countdownValue,
      actionLabel: copy.waitingButton,
      actionRoute: "/evolucao-ia",
      iconName: "moon-outline",
      tone: "warning",
    };
  }

  if (!currentDay || !pendingTask) {
    return null;
  }

  const moduleKey = getJourneyModuleKey(pendingTask.validationType);
  const moduleLabel = getModuleLabel(moduleKey, language);
  const moduleMeta = JOURNEY_MODULE_META[moduleKey];

  return {
    eyebrow: STATIC_LABELS[language].status,
    title: copy.activeTitle(currentDay.day),
    text: copy.activeText(moduleLabel, pendingTask.title),
    actionLabel: copy.activeButton(moduleLabel),
    actionRoute: moduleMeta.route,
    iconName: moduleMeta.iconName,
    tone: "accent",
  };
}

export function buildModuleJourneyStatusCard(
  currentModule: JourneyModuleKey,
  plan: LifeJourneyPlan | null,
  progress: AIJourneyProgress,
  language: AppLanguage,
  nowMs = Date.now()
): JourneyCardCopy | null {
  if (!plan) return null;

  const copy = MODULE_COPY[language];
  const currentDay = getCurrentJourneyDay(plan, progress);
  const pendingTask = getPendingTask(currentDay);
  const countdownMs = progress.nextDayUnlockAt
    ? new Date(progress.nextDayUnlockAt).getTime() - nowMs
    : null;
  const countdownValue =
    countdownMs !== null ? formatJourneyCountdown(countdownMs) : undefined;
  const currentModuleLabel = getModuleLabel(currentModule, language);

  if (isJourneyCompleted(plan, progress)) {
    return {
      eyebrow: STATIC_LABELS[language].status,
      title: copy.completedTitle,
      text: copy.completedText,
      actionLabel: copy.completedButton,
      actionRoute: "/evolucao-ia",
      iconName: "trophy-outline",
      tone: "success",
    };
  }

  if (isAnalysisActive(progress, nowMs)) {
    return {
      eyebrow: STATIC_LABELS[language].status,
      title: copy.analyzingTitle,
      text: progress.pendingFeedbackText || copy.analyzingText,
      timerLabel: STATIC_LABELS[language].nextDay,
      timerValue: countdownValue,
      actionLabel: copy.waitingButton,
      actionRoute: "/evolucao-ia",
      iconName: "sparkles-outline",
      tone: "warning",
    };
  }

  if (progress.nextDayUnlockAt) {
    return {
      eyebrow: STATIC_LABELS[language].status,
      title: copy.waitingTitle,
      text: progress.latestFeedbackText || copy.waitingText,
      timerLabel: STATIC_LABELS[language].nextDay,
      timerValue: countdownValue,
      actionLabel: copy.waitingButton,
      actionRoute: "/evolucao-ia",
      iconName: "moon-outline",
      tone: "warning",
    };
  }

  if (!currentDay || !pendingTask) {
    return null;
  }

  const taskModule = getJourneyModuleKey(pendingTask.validationType);
  const taskModuleLabel = getModuleLabel(taskModule, language);
  const taskModuleMeta = JOURNEY_MODULE_META[taskModule];

  if (taskModule === currentModule) {
    return {
      eyebrow: STATIC_LABELS[language].status,
      title: copy.activeTitle(currentModuleLabel),
      text: copy.activeText(pendingTask.title),
      iconName: taskModuleMeta.iconName,
      tone: "accent",
    };
  }

  return {
    eyebrow: STATIC_LABELS[language].status,
    title: copy.bridgeTitle(currentModuleLabel),
    text: copy.bridgeText(taskModuleLabel, pendingTask.title),
    actionLabel: copy.bridgeButton(taskModuleLabel),
    actionRoute: taskModuleMeta.route,
    iconName: taskModuleMeta.iconName,
    tone: "accent",
  };
}
