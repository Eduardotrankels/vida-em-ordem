import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AchievementUnlockedModal from "../../components/AchievementUnlockedModal";
import AppScreenHeader from "../../components/AppScreenHeader";
import {
  ACHIEVEMENTS,
  getAchievementIconName,
  localizeAchievement,
} from "../constants/achievements";
import {
  getCurrentQuotePeriod,
  getQuoteLabel,
  getQuoteOfTheMoment,
} from "../constants/dailyQuotes";
import {
  Challenge21,
  Habit,
  getActiveChallenges,
  getBestStreak,
  getCanceledChallenges,
  getCompletedChallenges,
  getConsistency,
  getCurrentStreak,
  getFeaturedHabits,
  getLastNDaysSummary,
  getTotalCompletions,
  getUnlockedAchievementIds,
  todayKey,
} from "../utils/progress";
import { useAppLanguage } from "../utils/languageContext";
import { useAppTheme } from "../utils/themeContext";

const STORAGE_KEY = "@vida_em_ordem_habitos_v1";
const PREMIUM_KEY = "@vida_em_ordem_subscription_plan_v1";
const CHALLENGE_KEY = "@vida_em_ordem_desafio_21d_v1";
const SEEN_ACHIEVEMENTS_KEY = "@vida_em_ordem_seen_achievements_v1";

const copyByLanguage = {
  pt: {
    daysWord: "dias",
    headerTitle: "Histórico",
    headerSubtitle: "Seu progresso, consistência e evolução ao longo do tempo.",
    quickBadge: "Visão rápida do seu momento",
    panelEmpty: "Seu painel ainda está em branco",
    panelConsistency: "Consistência {{value}} nos últimos 7 dias",
    metricToday: "Execução hoje",
    metricMonth: "Ritmo do mês",
    planPremium: "Plano Premium",
    planFree: "Plano Free",
    planPremiumText:
      "Seu histórico ganhou uma leitura mais profunda, com métricas ampliadas e medalhas extras.",
    planFreeText:
      "Você está usando o plano Free. Seu progresso já está sendo registrado com uma visão essencial do seu histórico.",
    morning: "Manhã",
    afternoon: "Tarde",
    evening: "Noite",
    sourceBook: "Trecho inspirado no seu livro",
    sourceApp: "Mensagem de evolução do app",
    generalSummary: "Resumo geral",
    habits: "Hábitos",
    highlightedHabits: "Hábitos em destaque",
    premiumButton: "Conhecer Premium",
    premiumSectionTitle: "Conquistas extras no Premium",
    premiumSectionText:
      "No Free você vê uma amostra da sua galeria. No Premium entram medalhas extras, progresso expandido e uma visão mais profunda do seu histórico.",
    bottomTitle: "Seu histórico já está em movimento",
    bottomText:
      "Se quiser aprofundar a leitura, o Premium abre mais métricas, mais medalhas e mais clareza sobre sua evolução real.",
    bottomButton: "Conhecer visão ampliada",
  },
  en: {
    daysWord: "days",
    headerTitle: "History",
    headerSubtitle: "Your progress, consistency, and growth over time.",
    quickBadge: "Quick view of your current moment",
    panelEmpty: "Your dashboard is still blank",
    panelConsistency: "{{value}} consistency over the last 7 days",
    metricToday: "Execution today",
    metricMonth: "Month rhythm",
    planPremium: "Premium Plan",
    planFree: "Free Plan",
    planPremiumText:
      "Your history gained a deeper read with expanded metrics and extra medals.",
    planFreeText:
      "You are using the Free plan. Your progress is already being tracked with an essential view of your history.",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    sourceBook: "Passage inspired by your book",
    sourceApp: "Growth message from the app",
    generalSummary: "General summary",
    habits: "Habits",
    highlightedHabits: "Highlighted habits",
    premiumButton: "Explore Premium",
    premiumSectionTitle: "Extra achievements in Premium",
    premiumSectionText:
      "On Free you see a sample of your gallery. On Premium you unlock extra medals, expanded progress, and a deeper view of your history.",
    bottomTitle: "Your history is already moving",
    bottomText:
      "If you want to go deeper, Premium unlocks more metrics, more medals, and more clarity about your real progress.",
    bottomButton: "Explore expanded view",
  },
  es: {
    daysWord: "días",
    headerTitle: "Historial",
    headerSubtitle: "Tu progreso, constancia y evolución a lo largo del tiempo.",
    quickBadge: "Vista rápida de tu momento actual",
    panelEmpty: "Tu panel todavía está en blanco",
    panelConsistency: "Consistencia {{value}} en los últimos 7 días",
    metricToday: "Ejecución hoy",
    metricMonth: "Ritmo del mes",
    planPremium: "Plan Premium",
    planFree: "Plan Free",
    planPremiumText:
      "Tu historial ganó una lectura más profunda, con métricas ampliadas y medallas extra.",
    planFreeText:
      "Estás usando el plan Free. Tu progreso ya se está registrando con una visión esencial de tu historial.",
    morning: "Mañana",
    afternoon: "Tarde",
    evening: "Noche",
    sourceBook: "Fragmento inspirado en tu libro",
    sourceApp: "Mensaje de evolución de la app",
    generalSummary: "Resumen general",
    habits: "Hábitos",
    highlightedHabits: "Hábitos destacados",
    premiumButton: "Conocer Premium",
    premiumSectionTitle: "Logros extra en Premium",
    premiumSectionText:
      "En Free ves una muestra de tu galería. En Premium entran medallas extra, progreso ampliado y una visión más profunda de tu historial.",
    bottomTitle: "Tu historial ya está en movimiento",
    bottomText:
      "Si quieres profundizar la lectura, Premium abre más métricas, más medallas y más claridad sobre tu evolución real.",
    bottomButton: "Conocer visión ampliada",
  },
  fr: {
    daysWord: "jours",
    headerTitle: "Historique",
    headerSubtitle: "Vos progrès, votre constance et votre évolution au fil du temps.",
    quickBadge: "Vue rapide de votre moment actuel",
    panelEmpty: "Votre panneau est encore vide",
    panelConsistency: "Constance {{value}} sur les 7 derniers jours",
    metricToday: "Exécution aujourd'hui",
    metricMonth: "Rythme du mois",
    planPremium: "Plan Premium",
    planFree: "Plan Free",
    planPremiumText:
      "Votre historique gagne une lecture plus profonde, avec des métriques étendues et des médailles supplémentaires.",
    planFreeText:
      "Vous utilisez le plan Free. Votre progression est déjà enregistrée avec une vue essentielle de votre historique.",
    morning: "Matin",
    afternoon: "Après-midi",
    evening: "Soir",
    sourceBook: "Extrait inspiré de votre livre",
    sourceApp: "Message d'évolution de l'app",
    generalSummary: "Résumé général",
    habits: "Habitudes",
    highlightedHabits: "Habitudes en avant",
    premiumButton: "Découvrir Premium",
    premiumSectionTitle: "Réussites supplémentaires en Premium",
    premiumSectionText:
      "Avec Free, vous voyez un aperçu de votre galerie. Avec Premium, vous débloquez plus de médailles, une progression étendue et une lecture plus profonde de votre historique.",
    bottomTitle: "Votre historique est déjà en mouvement",
    bottomText:
      "Si vous voulez aller plus loin, Premium ouvre plus de métriques, plus de médailles et plus de clarté sur votre évolution réelle.",
    bottomButton: "Découvrir la vue étendue",
  },
  it: {
    daysWord: "giorni",
    headerTitle: "Storico",
    headerSubtitle: "I tuoi progressi, la tua costanza e la tua evoluzione nel tempo.",
    quickBadge: "Vista rapida del tuo momento attuale",
    panelEmpty: "Il tuo pannello è ancora vuoto",
    panelConsistency: "Costanza {{value}} negli ultimi 7 giorni",
    metricToday: "Esecuzione oggi",
    metricMonth: "Ritmo del mese",
    planPremium: "Piano Premium",
    planFree: "Piano Free",
    planPremiumText:
      "Il tuo storico ha ora una lettura più profonda, con metriche ampliate e medaglie extra.",
    planFreeText:
      "Stai usando il piano Free. I tuoi progressi sono già registrati con una visione essenziale del tuo storico.",
    morning: "Mattina",
    afternoon: "Pomeriggio",
    evening: "Sera",
    sourceBook: "Brano ispirato al tuo libro",
    sourceApp: "Messaggio di evoluzione dell'app",
    generalSummary: "Riepilogo generale",
    habits: "Abitudini",
    highlightedHabits: "Abitudini in evidenza",
    premiumButton: "Scopri Premium",
    premiumSectionTitle: "Conquiste extra in Premium",
    premiumSectionText:
      "Nel Free vedi un'anteprima della tua galleria. Nel Premium entrano medaglie extra, progresso ampliato e una lettura più profonda del tuo storico.",
    bottomTitle: "Il tuo storico è già in movimento",
    bottomText:
      "Se vuoi approfondire la lettura, Premium apre più metriche, più medaglie e più chiarezza sulla tua evoluzione reale.",
    bottomButton: "Scopri la vista estesa",
  },
} as const;

const extraCopyByLanguage = {
  pt: {
    generalHabitsLabel: "Hábitos",
    generalDoneTodayLabel: "Feitos hoje",
    generalCompletionsLabel: "Conclusões",
    generalActiveChallengesLabel: "Desafios ativos",
    consistencyTitle: "Consistência",
    currentStreakLabel: "🔥 Streak atual",
    currentStreakDescription:
      "Quantos dias seguidos você registrou pelo menos 1 hábito concluído.",
    bestStreakLabel: "Melhor streak",
    consistency7Label: "Consistência 7 dias",
    consistency14Label: "Consistência 14 dias",
    consistency14Premium: "Consistência de 14 dias é uma visão avançada do Premium.",
    consistency14Description:
      "Percentual de dias com pelo menos 1 hábito concluído.",
    last7DaysTitle: "Últimos 7 dias",
    last7DaysMeta: "{{done}}/{{total}} hábitos",
    calendarTitle: "Calendário de consistência",
    calendarActiveDays: "{{value}} dia(s) ativo(s) no mês",
    calendarCompletedDay: "Dia com hábito concluído",
    calendarToday: "Hoje",
    highlightedChallengeTitle: "Desafio em destaque",
    highlightedChallengeActive: "Em andamento",
    highlightedChallengeDay: "Dia {{value}} de 21",
    highlightedChallengeMeta:
      "{{completed}}/21 dias concluídos • {{status}}",
    highlightedChallengeDoneToday: "feito hoje",
    highlightedChallengePendingToday: "pendente hoje",
    highlightedChallengeProgress: "{{value}}% concluído",
    highlightedChallengeEmptyTitle: "Nenhum desafio ativo no momento",
    highlightedChallengeEmptyText:
      "Assim que você iniciar um desafio de 21 dias na aba Hábitos, ele aparecerá aqui com progresso e status do dia.",
    challengeSectionTitle: "Desafio 21 dias",
    challengeActiveLabel: "Ativos",
    challengeCompletedLabel: "Concluídos",
    challengeCanceledLabel: "Encerrados",
    challengeSuccessRateLabel: "Taxa de sucesso",
    advancedMetricsTitle: "Métricas avançadas ficam no Premium",
    advancedMetricsText:
      "Se quiser ampliar sua leitura, o Premium traz taxa de sucesso detalhada, visão expandida de conquistas e um retrato mais completo da sua evolução.",
    challengePanelSuccess:
      "Você já concluiu desafios. Isso é disciplina em movimento.",
    challengePanelEmpty: "Nenhum desafio concluído ainda",
    challengePanelText:
      "Continue firme. Quando você concluir seu primeiro desafio de 21 dias, ele aparecerá aqui como um troféu da sua consistência.",
    achievementsTitle: "Medalhas e conquistas",
    achievementsProgress: "{{unlocked}}/{{available}} conquistas desbloqueadas",
    featuredHabitsEmpty: "Conclua hábitos e seus destaques aparecerão aqui.",
    featuredHabitMeta:
      "{{total}} marcações • atual {{current}} dias • melhor {{best}} dias",
  },
  en: {
    generalHabitsLabel: "Habits",
    generalDoneTodayLabel: "Done today",
    generalCompletionsLabel: "Completions",
    generalActiveChallengesLabel: "Active challenges",
    consistencyTitle: "Consistency",
    currentStreakLabel: "🔥 Current streak",
    currentStreakDescription:
      "How many days in a row you recorded at least 1 completed habit.",
    bestStreakLabel: "Best streak",
    consistency7Label: "7-day consistency",
    consistency14Label: "14-day consistency",
    consistency14Premium: "14-day consistency is an advanced Premium insight.",
    consistency14Description:
      "Percentage of days with at least 1 completed habit.",
    last7DaysTitle: "Last 7 days",
    last7DaysMeta: "{{done}}/{{total}} habits",
    calendarTitle: "Consistency calendar",
    calendarActiveDays: "{{value}} active day(s) this month",
    calendarCompletedDay: "Day with a completed habit",
    calendarToday: "Today",
    highlightedChallengeTitle: "Highlighted challenge",
    highlightedChallengeActive: "In progress",
    highlightedChallengeDay: "Day {{value}} of 21",
    highlightedChallengeMeta:
      "{{completed}}/21 days completed • {{status}}",
    highlightedChallengeDoneToday: "done today",
    highlightedChallengePendingToday: "pending today",
    highlightedChallengeProgress: "{{value}}% completed",
    highlightedChallengeEmptyTitle: "No active challenge right now",
    highlightedChallengeEmptyText:
      "As soon as you start a 21-day challenge in the Habits tab, it will appear here with progress and daily status.",
    challengeSectionTitle: "21-day challenge",
    challengeActiveLabel: "Active",
    challengeCompletedLabel: "Completed",
    challengeCanceledLabel: "Closed",
    challengeSuccessRateLabel: "Success rate",
    advancedMetricsTitle: "Advanced metrics stay in Premium",
    advancedMetricsText:
      "If you want a deeper read, Premium unlocks detailed success rate, expanded achievements, and a fuller picture of your progress.",
    challengePanelSuccess:
      "You have already completed challenges. That is discipline in motion.",
    challengePanelEmpty: "No completed challenge yet",
    challengePanelText:
      "Keep going. When you complete your first 21-day challenge, it will appear here as a trophy of your consistency.",
    achievementsTitle: "Medals and achievements",
    achievementsProgress: "{{unlocked}}/{{available}} achievements unlocked",
    featuredHabitsEmpty: "Complete habits and your highlights will appear here.",
    featuredHabitMeta:
      "{{total}} completions • current {{current}} days • best {{best}} days",
  },
  es: {
    generalHabitsLabel: "Hábitos",
    generalDoneTodayLabel: "Hechos hoy",
    generalCompletionsLabel: "Conclusiones",
    generalActiveChallengesLabel: "Desafíos activos",
    consistencyTitle: "Constancia",
    currentStreakLabel: "🔥 Racha actual",
    currentStreakDescription:
      "Cuántos días seguidos registraste al menos 1 hábito completado.",
    bestStreakLabel: "Mejor racha",
    consistency7Label: "Constancia 7 días",
    consistency14Label: "Constancia 14 días",
    consistency14Premium:
      "La constancia de 14 días es una visión avanzada del Premium.",
    consistency14Description:
      "Porcentaje de días con al menos 1 hábito completado.",
    last7DaysTitle: "Últimos 7 días",
    last7DaysMeta: "{{done}}/{{total}} hábitos",
    calendarTitle: "Calendario de constancia",
    calendarActiveDays: "{{value}} día(s) activo(s) en el mes",
    calendarCompletedDay: "Día con hábito completado",
    calendarToday: "Hoy",
    highlightedChallengeTitle: "Desafío destacado",
    highlightedChallengeActive: "En progreso",
    highlightedChallengeDay: "Día {{value}} de 21",
    highlightedChallengeMeta:
      "{{completed}}/21 días completados • {{status}}",
    highlightedChallengeDoneToday: "hecho hoy",
    highlightedChallengePendingToday: "pendiente hoy",
    highlightedChallengeProgress: "{{value}}% completado",
    highlightedChallengeEmptyTitle: "Ningún desafío activo por ahora",
    highlightedChallengeEmptyText:
      "Tan pronto como inicies un desafío de 21 días en la pestaña Hábitos, aparecerá aquí con progreso y estado del día.",
    challengeSectionTitle: "Desafío de 21 días",
    challengeActiveLabel: "Activos",
    challengeCompletedLabel: "Completados",
    challengeCanceledLabel: "Cerrados",
    challengeSuccessRateLabel: "Tasa de éxito",
    advancedMetricsTitle: "Las métricas avanzadas están en Premium",
    advancedMetricsText:
      "Si quieres profundizar tu lectura, Premium abre la tasa de éxito detallada, logros ampliados y una visión más completa de tu evolución.",
    challengePanelSuccess:
      "Ya completaste desafíos. Eso es disciplina en movimiento.",
    challengePanelEmpty: "Aún no hay desafíos completados",
    challengePanelText:
      "Sigue firme. Cuando completes tu primer desafío de 21 días, aparecerá aquí como un trofeo de tu constancia.",
    achievementsTitle: "Medallas y logros",
    achievementsProgress: "{{unlocked}}/{{available}} logros desbloqueados",
    featuredHabitsEmpty:
      "Completa hábitos y tus destacados aparecerán aquí.",
    featuredHabitMeta:
      "{{total}} registros • actual {{current}} días • mejor {{best}} días",
  },
  fr: {
    generalHabitsLabel: "Habitudes",
    generalDoneTodayLabel: "Faites aujourd'hui",
    generalCompletionsLabel: "Achèvements",
    generalActiveChallengesLabel: "Défis actifs",
    consistencyTitle: "Constance",
    currentStreakLabel: "🔥 Série actuelle",
    currentStreakDescription:
      "Combien de jours d'affilée vous avez enregistré au moins 1 habitude accomplie.",
    bestStreakLabel: "Meilleure série",
    consistency7Label: "Constance 7 jours",
    consistency14Label: "Constance 14 jours",
    consistency14Premium:
      "La constance sur 14 jours est une vue avancée du Premium.",
    consistency14Description:
      "Pourcentage de jours avec au moins 1 habitude accomplie.",
    last7DaysTitle: "7 derniers jours",
    last7DaysMeta: "{{done}}/{{total}} habitudes",
    calendarTitle: "Calendrier de constance",
    calendarActiveDays: "{{value}} jour(s) actif(s) ce mois-ci",
    calendarCompletedDay: "Jour avec habitude accomplie",
    calendarToday: "Aujourd'hui",
    highlightedChallengeTitle: "Défi mis en avant",
    highlightedChallengeActive: "En cours",
    highlightedChallengeDay: "Jour {{value}} sur 21",
    highlightedChallengeMeta:
      "{{completed}}/21 jours accomplis • {{status}}",
    highlightedChallengeDoneToday: "fait aujourd'hui",
    highlightedChallengePendingToday: "en attente aujourd'hui",
    highlightedChallengeProgress: "{{value}}% accompli",
    highlightedChallengeEmptyTitle: "Aucun défi actif pour le moment",
    highlightedChallengeEmptyText:
      "Dès que vous commencerez un défi de 21 jours dans l'onglet Habitudes, il apparaîtra ici avec la progression et le statut du jour.",
    challengeSectionTitle: "Défi 21 jours",
    challengeActiveLabel: "Actifs",
    challengeCompletedLabel: "Terminés",
    challengeCanceledLabel: "Clôturés",
    challengeSuccessRateLabel: "Taux de réussite",
    advancedMetricsTitle: "Les métriques avancées restent en Premium",
    advancedMetricsText:
      "Si vous voulez aller plus loin, Premium débloque le taux de réussite détaillé, des réussites étendues et une lecture plus complète de votre évolution.",
    challengePanelSuccess:
      "Vous avez déjà terminé des défis. C'est de la discipline en mouvement.",
    challengePanelEmpty: "Aucun défi terminé pour l'instant",
    challengePanelText:
      "Continuez. Quand vous terminerez votre premier défi de 21 jours, il apparaîtra ici comme un trophée de votre constance.",
    achievementsTitle: "Médailles et réussites",
    achievementsProgress: "{{unlocked}}/{{available}} réussites débloquées",
    featuredHabitsEmpty:
      "Terminez des habitudes et vos mises en avant apparaîtront ici.",
    featuredHabitMeta:
      "{{total}} validations • actuelle {{current}} jours • meilleure {{best}} jours",
  },
  it: {
    generalHabitsLabel: "Abitudini",
    generalDoneTodayLabel: "Fatte oggi",
    generalCompletionsLabel: "Completamenti",
    generalActiveChallengesLabel: "Sfide attive",
    consistencyTitle: "Costanza",
    currentStreakLabel: "🔥 Serie attuale",
    currentStreakDescription:
      "Quanti giorni di fila hai registrato almeno 1 abitudine completata.",
    bestStreakLabel: "Migliore serie",
    consistency7Label: "Costanza 7 giorni",
    consistency14Label: "Costanza 14 giorni",
    consistency14Premium:
      "La costanza di 14 giorni è una vista avanzata del Premium.",
    consistency14Description:
      "Percentuale di giorni con almeno 1 abitudine completata.",
    last7DaysTitle: "Ultimi 7 giorni",
    last7DaysMeta: "{{done}}/{{total}} abitudini",
    calendarTitle: "Calendario della costanza",
    calendarActiveDays: "{{value}} giorno/i attivo/i nel mese",
    calendarCompletedDay: "Giorno con abitudine completata",
    calendarToday: "Oggi",
    highlightedChallengeTitle: "Sfida in evidenza",
    highlightedChallengeActive: "In corso",
    highlightedChallengeDay: "Giorno {{value}} di 21",
    highlightedChallengeMeta:
      "{{completed}}/21 giorni completati • {{status}}",
    highlightedChallengeDoneToday: "fatto oggi",
    highlightedChallengePendingToday: "in attesa oggi",
    highlightedChallengeProgress: "{{value}}% completato",
    highlightedChallengeEmptyTitle: "Nessuna sfida attiva al momento",
    highlightedChallengeEmptyText:
      "Appena inizierai una sfida di 21 giorni nella tab Abitudini, apparirà qui con progresso e stato del giorno.",
    challengeSectionTitle: "Sfida di 21 giorni",
    challengeActiveLabel: "Attive",
    challengeCompletedLabel: "Completate",
    challengeCanceledLabel: "Chiuse",
    challengeSuccessRateLabel: "Tasso di successo",
    advancedMetricsTitle: "Le metriche avanzate restano nel Premium",
    advancedMetricsText:
      "Se vuoi approfondire la lettura, Premium sblocca il tasso di successo dettagliato, conquiste estese e una vista più completa della tua evoluzione.",
    challengePanelSuccess:
      "Hai già completato delle sfide. Questa è disciplina in movimento.",
    challengePanelEmpty: "Nessuna sfida completata ancora",
    challengePanelText:
      "Continua così. Quando completerai la tua prima sfida di 21 giorni, apparirà qui come trofeo della tua costanza.",
    achievementsTitle: "Medaglie e conquiste",
    achievementsProgress: "{{unlocked}}/{{available}} conquiste sbloccate",
    featuredHabitsEmpty:
      "Completa abitudini e i tuoi elementi in evidenza appariranno qui.",
    featuredHabitMeta:
      "{{total}} registrazioni • attuale {{current}} giorni • migliore {{best}} giorni",
  },
} as const;

const uiByLanguage = {
  pt: {
    locale: "pt-BR",
    weekDays: ["S", "T", "Q", "Q", "S", "S", "D"],
    smartEmpty:
      "Seu histórico começa quando o primeiro hábito ganha vida. Assim que você concluir os primeiros registros, esta área vira um mapa da sua evolução.",
    smartStrong:
      "Sua consistência já tem motor próprio. Agora o foco é transformar disciplina em identidade.",
    smartPeak:
      "Você está em fase forte. Seu ritmo recente mostra que o sistema está funcionando.",
    smartMid:
      "Você já criou tração. Pequenos ajustes podem transformar boa intenção em constância real.",
    smartBase:
      "Seu progresso ainda está aquecendo. O segredo agora é diminuir atrito e repetir o básico por alguns dias seguidos.",
  },
  en: {
    locale: "en-US",
    weekDays: ["M", "T", "W", "T", "F", "S", "S"],
    smartEmpty:
      "Your history begins when the first habit comes alive. As soon as you complete your first records, this area becomes a map of your growth.",
    smartStrong:
      "Your consistency already has its own engine. Now the focus is turning discipline into identity.",
    smartPeak:
      "You are in a strong phase. Your recent rhythm shows the system is working.",
    smartMid:
      "You already built traction. Small adjustments can turn good intentions into real consistency.",
    smartBase:
      "Your progress is still warming up. The secret now is to reduce friction and repeat the basics for a few days in a row.",
  },
  es: {
    locale: "es-ES",
    weekDays: ["L", "M", "X", "J", "V", "S", "D"],
    smartEmpty:
      "Tu historial comienza cuando el primer hábito cobra vida. En cuanto completes tus primeros registros, esta área se convierte en un mapa de tu evolución.",
    smartStrong:
      "Tu constancia ya tiene motor propio. Ahora el foco es convertir disciplina en identidad.",
    smartPeak:
      "Estás en una fase fuerte. Tu ritmo reciente muestra que el sistema está funcionando.",
    smartMid:
      "Ya generaste tracción. Pequeños ajustes pueden convertir una buena intención en constancia real.",
    smartBase:
      "Tu progreso todavía está tomando temperatura. El secreto ahora es reducir fricción y repetir lo básico durante algunos días seguidos.",
  },
  fr: {
    locale: "fr-FR",
    weekDays: ["L", "M", "M", "J", "V", "S", "D"],
    smartEmpty:
      "Votre historique commence quand la première habitude prend vie. Dès vos premiers enregistrements, cette zone devient une carte de votre évolution.",
    smartStrong:
      "Votre constance a déjà son propre moteur. L'enjeu maintenant est de transformer la discipline en identité.",
    smartPeak:
      "Vous traversez une phase forte. Votre rythme récent montre que le système fonctionne.",
    smartMid:
      "Vous avez déjà créé de l'élan. De petits ajustements peuvent transformer une bonne intention en vraie constance.",
    smartBase:
      "Votre progression se met encore en route. Le secret maintenant est de réduire la friction et de répéter l'essentiel pendant quelques jours d'affilée.",
  },
  it: {
    locale: "it-IT",
    weekDays: ["L", "M", "M", "G", "V", "S", "D"],
    smartEmpty:
      "Il tuo storico inizia quando la prima abitudine prende vita. Appena completi i primi registri, quest'area diventa una mappa della tua evoluzione.",
    smartStrong:
      "La tua costanza ha già un motore proprio. Ora il focus è trasformare la disciplina in identità.",
    smartPeak:
      "Sei in una fase forte. Il tuo ritmo recente mostra che il sistema sta funzionando.",
    smartMid:
      "Hai già creato trazione. Piccoli aggiustamenti possono trasformare una buona intenzione in costanza reale.",
    smartBase:
      "I tuoi progressi stanno ancora prendendo ritmo. Il segreto ora è ridurre l'attrito e ripetere le basi per alcuni giorni di seguito.",
  },
} as const;

function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(startKey: string, endKey: string) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86400000);
}

function getChallengeCurrentDay(startedAt: string, today: string) {
  const startDate = new Date(startedAt);
  const startKey = todayKey(startDate);
  const days = diffDays(startKey, today) + 1;
  return Math.max(1, Math.min(days, 21));
}

function getMonthLabel(locale: string, date = new Date()) {
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function formatDayLabel(dateKey: string, locale: string) {
  return parseDateKey(dateKey).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
  });
}

function getMonthActiveDays(habits: Habit[], date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const set = new Set<string>();

  habits.forEach((habit) => {
    habit.completedDates.forEach((dateKey) => {
      const parsed = parseDateKey(dateKey);
      if (parsed.getFullYear() === year && parsed.getMonth() === month) {
        set.add(dateKey);
      }
    });
  });

  return set.size;
}

function getCalendarMatrix(habits: Habit[], date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = todayKey();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const completedSet = new Set<string>();
  habits.forEach((habit) => {
    habit.completedDates.forEach((dateKey) => {
      completedSet.add(dateKey);
    });
  });

  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;

  const cells: {
    id: string;
    day: number | null;
    dateKey: string | null;
    isToday: boolean;
    isCompleted: boolean;
  }[] = [];

  for (let i = 0; i < mondayFirstOffset; i++) {
    cells.push({
      id: `empty_start_${i}`,
      day: null,
      dateKey: null,
      isToday: false,
      isCompleted: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    cells.push({
      id: dateKey,
      day,
      dateKey,
      isToday: dateKey === today,
      isCompleted: completedSet.has(dateKey),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      id: `empty_end_${cells.length}`,
      day: null,
      dateKey: null,
      isToday: false,
      isCompleted: false,
    });
  }

  const matrix = [];
  for (let i = 0; i < cells.length; i += 7) {
    matrix.push(cells.slice(i, i + 7));
  }

  return matrix;
}

function getHabitCurrentStreak(habit: Habit) {
  if (!habit.completedDates?.length) return 0;

  const sorted = [...habit.completedDates].sort();
  const done = new Set(sorted);
  let streak = 0;
  let cursor = new Date();

  while (done.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getHabitBestStreak(habit: Habit) {
  if (!habit.completedDates?.length) return 0;

  const sorted = [...habit.completedDates].sort();
  let best = 0;
  let current = 0;
  let previousKey: string | null = null;

  for (const dateKey of sorted) {
    if (!previousKey) {
      current = 1;
      best = 1;
      previousKey = dateKey;
      continue;
    }

    const diff = diffDays(previousKey, dateKey);

    if (diff === 1) {
      current += 1;
    } else if (diff > 1) {
      current = 1;
    }

    if (current > best) best = current;
    previousKey = dateKey;
  }

  return best;
}

type AchievementPopup = {
  id: string;
  icon: string;
  title: string;
  description: string;
} | null;

export default function Historico() {
  const { settings, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const copy = {
    ...copyByLanguage[language],
    ...extraCopyByLanguage[language],
  };
  const ui = uiByLanguage[language];

  const [habits, setHabits] = useState<Habit[]>([]);
  const [challenges, setChallenges] = useState<Challenge21[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [seenAchievementIds, setSeenAchievementIds] = useState<string[]>([]);
  const [achievementPopup, setAchievementPopup] =
    useState<AchievementPopup>(null);

  const firstLoadDoneRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const [habitsRaw, premiumRaw, challengeRaw, seenRaw] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(PREMIUM_KEY),
          AsyncStorage.getItem(CHALLENGE_KEY),
          AsyncStorage.getItem(SEEN_ACHIEVEMENTS_KEY),
        ]);

      const parsedHabits = habitsRaw ? JSON.parse(habitsRaw) : [];
      const parsedChallenges = challengeRaw ? JSON.parse(challengeRaw) : [];
      const parsedSeen = seenRaw ? JSON.parse(seenRaw) : [];

      const effectivePlan =
        settings.plan === "premium" || premiumRaw === "premium";

      setHabits(Array.isArray(parsedHabits) ? parsedHabits : []);
      setChallenges(Array.isArray(parsedChallenges) ? parsedChallenges : []);
      setSeenAchievementIds(Array.isArray(parsedSeen) ? parsedSeen : []);
      setIsPremium(effectivePlan);
    } catch (error) {
      console.log("Erro ao carregar histórico:", error);
      setHabits([]);
      setChallenges([]);
      setSeenAchievementIds([]);
      setIsPremium(settings.plan === "premium");
    }
  }, [settings.plan]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const totalHabits = habits.length;

  const todayDone = useMemo(() => {
    const t = todayKey();
    return habits.reduce(
      (acc, habit) => acc + (habit.completedDates.includes(t) ? 1 : 0),
      0
    );
  }, [habits]);

  const totalCompletions = useMemo(() => getTotalCompletions(habits), [habits]);

  const activeChallenges = useMemo(
    () => getActiveChallenges(challenges).length,
    [challenges]
  );

  const completedChallenges = useMemo(
    () => getCompletedChallenges(challenges).length,
    [challenges]
  );

  const canceledChallenges = useMemo(
    () => getCanceledChallenges(challenges).length,
    [challenges]
  );

  const currentStreak = useMemo(() => getCurrentStreak(habits), [habits]);
  const bestStreak = useMemo(() => getBestStreak(habits), [habits]);
  const consistency7 = useMemo(() => getConsistency(habits, 7), [habits]);
  const consistency14 = useMemo(() => getConsistency(habits, 14), [habits]);
  const last7Days = useMemo(
    () =>
      getLastNDaysSummary(habits, 7).map((day) => ({
        ...day,
        label: formatDayLabel(day.dateKey, ui.locale),
      })),
    [habits, ui.locale]
  );
  const featuredHabits = useMemo(() => getFeaturedHabits(habits), [habits]);

  const achievements = useMemo(
    () =>
      getUnlockedAchievementIds(habits, challenges).map((achievement) =>
        localizeAchievement(achievement, language)
      ),
    [habits, challenges, language]
  );

  const visibleAchievements = useMemo(() => {
    if (isPremium) return achievements;
    return achievements
      .filter((achievement) => !achievement.isPremium)
      .slice(0, 6);
  }, [achievements, isPremium]);

  const unlockedCount = achievements.filter((a) => {
    if (a.isPremium && !isPremium) return false;
    return a.unlocked;
  }).length;

  const availableCount = ACHIEVEMENTS.filter((a) => {
    if (a.isPremium && !isPremium) return false;
    return true;
  }).length;

  const quoteOfDay = useMemo(() => getQuoteOfTheMoment(language), [language]);
  const quotePeriod = useMemo(() => getCurrentQuotePeriod(), []);
  const quoteLabel = useMemo(
    () => getQuoteLabel(quotePeriod, language),
    [quotePeriod, language]
  );

  const highlightedChallenge = useMemo(() => {
    const active = getActiveChallenges(challenges);
    if (active.length === 0) return null;

    const first = active[0];
    const today = todayKey();
    const currentDay = getChallengeCurrentDay(first.startedAt, today);
    const completedCount = first.completedDates.length;
    const progress = Math.min(Math.round((completedCount / 21) * 100), 100);
    const doneToday = first.completedDates.includes(today);

    return {
      ...first,
      currentDay,
      completedCount,
      progress,
      doneToday,
    };
  }, [challenges]);

  const calendarMonthLabel = useMemo(
    () => getMonthLabel(ui.locale),
    [ui.locale]
  );
  const calendarMatrix = useMemo(() => getCalendarMatrix(habits), [habits]);
  const activeDaysInMonth = useMemo(() => getMonthActiveDays(habits), [habits]);

  const challengeSuccessRate =
    completedChallenges + canceledChallenges > 0
      ? Math.round(
          (completedChallenges / (completedChallenges + canceledChallenges)) *
            100
        )
      : 0;

  const executionRate = useMemo(() => {
    if (totalHabits === 0) return 0;
    return Math.min(Math.round((todayDone / totalHabits) * 100), 100);
  }, [todayDone, totalHabits]);

  const monthPerformance = useMemo(() => {
    if (activeDaysInMonth === 0) return 0;
    const now = new Date();
    const passedDays = now.getDate();
    return Math.min(Math.round((activeDaysInMonth / passedDays) * 100), 100);
  }, [activeDaysInMonth]);

  const smartInsight = useMemo(() => {
    if (totalHabits === 0) {
      return ui.smartEmpty;
    }

    if (currentStreak >= 21) {
      return ui.smartStrong;
    }

    if (consistency7 >= 80) {
      return ui.smartPeak;
    }

    if (consistency7 >= 50) {
      return ui.smartMid;
    }

    return ui.smartBase;
  }, [totalHabits, currentStreak, consistency7, ui]);

  useEffect(() => {
    if (!firstLoadDoneRef.current) {
      firstLoadDoneRef.current = true;
      return;
    }

    const unlockedAndAllowed = achievements.filter((achievement) => {
      if (!achievement.unlocked) return false;
      if (achievement.isPremium && !isPremium) return false;
      return true;
    });

    const newAchievement = unlockedAndAllowed.find(
      (achievement) => !seenAchievementIds.includes(achievement.id)
    );

    if (!newAchievement) return;

    setAchievementPopup({
      id: newAchievement.id,
      icon: newAchievement.icon,
      title: newAchievement.title,
      description: newAchievement.description,
    });
  }, [achievements, seenAchievementIds, isPremium]);

  const handleCloseAchievementPopup = useCallback(async () => {
    if (!achievementPopup) return;

    const nextSeen = Array.from(
      new Set([...seenAchievementIds, achievementPopup.id])
    );

    setSeenAchievementIds(nextSeen);
    setAchievementPopup(null);

    try {
      await AsyncStorage.setItem(
        SEEN_ACHIEVEMENTS_KEY,
        JSON.stringify(nextSeen)
      );
    } catch (error) {
      console.log("Erro ao salvar conquistas vistas:", error);
    }
  }, [achievementPopup, seenAchievementIds]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          title={copy.headerTitle}
          subtitle={copy.headerSubtitle}
          icon="time-outline"
          showBack={false}
          badgeLabel={isPremium ? t("common.premium") : t("common.free")}
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={goToPremium}
        />

        <View
          style={[
            styles.executiveCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.executiveBadge,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text style={[styles.executiveBadgeText, { color: colors.accent }]}>
              {copy.quickBadge}
            </Text>
          </View>

          <Text style={[styles.executiveTitle, { color: colors.text }]}>
            {totalHabits === 0
              ? copy.panelEmpty
              : copy.panelConsistency.replace("{{value}}", `${consistency7}%`)}
          </Text>

          <Text
            style={[styles.executiveDescription, { color: colors.textSecondary }]}
          >
            {smartInsight}
          </Text>

          <View style={styles.executiveMetricsRow}>
            <View
              style={[
                styles.executiveMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.executiveMiniValue, { color: colors.text }]}>
                {executionRate}%
              </Text>
              <Text
                style={[styles.executiveMiniLabel, { color: colors.textMuted }]}
              >
                {copy.metricToday}
              </Text>
            </View>

            <View
              style={[
                styles.executiveMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.executiveMiniValue, { color: colors.text }]}>
                {monthPerformance}%
              </Text>
              <Text
                style={[styles.executiveMiniLabel, { color: colors.textMuted }]}
              >
                {copy.metricMonth}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.planCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.planBadge,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <View style={styles.inlineIconRow}>
              <Ionicons
                name={isPremium ? "diamond-outline" : "grid-outline"}
                size={14}
                color={colors.accent}
              />
              <Text style={[styles.planBadgeText, { color: colors.accent }]}>
                {isPremium ? copy.planPremium : copy.planFree}
              </Text>
            </View>
          </View>
          <Text style={[styles.planText, { color: colors.textSecondary }]}>
            {isPremium ? copy.planPremiumText : copy.planFreeText}
          </Text>
        </View>

        <View
          style={[
            styles.quoteCard,
            {
              backgroundColor: colors.accentSoft,
              borderColor: colors.success,
            },
          ]}
        >
          <View style={styles.quoteTopRow}>
            <View style={styles.inlineIconRow}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={14}
                color={colors.success}
              />
              <Text style={[styles.quoteLabel, { color: colors.success }]}>
                {quoteLabel}
              </Text>
            </View>
            <View
              style={[
                styles.quotePeriodBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Text
                style={[styles.quotePeriodBadgeText, { color: colors.accent }]}
              >
                {quotePeriod === "morning"
                  ? copy.morning
                  : quotePeriod === "afternoon"
                    ? copy.afternoon
                    : copy.evening}
              </Text>
            </View>
          </View>

          <Text style={[styles.quoteText, { color: colors.text }]}>
            {quoteOfDay.text}
          </Text>

          <Text style={[styles.quoteSource, { color: colors.textMuted }]}>
            {quoteOfDay.source === "livro"
              ? copy.sourceBook
              : copy.sourceApp}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.generalSummary}
        </Text>
        <View style={styles.grid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalHabits}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.generalHabitsLabel}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {todayDone}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.generalDoneTodayLabel}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalCompletions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.generalCompletionsLabel}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {activeChallenges}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.generalActiveChallengesLabel}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.consistencyTitle}
        </Text>

        <View
          style={[
            styles.bigCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.success,
            },
          ]}
        >
          <Text style={[styles.bigCardLabel, { color: colors.warning }]}>
            {copy.currentStreakLabel}
          </Text>
          <Text style={[styles.bigCardValue, { color: colors.text }]}>
            {currentStreak} {copy.daysWord}
          </Text>
          <Text style={[styles.bigCardText, { color: colors.textSecondary }]}>
            {copy.currentStreakDescription}
          </Text>
        </View>

        <View style={styles.grid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.bestStreakLabel}
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {bestStreak} {copy.daysWord}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.consistency7Label}
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {consistency7}%
            </Text>
          </View>

          <View
            style={[
              styles.statCardWide,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.consistency14Label}
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {isPremium ? `${consistency14}%` : t("common.premium")}
            </Text>
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              {isPremium
                ? copy.consistency14Description
                : copy.consistency14Premium}
            </Text>

            {!isPremium ? (
              <Pressable
                style={[
                  styles.inlineUpgradeButton,
                  {
                    backgroundColor: colors.accentButtonBackground,
                    borderColor: colors.accentButtonBorder,
                  },
                  colors.isWhiteAccentButton && styles.whiteAccentButton,
                ]}
                onPress={goToPremium}
              >
                <Text
                  style={[
                    styles.inlineUpgradeButtonText,
                    { color: colors.accentButtonText },
                  ]}
                >
                  {copy.premiumButton}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.last7DaysTitle}
        </Text>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {last7Days.map((day) => (
            <View key={day.dateKey} style={styles.dayRow}>
              <View style={styles.dayInfo}>
                <Text style={[styles.dayDate, { color: colors.text }]}>
                  {day.label}
                </Text>
                <Text style={[styles.dayMeta, { color: colors.textMuted }]}>
                  {copy.last7DaysMeta
                    .replace("{{done}}", String(day.done))
                    .replace("{{total}}", String(day.total))}
                </Text>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${day.percent}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.dayPercent, { color: colors.text }]}>
                {day.percent}%
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.calendarTitle}
        </Text>

        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.calendarHeader}>
            <Text style={[styles.calendarMonth, { color: colors.text }]}>
              {calendarMonthLabel}
            </Text>
            <Text style={[styles.calendarMonthMeta, { color: colors.textMuted }]}>
              {copy.calendarActiveDays.replace("{{value}}", String(activeDaysInMonth))}
            </Text>
          </View>

          <View style={styles.calendarWeekHeader}>
            {ui.weekDays.map((item, index) => (
              <Text
                key={`${item}_${index}`}
                style={[styles.calendarWeekDay, { color: colors.textMuted }]}
              >
                {item}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarMatrix.map((week, weekIndex) => (
              <View key={`week_${weekIndex}`} style={styles.calendarRow}>
                {week.map((cell) => (
                  <View
                    key={cell.id}
                    style={[
                      styles.calendarCell,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                      cell.day === null && styles.calendarCellEmpty,
                      cell.isCompleted && {
                        backgroundColor: colors.success,
                        borderColor: colors.success,
                      },
                      cell.isToday && {
                        borderColor: colors.accent,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarCellText,
                        { color: colors.text },
                        cell.day === null && styles.calendarCellTextEmpty,
                        cell.isCompleted && {
                          color: "#ffffff",
                        },
                        cell.isToday && {
                          color: colors.text,
                        },
                      ]}
                    >
                      {cell.day ?? ""}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.calendarLegend}>
            <View style={styles.calendarLegendItem}>
              <View
                style={[
                  styles.calendarLegendDot,
                  { backgroundColor: colors.success },
                ]}
              />
              <Text
                style={[styles.calendarLegendText, { color: colors.textSecondary }]}
              >
                {copy.calendarCompletedDay}
              </Text>
            </View>

            <View style={styles.calendarLegendItem}>
              <View
                style={[
                  styles.calendarLegendDot,
                  { backgroundColor: colors.accent },
                ]}
              />
              <Text
                style={[styles.calendarLegendText, { color: colors.textSecondary }]}
              >
                {copy.calendarToday}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.highlightedChallengeTitle}
        </Text>

        {highlightedChallenge ? (
          <View
            style={[
              styles.highlightChallengeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.success,
              },
            ]}
          >
            <View style={styles.highlightChallengeTop}>
              <View
                style={[
                  styles.highlightChallengeBadge,
                  {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.warning,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.highlightChallengeBadgeText,
                    { color: colors.warning },
                  ]}
                >
                  {copy.highlightedChallengeActive}
                </Text>
              </View>

              <Text
                style={[
                  styles.highlightChallengeDay,
                  { color: colors.textSecondary },
                ]}
              >
                {copy.highlightedChallengeDay.replace(
                  "{{value}}",
                  String(highlightedChallenge.currentDay)
                )}
              </Text>
            </View>

            <Text
              style={[styles.highlightChallengeTitle, { color: colors.text }]}
            >
              {highlightedChallenge.habitTitle}
            </Text>

            <Text
              style={[
                styles.highlightChallengeMeta,
                { color: colors.textMuted },
              ]}
            >
              {copy.highlightedChallengeMeta
                .replace("{{completed}}", String(highlightedChallenge.completedCount))
                .replace(
                  "{{status}}",
                  highlightedChallenge.doneToday
                    ? copy.highlightedChallengeDoneToday
                    : copy.highlightedChallengePendingToday
                )}
            </Text>

            <View
              style={[
                styles.highlightChallengeTrack,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.highlightChallengeFill,
                  {
                    width: `${highlightedChallenge.progress}%`,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            </View>

            <Text
              style={[
                styles.highlightChallengeProgressText,
                { color: colors.success },
              ]}
            >
              {copy.highlightedChallengeProgress.replace(
                "{{value}}",
                String(highlightedChallenge.progress)
              )}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.panel,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.panelTitle, { color: colors.text }]}>
              {copy.highlightedChallengeEmptyTitle}
            </Text>
            <Text style={[styles.panelText, { color: colors.textSecondary }]}>
              {copy.highlightedChallengeEmptyText}
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.challengeSectionTitle}
        </Text>
        <View style={styles.grid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {activeChallenges}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.challengeActiveLabel}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {completedChallenges}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.challengeCompletedLabel}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {canceledChallenges}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.challengeCanceledLabel}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {isPremium ? `${challengeSuccessRate}%` : "Premium"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.challengeSuccessRateLabel}
            </Text>
          </View>
        </View>

        {!isPremium ? (
          <View
            style={[
              styles.lockedSectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.lockedSectionTitle, { color: colors.text }]}>
              {copy.advancedMetricsTitle}
            </Text>
            <Text
              style={[styles.lockedSectionText, { color: colors.textSecondary }]}
            >
              {copy.advancedMetricsText}
            </Text>
            <Pressable
              style={[
                styles.upgradeButtonSmall,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={goToPremium}
            >
              <Text
                style={[
                  styles.upgradeButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {copy.premiumButton}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.panelTitle, { color: colors.text }]}>
            {completedChallenges > 0
              ? copy.challengePanelSuccess
              : copy.challengePanelEmpty}
          </Text>
          <Text style={[styles.panelText, { color: colors.textSecondary }]}>
            {copy.challengePanelText}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.achievementsTitle}
        </Text>
        <View
          style={[
            styles.achievementSummary,
            {
              backgroundColor: colors.accentSoft,
              borderColor: colors.accentBorder,
            },
          ]}
        >
          <Text
            style={[styles.achievementSummaryText, { color: colors.accent }]}
          >
            {copy.achievementsProgress
              .replace("{{unlocked}}", String(unlockedCount))
              .replace("{{available}}", String(availableCount))}
          </Text>
        </View>

        <View style={styles.achievementGrid}>
          {visibleAchievements.map((achievement) => {
            const lockedByPlan = achievement.isPremium && !isPremium;
            const unlocked = !lockedByPlan && achievement.unlocked;

            return (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  unlocked && {
                    borderColor: colors.success,
                    backgroundColor: colors.accentSoft,
                  },
                  lockedByPlan && {
                    borderColor: colors.warning,
                    backgroundColor: colors.surfaceAlt,
                  },
                ]}
              >
                <View
                  style={[
                    styles.achievementIconWrap,
                    {
                      backgroundColor: unlocked
                        ? colors.successSoft
                        : lockedByPlan
                          ? colors.warningSoft
                          : colors.surfaceAlt,
                      borderColor: unlocked
                        ? colors.success
                        : lockedByPlan
                          ? colors.warning
                          : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      getAchievementIconName(achievement.id)
                    }
                    size={18}
                    color={
                      lockedByPlan
                        ? colors.warning
                        : unlocked
                          ? colors.success
                          : colors.accent
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.achievementTitle,
                    { color: colors.text },
                    lockedByPlan && { color: colors.warning },
                  ]}
                >
                  {achievement.title}
                </Text>

                <Text
                  style={[
                    styles.achievementDescription,
                    { color: colors.textSecondary },
                    lockedByPlan && { color: colors.warning },
                  ]}
                >
                  {lockedByPlan
                    ? copy.lockedDescription
                    : achievement.description}
                </Text>

                <Text
                  style={[
                    styles.achievementStatus,
                    { color: colors.textMuted },
                    unlocked && { color: colors.success },
                    lockedByPlan && { color: colors.warning },
                  ]}
                  >
                  {lockedByPlan
                    ? copy.statusPremium
                    : unlocked
                      ? copy.statusUnlocked
                      : copy.statusInProgress}
                </Text>
              </View>
            );
          })}
        </View>

        {!isPremium ? (
          <View
            style={[
              styles.lockedSectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.lockedSectionTitle, { color: colors.text }]}>
              {copy.premiumSectionTitle}
            </Text>
            <Text
              style={[styles.lockedSectionText, { color: colors.textSecondary }]}
            >
              {copy.premiumSectionText}
            </Text>
            <Pressable
              style={[
                styles.upgradeButtonSmall,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={goToPremium}
            >
              <Text
                style={[
                  styles.upgradeButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {copy.premiumButton}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.highlightedHabits}
        </Text>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {featuredHabits.length === 0 ? (
            <Text style={[styles.panelText, { color: colors.textSecondary }]}>
              {copy.featuredHabitsEmpty}
            </Text>
          ) : (
            featuredHabits.map((habit, index) => {
              const habitCurrentStreak = getHabitCurrentStreak(habit);
              const habitBestStreak = getHabitBestStreak(habit);

              return (
                <View
                  key={habit.id}
                  style={[
                    styles.featuredRow,
                    index < featuredHabits.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.rankCircle,
                      { backgroundColor: colors.accentSoft },
                    ]}
                  >
                    <Text
                      style={[styles.rankCircleText, { color: colors.accent }]}
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <View style={styles.featuredContent}>
                    <Text style={[styles.featuredTitle, { color: colors.text }]}>
                      {habit.title}
                    </Text>
                    <Text
                      style={[styles.featuredMeta, { color: colors.textMuted }]}
                    >
                      {copy.featuredHabitMeta
                        .replace("{{total}}", String(habit.totalDone))
                        .replace("{{current}}", String(habitCurrentStreak))
                        .replace("{{best}}", String(habitBestStreak))}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {!isPremium ? (
          <View
            style={[
              styles.bottomConversionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text style={[styles.bottomConversionTitle, { color: colors.text }]}>
              {copy.bottomTitle}
            </Text>
            <Text
              style={[styles.bottomConversionText, { color: colors.textSecondary }]}
            >
              {copy.bottomText}
            </Text>
            <Pressable
              style={[
                styles.upgradeButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                  marginTop: 12,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={goToPremium}
            >
              <Text
                style={[
                  styles.upgradeButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {copy.bottomButton}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <AchievementUnlockedModal
        visible={!!achievementPopup}
        icon={achievementPopup?.icon ?? "🏆"}
        title={achievementPopup?.title ?? ""}
        description={achievementPopup?.description ?? ""}
        onClose={handleCloseAchievementPopup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 14,
    paddingTop: 8,
    paddingBottom: 120,
  },

  executiveCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },

  executiveBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },

  executiveBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  inlineIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  executiveTitle: {
    fontSize: 18,
    fontWeight: "900",
  },

  executiveDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  executiveMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  executiveMiniCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  executiveMiniValue: {
    fontSize: 24,
    fontWeight: "900",
  },

  executiveMiniLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  upgradeCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
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

  upgradeButtonSmall: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },

  upgradeButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },

  planCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },

  planBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },

  planBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  planText: {
    fontSize: 13,
    lineHeight: 18,
  },

  quoteCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },

  quoteTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },

  quoteLabel: {
    fontSize: 12,
    fontWeight: "800",
  },

  quotePeriodBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  quotePeriodBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  quoteText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },

  quoteSource: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 10,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    width: "48.5%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  statCardWide: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  statValue: {
    fontSize: 30,
    fontWeight: "900",
  },

  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  helperText: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },

  inlineUpgradeButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },

  inlineUpgradeButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "900",
  },

  bigCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },

  bigCardLabel: {
    fontSize: 12,
    fontWeight: "800",
  },

  bigCardValue: {
    fontSize: 36,
    fontWeight: "900",
    marginTop: 8,
  },

  bigCardText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  panel: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },

  panelTitle: {
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 6,
  },

  panelText: {
    fontSize: 13,
    lineHeight: 18,
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  dayInfo: {
    width: 66,
  },

  dayDate: {
    fontWeight: "700",
    fontSize: 12,
  },

  dayMeta: {
    fontSize: 11,
    marginTop: 2,
  },

  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: 10,
    borderWidth: 1,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  dayPercent: {
    width: 34,
    textAlign: "right",
    fontWeight: "700",
    fontSize: 12,
  },

  calendarCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },

  calendarHeader: {
    marginBottom: 12,
  },

  calendarMonth: {
    fontSize: 16,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  calendarMonthMeta: {
    fontSize: 12,
    marginTop: 4,
  },

  calendarWeekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  calendarWeekDay: {
    width: "13.5%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
  },

  calendarGrid: {
    gap: 8,
  },

  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  calendarCell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarCellEmpty: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },

  calendarCellText: {
    fontSize: 12,
    fontWeight: "800",
  },

  calendarCellTextEmpty: {
    color: "transparent",
  },

  calendarLegend: {
    marginTop: 14,
    gap: 8,
  },

  calendarLegendItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  calendarLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 8,
  },

  calendarLegendText: {
    fontSize: 12,
  },

  highlightChallengeCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  highlightChallengeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  highlightChallengeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  highlightChallengeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  highlightChallengeDay: {
    fontSize: 12,
    fontWeight: "700",
  },

  highlightChallengeTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },

  highlightChallengeMeta: {
    fontSize: 12,
    marginTop: 6,
  },

  highlightChallengeTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
    borderWidth: 1,
  },

  highlightChallengeFill: {
    height: "100%",
    borderRadius: 999,
  },

  highlightChallengeProgressText: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },

  lockedSectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  lockedSectionTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  lockedSectionText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  achievementSummary: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  achievementSummaryText: {
    fontSize: 13,
    fontWeight: "800",
  },

  achievementGrid: {
    gap: 10,
    marginBottom: 16,
  },

  achievementCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  achievementIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  achievementTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  achievementDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  achievementStatus: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: "800",
  },

  featuredRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  rankCircleText: {
    fontWeight: "800",
    fontSize: 12,
  },

  featuredContent: {
    flex: 1,
  },

  featuredTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  featuredMeta: {
    fontSize: 12,
    marginTop: 4,
  },

  bottomConversionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  bottomConversionTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  bottomConversionText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
