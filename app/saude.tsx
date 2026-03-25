import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import GuidedTourOverlay from "../components/GuidedTourOverlay";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "./utils/appTheme";
import { AI_PLAN_KEY, normalizeLifeJourneyPlan } from "./utils/lifeJourney";
import {
  completeJourneyModuleTour,
  readJourneyModuleTourState,
  skipJourneyModuleTour,
} from "./utils/journeyTour";
import { useAppLanguage } from "./utils/languageContext";
import { formatDateByLanguage } from "./utils/locale";

type SubscriptionPlan = "free" | "premium";
type MoodType = "Muito mal" | "Mal" | "Neutro" | "Bem" | "Excelente";
type EnergyType = "Muito baixa" | "Baixa" | "Média" | "Boa" | "Alta";

type HealthEntry = {
  id: string;
  dateKey: string;
  waterCups: number;
  sleepHours: number;
  exerciseMinutes: number;
  weight: number | null;
  mood: MoodType;
  energy: EnergyType;
  notes: string;
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

const HEALTH_KEY = "@vida_em_ordem_health_v1";
const MEDICATIONS_KEY = "@vida_em_ordem_health_medications_v1";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

const FREE_MAX_ACTIVE_MEDICATIONS = 3;
const FREE_HISTORY_PREVIEW = 5;

const MOOD_OPTIONS: MoodType[] = [
  "Muito mal",
  "Mal",
  "Neutro",
  "Bem",
  "Excelente",
];

const ENERGY_OPTIONS: EnergyType[] = [
  "Muito baixa",
  "Baixa",
  "Média",
  "Boa",
  "Alta",
];

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMoodEmoji(mood: MoodType) {
  switch (mood) {
    case "Muito mal":
      return "😞";
    case "Mal":
      return "😕";
    case "Neutro":
      return "😐";
    case "Bem":
      return "🙂";
    case "Excelente":
      return "😁";
    default:
      return "🙂";
  }
}

function getEnergyEmoji(energy: EnergyType) {
  switch (energy) {
    case "Muito baixa":
      return "🔋";
    case "Baixa":
      return "🪫";
    case "Média":
      return "⚡";
    case "Boa":
      return "⚡⚡";
    case "Alta":
      return "⚡⚡⚡";
    default:
      return "⚡";
  }
}

function getMoodScore(mood: MoodType) {
  switch (mood) {
    case "Muito mal":
      return 1;
    case "Mal":
      return 2;
    case "Neutro":
      return 3;
    case "Bem":
      return 4;
    case "Excelente":
      return 5;
    default:
      return 3;
  }
}

function getEnergyScore(energy: EnergyType) {
  switch (energy) {
    case "Muito baixa":
      return 1;
    case "Baixa":
      return 2;
    case "Média":
      return 3;
    case "Boa":
      return 4;
    case "Alta":
      return 5;
    default:
      return 3;
  }
}

function getMoodLabel(mood: MoodType, language: keyof typeof healthUiCopyByLanguage) {
  return healthUiCopyByLanguage[language].moodOptions[mood];
}

function getEnergyLabel(
  energy: EnergyType,
  language: keyof typeof healthUiCopyByLanguage
) {
  return healthUiCopyByLanguage[language].energyOptions[energy];
}

function getLast7DateKeys() {
  const out: string[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(todayKey(d));
  }

  return out;
}

const moduleCopyByLanguage = {
  pt: {
    headerTitle: "Saúde",
    headerSubtitle:
      "Registre seu corpo, energia, bem-estar e acompanhe seus medicamentos.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Recurso Premium ✨",
    premiumAlertText: "{{feature}} está disponível no plano Premium.",
    premiumAlertCancel: "Agora não",
    premiumAlertButton: "Ver Premium",
    tourStep: "Tour do módulo • {{current}}/{{total}}",
    skipTour: "Pular tour",
    next: "Próximo",
    finish: "Finalizar tour",
    tour1Title: "Seu check-in começa aqui",
    tour1Description:
      "O passo mais importante deste módulo é registrar água, sono, exercício e como você está se sentindo no dia.",
    tour2Title: "Organize seus cuidados",
    tour2Description:
      "Na parte de medicamentos você monta sua rotina de cuidado e o app usa isso para validar a sua jornada de saúde.",
    tour3Title: "Observe a sua evolução",
    tour3Description:
      "Resumo semanal e histórico mostram se sua energia está melhorando de verdade ao longo dos dias.",
  },
  en: {
    headerTitle: "Health",
    headerSubtitle:
      "Track your body, energy, wellbeing, and keep your medications organized.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Premium feature ✨",
    premiumAlertText: "{{feature}} is available on the Premium plan.",
    premiumAlertCancel: "Not now",
    premiumAlertButton: "See Premium",
    tourStep: "Module tour • {{current}}/{{total}}",
    skipTour: "Skip tour",
    next: "Next",
    finish: "Finish tour",
    tour1Title: "Your check-in starts here",
    tour1Description:
      "The most important step here is logging water, sleep, exercise, and how you feel during the day.",
    tour2Title: "Organize your care",
    tour2Description:
      "In the medications section you build your care routine, and the app uses it to validate your health journey.",
    tour3Title: "Watch your progress",
    tour3Description:
      "Weekly summary and history show whether your energy is really improving over time.",
  },
  es: {
    headerTitle: "Salud",
    headerSubtitle:
      "Registra tu cuerpo, energía, bienestar y acompaña tus medicamentos.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Función Premium ✨",
    premiumAlertText: "{{feature}} está disponible en el plan Premium.",
    premiumAlertCancel: "Ahora no",
    premiumAlertButton: "Ver Premium",
    tourStep: "Tour del módulo • {{current}}/{{total}}",
    skipTour: "Saltar tour",
    next: "Siguiente",
    finish: "Finalizar tour",
    tour1Title: "Tu check-in empieza aquí",
    tour1Description:
      "El paso más importante aquí es registrar agua, sueño, ejercicio y cómo te sientes durante el día.",
    tour2Title: "Organiza tus cuidados",
    tour2Description:
      "En la parte de medicamentos construyes tu rutina de cuidado y la app usa eso para validar tu jornada de salud.",
    tour3Title: "Observa tu evolución",
    tour3Description:
      "El resumen semanal y el historial muestran si tu energía realmente está mejorando con los días.",
  },
  fr: {
    headerTitle: "Santé",
    headerSubtitle:
      "Enregistrez votre corps, votre énergie, votre bien-être et suivez vos médicaments.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Fonction Premium ✨",
    premiumAlertText: "{{feature}} est disponible dans le plan Premium.",
    premiumAlertCancel: "Pas maintenant",
    premiumAlertButton: "Voir Premium",
    tourStep: "Tour du module • {{current}}/{{total}}",
    skipTour: "Passer le tour",
    next: "Suivant",
    finish: "Terminer le tour",
    tour1Title: "Votre check-in commence ici",
    tour1Description:
      "L'étape la plus importante ici est d'enregistrer l'eau, le sommeil, l'exercice et la façon dont vous vous sentez dans la journée.",
    tour2Title: "Organisez vos soins",
    tour2Description:
      "Dans la partie médicaments, vous construisez votre routine de soin et l'app l'utilise pour valider votre parcours santé.",
    tour3Title: "Observez votre évolution",
    tour3Description:
      "Le résumé hebdomadaire et l'historique montrent si votre énergie s'améliore vraiment au fil des jours.",
  },
  it: {
    headerTitle: "Salute",
    headerSubtitle:
      "Registra il tuo corpo, la tua energia, il tuo benessere e accompagna i tuoi farmaci.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Funzione Premium ✨",
    premiumAlertText: "{{feature}} è disponibile nel piano Premium.",
    premiumAlertCancel: "Non ora",
    premiumAlertButton: "Vedi Premium",
    tourStep: "Tour del modulo • {{current}}/{{total}}",
    skipTour: "Salta tour",
    next: "Avanti",
    finish: "Termina tour",
    tour1Title: "Il tuo check-in inizia qui",
    tour1Description:
      "Il passo più importante qui è registrare acqua, sonno, esercizio e come ti senti durante la giornata.",
    tour2Title: "Organizza le tue cure",
    tour2Description:
      "Nella parte dei farmaci costruisci la tua routine di cura e l'app la usa per validare il tuo percorso salute.",
    tour3Title: "Osserva la tua evoluzione",
    tour3Description:
      "Il riepilogo settimanale e lo storico mostrano se la tua energia sta davvero migliorando con i giorni.",
  },
} as const;

const healthUiCopyByLanguage = {
  pt: {
    errorTitle: "Erro",
    attentionTitle: "Atenção",
    cancel: "Cancelar",
    remove: "Remover",
    saveHealthError: "Não foi possível salvar os dados de saúde.",
    saveMedicationsError: "Não foi possível salvar os medicamentos.",
    waterValidation: "Informe quantos copos de água você bebeu.",
    sleepValidation: "Informe quantas horas você dormiu.",
    exerciseValidation: "Informe os minutos de exercício.",
    weightValidation: "Informe um peso válido.",
    healthSavedTitle: "Saúde registrada",
    healthSavedText: "Seu check-in de saúde foi salvo.",
    removeEntryTitle: "Remover registro",
    removeEntryText: "Deseja remover este registro de saúde?",
    freeMedicationFeature: `Mais de ${FREE_MAX_ACTIVE_MEDICATIONS} medicamentos ativos`,
    medicationNameRequired: "Digite o nome do medicamento.",
    dosageRequired: "Digite a dosagem.",
    timeRequired: "Digite o horário. Ex.: 08:00",
    summaryWaterToday: "copos hoje",
    summarySleepToday: "sono hoje",
    summaryExerciseToday: "exercício hoje",
    summaryLastWeight: "último peso",
    editCheckin: "Editar check-in de hoje",
    createCheckin: "Fazer check-in de hoje",
    medicationsTitle: "Medicamentos",
    dayControlTitle: "Controle do dia",
    activeSummary(count: number, taken: number, isPremium: boolean) {
      return `Ativos: ${count} • Tomados hoje: ${taken}${
        isPremium ? "" : ` • Free: até ${FREE_MAX_ACTIVE_MEDICATIONS} ativos`
      }`;
    },
    addMedication: "Adicionar medicamento",
    noActiveMedicationTitle: "Nenhum medicamento ativo",
    noActiveMedicationText:
      "Cadastre seus medicamentos para ter mais controle da rotina.",
    takenToday: "Tomado hoje",
    pendingToday: "Pendente hoje",
    unmark: "Desmarcar",
    markTaken: "Marcar como tomado",
    deactivate: "Desativar",
    inactiveMedicationsTitle: "Medicamentos inativos",
    reactivate: "Reativar",
    weeklySummaryTitle: "Resumo da semana",
    premiumWeeklyTitle: "Resumo semanal avançado no Premium",
    premiumWeeklyText:
      "Veja médias completas de água, sono, exercício, humor e energia ao longo da semana.",
    unlock: "Desbloquear",
    avgWater: "água média",
    avgSleep: "sono médio",
    avgExercise: "exercício médio",
    daysTracked: "dias registrados",
    avgMoodLabel: "Humor médio",
    avgEnergyLabel: "Energia média",
    weeklyChartTitle: "Gráfico semanal",
    premiumChartTitle: "Gráfico completo no Premium",
    premiumChartText:
      "Acompanhe visualmente sua evolução de água, sono, exercício e energia.",
    seePremium: "Ver Premium",
    historyTitle: "Histórico",
    emptyHistoryTitle: "Nenhum check-in ainda",
    emptyHistoryText:
      "Seu histórico de saúde aparece aqui assim que você salvar os primeiros registros.",
    historyWater: "Água",
    historySleep: "Sono",
    historyExercise: "Exercício",
    historyWeight: "Peso",
    dailyCheckinTitle: "Seu check-in diário",
    waterPlaceholder: "Copos de água",
    sleepPlaceholder: "Horas de sono",
    exercisePlaceholder: "Minutos de exercício",
    weightPlaceholder: "Peso (opcional)",
    moodLabel: "Humor",
    energyLabel: "Energia",
    notesPlaceholder: "Observações (opcional)",
    saveCheckin: "Salvar check-in",
    newMedicationTitle: "Novo medicamento",
    medicationNamePlaceholder: "Nome do medicamento",
    medicationDosagePlaceholder: "Dosagem",
    medicationTimePlaceholder: "Horário (Ex.: 08:00)",
    saveMedication: "Salvar medicamento",
    moodOptions: {
      "Muito mal": "Muito mal",
      Mal: "Mal",
      Neutro: "Neutro",
      Bem: "Bem",
      Excelente: "Excelente",
    } as Record<MoodType, string>,
    energyOptions: {
      "Muito baixa": "Muito baixa",
      Baixa: "Baixa",
      "Média": "Média",
      Boa: "Boa",
      Alta: "Alta",
    } as Record<EnergyType, string>,
  },
  en: {
    errorTitle: "Error",
    attentionTitle: "Attention",
    cancel: "Cancel",
    remove: "Remove",
    saveHealthError: "Could not save the health data.",
    saveMedicationsError: "Could not save the medications.",
    waterValidation: "Enter how many glasses of water you drank.",
    sleepValidation: "Enter how many hours you slept.",
    exerciseValidation: "Enter the exercise minutes.",
    weightValidation: "Enter a valid weight.",
    healthSavedTitle: "Health saved",
    healthSavedText: "Your health check-in has been saved.",
    removeEntryTitle: "Remove record",
    removeEntryText: "Do you want to remove this health record?",
    freeMedicationFeature: `More than ${FREE_MAX_ACTIVE_MEDICATIONS} active medications`,
    medicationNameRequired: "Enter the medication name.",
    dosageRequired: "Enter the dosage.",
    timeRequired: "Enter the time. Ex: 08:00",
    summaryWaterToday: "water today",
    summarySleepToday: "sleep today",
    summaryExerciseToday: "exercise today",
    summaryLastWeight: "last weight",
    editCheckin: "Edit today's check-in",
    createCheckin: "Log today's check-in",
    medicationsTitle: "Medications",
    dayControlTitle: "Today's control",
    activeSummary(count: number, taken: number, isPremium: boolean) {
      return `Active: ${count} • Taken today: ${taken}${
        isPremium ? "" : ` • Free: up to ${FREE_MAX_ACTIVE_MEDICATIONS} active`
      }`;
    },
    addMedication: "Add medication",
    noActiveMedicationTitle: "No active medications",
    noActiveMedicationText:
      "Register your medications to have more control over your routine.",
    takenToday: "Taken today",
    pendingToday: "Pending today",
    unmark: "Unmark",
    markTaken: "Mark as taken",
    deactivate: "Deactivate",
    inactiveMedicationsTitle: "Inactive medications",
    reactivate: "Reactivate",
    weeklySummaryTitle: "Weekly summary",
    premiumWeeklyTitle: "Advanced weekly summary in Premium",
    premiumWeeklyText:
      "See complete averages for water, sleep, exercise, mood, and energy throughout the week.",
    unlock: "Unlock",
    avgWater: "avg water",
    avgSleep: "avg sleep",
    avgExercise: "avg exercise",
    daysTracked: "tracked days",
    avgMoodLabel: "Average mood",
    avgEnergyLabel: "Average energy",
    weeklyChartTitle: "Weekly chart",
    premiumChartTitle: "Full chart in Premium",
    premiumChartText:
      "Track your progress visually across water, sleep, exercise, and energy.",
    seePremium: "See Premium",
    historyTitle: "History",
    emptyHistoryTitle: "No check-ins yet",
    emptyHistoryText:
      "Your health history will appear here as soon as you save your first records.",
    historyWater: "Water",
    historySleep: "Sleep",
    historyExercise: "Exercise",
    historyWeight: "Weight",
    dailyCheckinTitle: "Your daily check-in",
    waterPlaceholder: "Glasses of water",
    sleepPlaceholder: "Hours of sleep",
    exercisePlaceholder: "Exercise minutes",
    weightPlaceholder: "Weight (optional)",
    moodLabel: "Mood",
    energyLabel: "Energy",
    notesPlaceholder: "Notes (optional)",
    saveCheckin: "Save check-in",
    newMedicationTitle: "New medication",
    medicationNamePlaceholder: "Medication name",
    medicationDosagePlaceholder: "Dosage",
    medicationTimePlaceholder: "Time (Ex: 08:00)",
    saveMedication: "Save medication",
    moodOptions: {
      "Muito mal": "Very bad",
      Mal: "Bad",
      Neutro: "Neutral",
      Bem: "Good",
      Excelente: "Excellent",
    } as Record<MoodType, string>,
    energyOptions: {
      "Muito baixa": "Very low",
      Baixa: "Low",
      "Média": "Medium",
      Boa: "Good",
      Alta: "High",
    } as Record<EnergyType, string>,
  },
  es: {
    errorTitle: "Error",
    attentionTitle: "Atención",
    cancel: "Cancelar",
    remove: "Eliminar",
    saveHealthError: "No fue posible guardar los datos de salud.",
    saveMedicationsError: "No fue posible guardar los medicamentos.",
    waterValidation: "Indica cuántos vasos de agua bebiste.",
    sleepValidation: "Indica cuántas horas dormiste.",
    exerciseValidation: "Indica los minutos de ejercicio.",
    weightValidation: "Indica un peso válido.",
    healthSavedTitle: "Salud guardada",
    healthSavedText: "Tu check-in de salud fue guardado.",
    removeEntryTitle: "Eliminar registro",
    removeEntryText: "¿Deseas eliminar este registro de salud?",
    freeMedicationFeature: `Más de ${FREE_MAX_ACTIVE_MEDICATIONS} medicamentos activos`,
    medicationNameRequired: "Escribe el nombre del medicamento.",
    dosageRequired: "Escribe la dosis.",
    timeRequired: "Escribe el horario. Ej.: 08:00",
    summaryWaterToday: "vasos hoy",
    summarySleepToday: "sueño hoy",
    summaryExerciseToday: "ejercicio hoy",
    summaryLastWeight: "último peso",
    editCheckin: "Editar check-in de hoy",
    createCheckin: "Hacer check-in de hoy",
    medicationsTitle: "Medicamentos",
    dayControlTitle: "Control del día",
    activeSummary(count: number, taken: number, isPremium: boolean) {
      return `Activos: ${count} • Tomados hoy: ${taken}${
        isPremium ? "" : ` • Free: hasta ${FREE_MAX_ACTIVE_MEDICATIONS} activos`
      }`;
    },
    addMedication: "Añadir medicamento",
    noActiveMedicationTitle: "Ningún medicamento activo",
    noActiveMedicationText:
      "Registra tus medicamentos para tener más control de la rutina.",
    takenToday: "Tomado hoy",
    pendingToday: "Pendiente hoy",
    unmark: "Desmarcar",
    markTaken: "Marcar como tomado",
    deactivate: "Desactivar",
    inactiveMedicationsTitle: "Medicamentos inactivos",
    reactivate: "Reactivar",
    weeklySummaryTitle: "Resumen semanal",
    premiumWeeklyTitle: "Resumen semanal avanzado en Premium",
    premiumWeeklyText:
      "Mira promedios completos de agua, sueño, ejercicio, humor y energía durante la semana.",
    unlock: "Desbloquear",
    avgWater: "agua media",
    avgSleep: "sueño medio",
    avgExercise: "ejercicio medio",
    daysTracked: "días registrados",
    avgMoodLabel: "Humor medio",
    avgEnergyLabel: "Energía media",
    weeklyChartTitle: "Gráfico semanal",
    premiumChartTitle: "Gráfico completo en Premium",
    premiumChartText:
      "Sigue visualmente tu evolución de agua, sueño, ejercicio y energía.",
    seePremium: "Ver Premium",
    historyTitle: "Historial",
    emptyHistoryTitle: "Todavía no hay check-ins",
    emptyHistoryText:
      "Tu historial de salud aparecerá aquí en cuanto guardes tus primeros registros.",
    historyWater: "Agua",
    historySleep: "Sueño",
    historyExercise: "Ejercicio",
    historyWeight: "Peso",
    dailyCheckinTitle: "Tu check-in diario",
    waterPlaceholder: "Vasos de agua",
    sleepPlaceholder: "Horas de sueño",
    exercisePlaceholder: "Minutos de ejercicio",
    weightPlaceholder: "Peso (opcional)",
    moodLabel: "Humor",
    energyLabel: "Energía",
    notesPlaceholder: "Observaciones (opcional)",
    saveCheckin: "Guardar check-in",
    newMedicationTitle: "Nuevo medicamento",
    medicationNamePlaceholder: "Nombre del medicamento",
    medicationDosagePlaceholder: "Dosis",
    medicationTimePlaceholder: "Horario (Ej.: 08:00)",
    saveMedication: "Guardar medicamento",
    moodOptions: {
      "Muito mal": "Muy mal",
      Mal: "Mal",
      Neutro: "Neutral",
      Bem: "Bien",
      Excelente: "Excelente",
    } as Record<MoodType, string>,
    energyOptions: {
      "Muito baixa": "Muy baja",
      Baixa: "Baja",
      "Média": "Media",
      Boa: "Buena",
      Alta: "Alta",
    } as Record<EnergyType, string>,
  },
  fr: {
    errorTitle: "Erreur",
    attentionTitle: "Attention",
    cancel: "Annuler",
    remove: "Supprimer",
    saveHealthError: "Impossible d'enregistrer les données de santé.",
    saveMedicationsError: "Impossible d'enregistrer les médicaments.",
    waterValidation: "Indiquez combien de verres d'eau vous avez bus.",
    sleepValidation: "Indiquez combien d'heures vous avez dormi.",
    exerciseValidation: "Indiquez les minutes d'exercice.",
    weightValidation: "Indiquez un poids valide.",
    healthSavedTitle: "Santé enregistrée",
    healthSavedText: "Votre check-in santé a été enregistré.",
    removeEntryTitle: "Supprimer l'enregistrement",
    removeEntryText: "Voulez-vous supprimer cet enregistrement de santé ?",
    freeMedicationFeature: `Plus de ${FREE_MAX_ACTIVE_MEDICATIONS} médicaments actifs`,
    medicationNameRequired: "Saisissez le nom du médicament.",
    dosageRequired: "Saisissez le dosage.",
    timeRequired: "Saisissez l'heure. Ex. : 08:00",
    summaryWaterToday: "eau aujourd'hui",
    summarySleepToday: "sommeil aujourd'hui",
    summaryExerciseToday: "exercice aujourd'hui",
    summaryLastWeight: "dernier poids",
    editCheckin: "Modifier le check-in du jour",
    createCheckin: "Faire le check-in du jour",
    medicationsTitle: "Médicaments",
    dayControlTitle: "Suivi du jour",
    activeSummary(count: number, taken: number, isPremium: boolean) {
      return `Actifs : ${count} • Pris aujourd'hui : ${taken}${
        isPremium ? "" : ` • Free : jusqu'à ${FREE_MAX_ACTIVE_MEDICATIONS} actifs`
      }`;
    },
    addMedication: "Ajouter un médicament",
    noActiveMedicationTitle: "Aucun médicament actif",
    noActiveMedicationText:
      "Enregistrez vos médicaments pour mieux contrôler votre routine.",
    takenToday: "Pris aujourd'hui",
    pendingToday: "En attente aujourd'hui",
    unmark: "Décocher",
    markTaken: "Marquer comme pris",
    deactivate: "Désactiver",
    inactiveMedicationsTitle: "Médicaments inactifs",
    reactivate: "Réactiver",
    weeklySummaryTitle: "Résumé de la semaine",
    premiumWeeklyTitle: "Résumé hebdomadaire avancé dans Premium",
    premiumWeeklyText:
      "Consultez les moyennes complètes d'eau, de sommeil, d'exercice, d'humeur et d'énergie sur la semaine.",
    unlock: "Débloquer",
    avgWater: "eau moyenne",
    avgSleep: "sommeil moyen",
    avgExercise: "exercice moyen",
    daysTracked: "jours suivis",
    avgMoodLabel: "Humeur moyenne",
    avgEnergyLabel: "Énergie moyenne",
    weeklyChartTitle: "Graphique hebdomadaire",
    premiumChartTitle: "Graphique complet dans Premium",
    premiumChartText:
      "Suivez visuellement votre évolution en eau, sommeil, exercice et énergie.",
    seePremium: "Voir Premium",
    historyTitle: "Historique",
    emptyHistoryTitle: "Aucun check-in pour le moment",
    emptyHistoryText:
      "Votre historique santé apparaîtra ici dès que vous enregistrerez vos premiers suivis.",
    historyWater: "Eau",
    historySleep: "Sommeil",
    historyExercise: "Exercice",
    historyWeight: "Poids",
    dailyCheckinTitle: "Votre check-in quotidien",
    waterPlaceholder: "Verres d'eau",
    sleepPlaceholder: "Heures de sommeil",
    exercisePlaceholder: "Minutes d'exercice",
    weightPlaceholder: "Poids (optionnel)",
    moodLabel: "Humeur",
    energyLabel: "Énergie",
    notesPlaceholder: "Observations (optionnel)",
    saveCheckin: "Enregistrer le check-in",
    newMedicationTitle: "Nouveau médicament",
    medicationNamePlaceholder: "Nom du médicament",
    medicationDosagePlaceholder: "Dosage",
    medicationTimePlaceholder: "Heure (Ex. : 08:00)",
    saveMedication: "Enregistrer le médicament",
    moodOptions: {
      "Muito mal": "Très mal",
      Mal: "Mal",
      Neutro: "Neutre",
      Bem: "Bien",
      Excelente: "Excellent",
    } as Record<MoodType, string>,
    energyOptions: {
      "Muito baixa": "Très basse",
      Baixa: "Basse",
      "Média": "Moyenne",
      Boa: "Bonne",
      Alta: "Haute",
    } as Record<EnergyType, string>,
  },
  it: {
    errorTitle: "Errore",
    attentionTitle: "Attenzione",
    cancel: "Annulla",
    remove: "Rimuovi",
    saveHealthError: "Non è stato possibile salvare i dati salute.",
    saveMedicationsError: "Non è stato possibile salvare i farmaci.",
    waterValidation: "Indica quanti bicchieri d'acqua hai bevuto.",
    sleepValidation: "Indica quante ore hai dormito.",
    exerciseValidation: "Indica i minuti di esercizio.",
    weightValidation: "Indica un peso valido.",
    healthSavedTitle: "Salute salvata",
    healthSavedText: "Il tuo check-in salute è stato salvato.",
    removeEntryTitle: "Rimuovi registrazione",
    removeEntryText: "Vuoi rimuovere questa registrazione salute?",
    freeMedicationFeature: `Più di ${FREE_MAX_ACTIVE_MEDICATIONS} farmaci attivi`,
    medicationNameRequired: "Inserisci il nome del farmaco.",
    dosageRequired: "Inserisci il dosaggio.",
    timeRequired: "Inserisci l'orario. Es.: 08:00",
    summaryWaterToday: "acqua oggi",
    summarySleepToday: "sonno oggi",
    summaryExerciseToday: "esercizio oggi",
    summaryLastWeight: "ultimo peso",
    editCheckin: "Modifica il check-in di oggi",
    createCheckin: "Fai il check-in di oggi",
    medicationsTitle: "Farmaci",
    dayControlTitle: "Controllo del giorno",
    activeSummary(count: number, taken: number, isPremium: boolean) {
      return `Attivi: ${count} • Presi oggi: ${taken}${
        isPremium ? "" : ` • Free: fino a ${FREE_MAX_ACTIVE_MEDICATIONS} attivi`
      }`;
    },
    addMedication: "Aggiungi farmaco",
    noActiveMedicationTitle: "Nessun farmaco attivo",
    noActiveMedicationText:
      "Registra i tuoi farmaci per avere più controllo sulla tua routine.",
    takenToday: "Preso oggi",
    pendingToday: "In sospeso oggi",
    unmark: "Deseleziona",
    markTaken: "Segna come preso",
    deactivate: "Disattiva",
    inactiveMedicationsTitle: "Farmaci inattivi",
    reactivate: "Riattiva",
    weeklySummaryTitle: "Riepilogo della settimana",
    premiumWeeklyTitle: "Riepilogo settimanale avanzato nel Premium",
    premiumWeeklyText:
      "Vedi medie complete di acqua, sonno, esercizio, umore ed energia durante la settimana.",
    unlock: "Sblocca",
    avgWater: "acqua media",
    avgSleep: "sonno medio",
    avgExercise: "esercizio medio",
    daysTracked: "giorni registrati",
    avgMoodLabel: "Umore medio",
    avgEnergyLabel: "Energia media",
    weeklyChartTitle: "Grafico settimanale",
    premiumChartTitle: "Grafico completo nel Premium",
    premiumChartText:
      "Segui visivamente la tua evoluzione di acqua, sonno, esercizio ed energia.",
    seePremium: "Vedi Premium",
    historyTitle: "Storico",
    emptyHistoryTitle: "Nessun check-in ancora",
    emptyHistoryText:
      "Il tuo storico salute apparirà qui non appena salverai le prime registrazioni.",
    historyWater: "Acqua",
    historySleep: "Sonno",
    historyExercise: "Esercizio",
    historyWeight: "Peso",
    dailyCheckinTitle: "Il tuo check-in quotidiano",
    waterPlaceholder: "Bicchieri d'acqua",
    sleepPlaceholder: "Ore di sonno",
    exercisePlaceholder: "Minuti di esercizio",
    weightPlaceholder: "Peso (opzionale)",
    moodLabel: "Umore",
    energyLabel: "Energia",
    notesPlaceholder: "Osservazioni (opzionale)",
    saveCheckin: "Salva check-in",
    newMedicationTitle: "Nuovo farmaco",
    medicationNamePlaceholder: "Nome del farmaco",
    medicationDosagePlaceholder: "Dosaggio",
    medicationTimePlaceholder: "Orario (Es.: 08:00)",
    saveMedication: "Salva farmaco",
    moodOptions: {
      "Muito mal": "Molto male",
      Mal: "Male",
      Neutro: "Neutro",
      Bem: "Bene",
      Excelente: "Eccellente",
    } as Record<MoodType, string>,
    energyOptions: {
      "Muito baixa": "Molto bassa",
      Baixa: "Bassa",
      "Média": "Media",
      Boa: "Buona",
      Alta: "Alta",
    } as Record<EnergyType, string>,
  },
} as const;

const healthHistoryPremiumCopyByLanguage = {
  pt: {
    title: "Histórico Premium",
    text: (preview: number) =>
      `No Free você vê ${preview} registros recentes. O Premium libera todo o histórico.`,
  },
  en: {
    title: "Premium history",
    text: (preview: number) =>
      `On Free you see ${preview} recent records. Premium unlocks your full history.`,
  },
  es: {
    title: "Historial Premium",
    text: (preview: number) =>
      `En Free ves ${preview} registros recientes. Premium desbloquea todo tu historial.`,
  },
  fr: {
    title: "Historique Premium",
    text: (preview: number) =>
      `En Free, vous voyez ${preview} entrées récentes. Premium débloque tout votre historique.`,
  },
  it: {
    title: "Storico Premium",
    text: (preview: number) =>
      `Nel Free vedi ${preview} registrazioni recenti. Premium sblocca tutto lo storico.`,
  },
} as const;

export default function SaudeScreen() {
  const { language } = useAppLanguage();
  const copy = useMemo(() => moduleCopyByLanguage[language], [language]);
  const ui = useMemo(() => healthUiCopyByLanguage[language], [language]);
  const formatDate = useCallback(
    (dateKey: string) => formatDateByLanguage(dateKey, language),
    [language]
  );
  const premiumHistoryUi = useMemo(
    () => healthHistoryPremiumCopyByLanguage[language],
    [language]
  );
  const healthTourSteps = useMemo(
    () => [
      {
        icon: "pulse-outline" as const,
        title: copy.tour1Title,
        description: copy.tour1Description,
        primaryLabel: copy.next,
      },
      {
        icon: "medkit-outline" as const,
        title: copy.tour2Title,
        description: copy.tour2Description,
        primaryLabel: copy.next,
      },
      {
        icon: "bar-chart-outline" as const,
        title: copy.tour3Title,
        description: copy.tour3Description,
        primaryLabel: copy.finish,
      },
    ],
    [copy]
  );
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [medicationModalOpen, setMedicationModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showModuleTour, setShowModuleTour] = useState(false);
  const [moduleTourStepIndex, setModuleTourStepIndex] = useState(0);

  const [waterCups, setWaterCups] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [exerciseMinutes, setExerciseMinutes] = useState("");
  const [weight, setWeight] = useState("");
  const [mood, setMood] = useState<MoodType>("Neutro");
  const [energy, setEnergy] = useState<EnergyType>("Média");
  const [notes, setNotes] = useState("");

  const [medicationName, setMedicationName] = useState("");
  const [medicationDosage, setMedicationDosage] = useState("");
  const [medicationTime, setMedicationTime] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");

  const isPremium = plan === "premium";

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const showPremiumAlert = useCallback(
    (feature: string) => {
      Alert.alert(
        copy.premiumAlertTitle,
        copy.premiumAlertText.replace("{{feature}}", feature),
        [
          { text: copy.premiumAlertCancel, style: "cancel" },
          { text: copy.premiumAlertButton, onPress: goToPremium },
        ]
      );
    },
    [copy, goToPremium]
  );

  const loadEntries = useCallback(async () => {
    try {
      const [healthRaw, medsRaw, settingsRaw, planRaw, aiPlanRaw] = await Promise.all([
        AsyncStorage.getItem(HEALTH_KEY),
        AsyncStorage.getItem(MEDICATIONS_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
        AsyncStorage.getItem(AI_PLAN_KEY),
      ]);

      const parsedHealth = healthRaw ? JSON.parse(healthRaw) : [];
      const parsedMeds = medsRaw ? JSON.parse(medsRaw) : [];
      const parsedSettings = settingsRaw
        ? JSON.parse(settingsRaw)
        : DEFAULT_SETTINGS;

      const effectivePlan: SubscriptionPlan =
        planRaw === "premium" || parsedSettings?.plan === "premium"
          ? "premium"
          : "free";

      setEntries(Array.isArray(parsedHealth) ? parsedHealth : []);
      setMedications(Array.isArray(parsedMeds) ? parsedMeds : []);
      setPlan(effectivePlan);
      setSettings({
        theme: parsedSettings?.theme === "light" ? "light" : "dark",
        accentColor:
          parsedSettings?.accentColor || DEFAULT_SETTINGS.accentColor,
        inactivityLockMinutes:
          parsedSettings?.inactivityLockMinutes === 1 ||
          parsedSettings?.inactivityLockMinutes === 3 ||
          parsedSettings?.inactivityLockMinutes === 5 ||
          parsedSettings?.inactivityLockMinutes === 10
            ? parsedSettings.inactivityLockMinutes
            : 0,
        plan: effectivePlan,
      });

      const normalizedPlan = aiPlanRaw
        ? normalizeLifeJourneyPlan(JSON.parse(aiPlanRaw))
        : null;
      const moduleTourState = await readJourneyModuleTourState();

      if (normalizedPlan?.primaryArea === "saude" && !moduleTourState.saude) {
        setModuleTourStepIndex(0);
        setShowModuleTour(true);
      } else {
        setShowModuleTour(false);
      }
    } catch (error) {
      console.log("Erro ao carregar saúde:", error);
      setSettings(DEFAULT_SETTINGS);
      setPlan("free");
      setEntries([]);
      setMedications([]);
      setShowModuleTour(false);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isHydrated) {
        loadEntries();
      }
    }, [isHydrated, loadEntries])
  );

  const saveEntries = useCallback(async (next: HealthEntry[]) => {
    try {
      setEntries(next);
      await AsyncStorage.setItem(HEALTH_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Erro ao salvar saúde:", error);
      Alert.alert(ui.errorTitle, ui.saveHealthError);
    }
  }, [ui]);

  const saveMedications = useCallback(async (next: MedicationItem[]) => {
    try {
      setMedications(next);
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Erro ao salvar medicamentos:", error);
      Alert.alert(ui.errorTitle, ui.saveMedicationsError);
    }
  }, [ui]);

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings.theme, settings.accentColor]
  );
  const activeHealthTourStep = healthTourSteps[moduleTourStepIndex];

  const handleAdvanceModuleTour = useCallback(async () => {
    const lastStep = moduleTourStepIndex >= healthTourSteps.length - 1;

    if (!lastStep) {
      setModuleTourStepIndex((current) => current + 1);
      return;
    }

    await completeJourneyModuleTour("saude");
    setShowModuleTour(false);
  }, [moduleTourStepIndex, healthTourSteps.length]);

  const handleSkipModuleTour = useCallback(async () => {
    await skipJourneyModuleTour("saude");
    setShowModuleTour(false);
  }, []);

  const surfaceMuted =
    (colors as any).surfaceMuted || colors.surfaceAlt || colors.surface;

  const today = useMemo(() => todayKey(), []);

  const todayEntry = useMemo(() => {
    return entries.find((entry) => entry.dateKey === today) ?? null;
  }, [entries, today]);

  const latestWeight = useMemo(() => {
    const valid = [...entries]
      .filter((entry) => entry.weight !== null && entry.weight > 0)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    return valid[0]?.weight ?? null;
  }, [entries]);

  const weeklySummary = useMemo(() => {
    const keys = getLast7DateKeys();
    const weeklyEntries = keys
      .map((key) => entries.find((entry) => entry.dateKey === key) ?? null)
      .filter(Boolean) as HealthEntry[];

    const totalWater = weeklyEntries.reduce(
      (acc, item) => acc + item.waterCups,
      0
    );
    const totalSleep = weeklyEntries.reduce(
      (acc, item) => acc + item.sleepHours,
      0
    );
    const totalExercise = weeklyEntries.reduce(
      (acc, item) => acc + item.exerciseMinutes,
      0
    );
    const totalMood = weeklyEntries.reduce(
      (acc, item) => acc + getMoodScore(item.mood),
      0
    );
    const totalEnergy = weeklyEntries.reduce(
      (acc, item) => acc + getEnergyScore(item.energy),
      0
    );

    const count = weeklyEntries.length || 1;

    return {
      daysTracked: weeklyEntries.length,
      avgWater: Math.round((totalWater / count) * 10) / 10,
      avgSleep: Math.round((totalSleep / count) * 10) / 10,
      avgExercise: Math.round(totalExercise / count),
      avgMood: Math.round((totalMood / count) * 10) / 10,
      avgEnergy: Math.round((totalEnergy / count) * 10) / 10,
    };
  }, [entries]);

  const weeklyBars = useMemo(() => {
    const keys = getLast7DateKeys();

    return keys.map((key) => {
      const entry = entries.find((item) => item.dateKey === key) ?? null;
      const [, month, day] = key.split("-");

      return {
        id: key,
        label: `${day}/${month}`,
        water: entry ? Math.min(100, Math.round((entry.waterCups / 8) * 100)) : 0,
        sleep: entry ? Math.min(100, Math.round((entry.sleepHours / 8) * 100)) : 0,
        exercise: entry
          ? Math.min(100, Math.round((entry.exerciseMinutes / 60) * 100))
          : 0,
        energy: entry
          ? Math.min(100, Math.round((getEnergyScore(entry.energy) / 5) * 100))
          : 0,
      };
    });
  }, [entries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [entries]);

  const historyEntries = useMemo(() => {
    return isPremium
      ? sortedEntries
      : sortedEntries.slice(0, FREE_HISTORY_PREVIEW);
  }, [isPremium, sortedEntries]);

  const activeMedications = useMemo(() => {
    return medications
      .filter((item) => item.active)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [medications]);

  const inactiveMedications = useMemo(() => {
    return medications
      .filter((item) => !item.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [medications]);

  const takenTodayCount = useMemo(() => {
    return activeMedications.filter((item) =>
      item.takenTodayDates.includes(today)
    ).length;
  }, [activeMedications, today]);

  const saveTodayHealth = useCallback(async () => {
    const parsedWater = Number(waterCups.replace(",", "."));
    const parsedSleep = Number(sleepHours.replace(",", "."));
    const parsedExercise = Number(exerciseMinutes.replace(",", "."));
    const parsedWeight =
      weight.trim() === "" ? null : Number(weight.replace(",", "."));

    if (Number.isNaN(parsedWater) || parsedWater < 0) {
      Alert.alert(ui.attentionTitle, ui.waterValidation);
      return;
    }

    if (Number.isNaN(parsedSleep) || parsedSleep < 0) {
      Alert.alert(ui.attentionTitle, ui.sleepValidation);
      return;
    }

    if (Number.isNaN(parsedExercise) || parsedExercise < 0) {
      Alert.alert(ui.attentionTitle, ui.exerciseValidation);
      return;
    }

    if (
      parsedWeight !== null &&
      (Number.isNaN(parsedWeight) || parsedWeight <= 0)
    ) {
      Alert.alert(ui.attentionTitle, ui.weightValidation);
      return;
    }

    const nextEntry: HealthEntry = {
      id: todayEntry?.id ?? uid(),
      dateKey: today,
      waterCups: parsedWater,
      sleepHours: parsedSleep,
      exerciseMinutes: parsedExercise,
      weight: parsedWeight,
      mood,
      energy,
      notes: notes.trim(),
      createdAt: todayEntry?.createdAt ?? new Date().toISOString(),
    };

    const withoutToday = entries.filter((entry) => entry.dateKey !== today);
    const next = [nextEntry, ...withoutToday];

    await saveEntries(next);
    setModalOpen(false);
    Alert.alert(ui.healthSavedTitle, ui.healthSavedText);
  }, [
    waterCups,
    sleepHours,
    exerciseMinutes,
    weight,
    mood,
    energy,
    notes,
    todayEntry,
    today,
    entries,
    saveEntries,
    ui,
  ]);

  const removeEntry = useCallback(
    async (dateKeyValue: string) => {
      Alert.alert(ui.removeEntryTitle, ui.removeEntryText, [
        { text: ui.cancel, style: "cancel" },
        {
          text: ui.remove,
          style: "destructive",
          onPress: async () => {
            const next = entries.filter((entry) => entry.dateKey !== dateKeyValue);
            await saveEntries(next);
          },
        },
      ]);
    },
    [entries, saveEntries, ui]
  );

  const openModalWithToday = useCallback(() => {
    if (todayEntry) {
      setWaterCups(String(todayEntry.waterCups));
      setSleepHours(String(todayEntry.sleepHours).replace(".", ","));
      setExerciseMinutes(String(todayEntry.exerciseMinutes));
      setWeight(
        todayEntry.weight !== null
          ? String(todayEntry.weight).replace(".", ",")
          : ""
      );
      setMood(todayEntry.mood);
      setEnergy(todayEntry.energy);
      setNotes(todayEntry.notes ?? "");
    } else {
      setWaterCups("");
      setSleepHours("");
      setExerciseMinutes("");
      setWeight("");
      setMood("Neutro");
      setEnergy("Média");
      setNotes("");
    }

    setModalOpen(true);
  }, [todayEntry]);

  const openMedicationModal = useCallback(() => {
    if (!isPremium && activeMedications.length >= FREE_MAX_ACTIVE_MEDICATIONS) {
      showPremiumAlert(ui.freeMedicationFeature);
      return;
    }

    setMedicationName("");
    setMedicationDosage("");
    setMedicationTime("");
    setMedicationNotes("");
    setMedicationModalOpen(true);
  }, [activeMedications.length, isPremium, showPremiumAlert, ui.freeMedicationFeature]);

  const adicionarMedicamento = useCallback(async () => {
    const cleanName = medicationName.trim();
    const cleanDosage = medicationDosage.trim();
    const cleanTime = medicationTime.trim();

    if (!cleanName) {
      Alert.alert(ui.attentionTitle, ui.medicationNameRequired);
      return;
    }

    if (!cleanDosage) {
      Alert.alert(ui.attentionTitle, ui.dosageRequired);
      return;
    }

    if (!cleanTime) {
      Alert.alert(ui.attentionTitle, ui.timeRequired);
      return;
    }

    const nextActiveCount = activeMedications.length + 1;

    if (!isPremium && nextActiveCount > FREE_MAX_ACTIVE_MEDICATIONS) {
      showPremiumAlert(ui.freeMedicationFeature);
      return;
    }

    const newMedication: MedicationItem = {
      id: uid(),
      name: cleanName,
      dosage: cleanDosage,
      time: cleanTime,
      notes: medicationNotes.trim(),
      active: true,
      takenTodayDates: [],
      createdAt: new Date().toISOString(),
    };

    await saveMedications([newMedication, ...medications]);

    setMedicationName("");
    setMedicationDosage("");
    setMedicationTime("");
    setMedicationNotes("");
    setMedicationModalOpen(false);
  }, [
    medicationName,
    medicationDosage,
    medicationTime,
    medicationNotes,
    activeMedications.length,
    isPremium,
    medications,
    saveMedications,
    showPremiumAlert,
    ui,
  ]);

  const toggleMedicationTakenToday = useCallback(
    async (medicationId: string) => {
      const next = medications.map((item) => {
        if (item.id !== medicationId) return item;

        const alreadyTaken = item.takenTodayDates.includes(today);

        return {
          ...item,
          takenTodayDates: alreadyTaken
            ? item.takenTodayDates.filter((date) => date !== today)
            : [today, ...item.takenTodayDates],
        };
      });

      await saveMedications(next);
    },
    [medications, saveMedications, today]
  );

  const toggleMedicationActive = useCallback(
    async (medicationId: string) => {
      const target = medications.find((item) => item.id === medicationId);
      if (!target) return;

      const activating = !target.active;
      const activeCount = medications.filter((item) => item.active).length;

      if (
        activating &&
        !isPremium &&
        activeCount >= FREE_MAX_ACTIVE_MEDICATIONS
      ) {
        showPremiumAlert(ui.freeMedicationFeature);
        return;
      }

      const next = medications.map((item) =>
        item.id === medicationId ? { ...item, active: !item.active } : item
      );

      await saveMedications(next);
    },
    [isPremium, medications, saveMedications, showPremiumAlert, ui.freeMedicationFeature]
  );

  const removeMedication = useCallback(
    async (medicationId: string) => {
      Alert.alert(ui.removeEntryTitle, ui.removeEntryText, [
        { text: ui.cancel, style: "cancel" },
        {
          text: ui.remove,
          style: "destructive",
          onPress: async () => {
            const next = medications.filter((item) => item.id !== medicationId);
            await saveMedications(next);
          },
        },
      ]);
    },
    [medications, saveMedications, ui]
  );

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
          icon="fitness-outline"
          badgeLabel={
            isHydrated ? (isPremium ? copy.planPremium : copy.planFree) : undefined
          }
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={isHydrated ? goToPremium : undefined}
        />

            <View style={styles.summaryGrid}>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {todayEntry ? `${todayEntry.waterCups}` : "0"}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {ui.summaryWaterToday}
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {todayEntry ? `${todayEntry.sleepHours}h` : "0h"}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {ui.summarySleepToday}
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {todayEntry ? `${todayEntry.exerciseMinutes}m` : "0m"}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {ui.summaryExerciseToday}
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {latestWeight !== null ? `${latestWeight}` : "--"}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {ui.summaryLastWeight}
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.addButton, { backgroundColor: colors.accent }]}
              onPress={openModalWithToday}
            >
              <Text
                style={[styles.addButtonText, { color: colors.accentContrast }]}
              >
                {todayEntry ? ui.editCheckin : ui.createCheckin}
              </Text>
            </Pressable>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {ui.medicationsTitle}
            </Text>

            <View
              style={[
                styles.medicationSummaryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Text
                style={[styles.medicationSummaryTitle, { color: colors.success }]}
              >
                {ui.dayControlTitle}
              </Text>
              <Text
                style={[styles.medicationSummaryText, { color: colors.textSecondary }]}
              >
                {ui.activeSummary(
                  activeMedications.length,
                  takenTodayCount,
                  !!isPremium
                )}
              </Text>
            </View>

            <Pressable
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
              onPress={openMedicationModal}
            >
              <Text
                style={[styles.secondaryButtonText, { color: colors.accent }]}
              >
                {ui.addMedication}
              </Text>
            </Pressable>

            {activeMedications.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {ui.noActiveMedicationTitle}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {ui.noActiveMedicationText}
                </Text>
              </View>
            ) : (
              <View style={styles.medicationsList}>
                {activeMedications.map((item) => {
                  const takenToday = item.takenTodayDates.includes(today);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.medicationCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.medicationTop}>
                        <View style={styles.medicationMain}>
                          <Text style={[styles.medicationName, { color: colors.text }]}>
                            💊 {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.medicationMeta,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {item.dosage} • {item.time}
                          </Text>
                          {item.notes ? (
                            <Text
                              style={[
                                styles.medicationNotes,
                                { color: colors.textMuted },
                              ]}
                            >
                              {item.notes}
                            </Text>
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.medicationStatus,
                            { color: takenToday ? colors.success : colors.warning },
                          ]}
                        >
                          {takenToday ? ui.takenToday : ui.pendingToday}
                        </Text>
                      </View>

                      <View style={styles.medicationActions}>
                        <Pressable
                          style={[
                            styles.medicationActionButton,
                            {
                              backgroundColor: takenToday
                                ? colors.accentSoft
                                : colors.surfaceAlt,
                              borderColor: takenToday
                                ? colors.accentBorder
                                : colors.border,
                            },
                          ]}
                          onPress={() => toggleMedicationTakenToday(item.id)}
                        >
                          <Text
                            style={[
                              styles.medicationActionButtonText,
                              {
                                color: takenToday ? colors.accent : colors.text,
                              },
                            ]}
                          >
                            {takenToday ? ui.unmark : ui.markTaken}
                          </Text>
                        </Pressable>

                        <Pressable onPress={() => toggleMedicationActive(item.id)}>
                          <Text style={[styles.pauseText, { color: colors.accent }]}>
                            {ui.deactivate}
                          </Text>
                        </Pressable>

                        <Pressable onPress={() => removeMedication(item.id)}>
                          <Text style={[styles.removeText, { color: colors.textMuted }]}>
                            {ui.remove}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {inactiveMedications.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {ui.inactiveMedicationsTitle}
                </Text>
                <View style={styles.medicationsList}>
                  {inactiveMedications.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.medicationCardInactive,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.medicationName, { color: colors.text }]}>
                        💊 {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.medicationMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.dosage} • {item.time}
                      </Text>

                      <View style={styles.medicationActions}>
                        <Pressable onPress={() => toggleMedicationActive(item.id)}>
                          <Text
                            style={[styles.reactivateText, { color: colors.accent }]}
                          >
                            {ui.reactivate}
                          </Text>
                        </Pressable>

                        <Pressable onPress={() => removeMedication(item.id)}>
                          <Text style={[styles.removeText, { color: colors.textMuted }]}>
                            {ui.remove}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {ui.weeklySummaryTitle}
            </Text>

            {isHydrated && !isPremium ? (
              <View
                style={[
                  styles.lockedCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.lockedTitle, { color: colors.text }]}>
                  {`🔒 ${ui.premiumWeeklyTitle}`}
                </Text>
                <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                  {ui.premiumWeeklyText}
                </Text>
                <Pressable
                  style={[styles.lockedButton, { backgroundColor: colors.accent }]}
                  onPress={goToPremium}
                >
                  <Text
                    style={[
                      styles.lockedButtonText,
                      { color: colors.accentContrast },
                    ]}
                  >
                    {ui.unlock}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={[
                  styles.weekCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.weekStatsGrid}>
                  <View
                    style={[
                      styles.weekStatBox,
                      { backgroundColor: colors.surfaceAlt },
                    ]}
                  >
                    <Text style={[styles.weekStatValue, { color: colors.text }]}>
                      {weeklySummary.avgWater}
                    </Text>
                    <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>
                      {ui.avgWater}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.weekStatBox,
                      { backgroundColor: colors.surfaceAlt },
                    ]}
                  >
                    <Text style={[styles.weekStatValue, { color: colors.text }]}>
                      {weeklySummary.avgSleep}h
                    </Text>
                    <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>
                      {ui.avgSleep}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.weekStatBox,
                      { backgroundColor: colors.surfaceAlt },
                    ]}
                  >
                    <Text style={[styles.weekStatValue, { color: colors.text }]}>
                      {weeklySummary.avgExercise}m
                    </Text>
                    <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>
                      {ui.avgExercise}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.weekStatBox,
                      { backgroundColor: colors.surfaceAlt },
                    ]}
                  >
                    <Text style={[styles.weekStatValue, { color: colors.text }]}>
                      {weeklySummary.daysTracked}
                    </Text>
                    <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>
                      {ui.daysTracked}
                    </Text>
                  </View>
                </View>

                <View style={styles.healthMoodRow}>
                  <View
                    style={[
                      styles.healthMoodBadge,
                      {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accentBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.healthMoodBadgeText, { color: colors.accent }]}
                    >
                      {`😊 ${ui.avgMoodLabel}: ${weeklySummary.avgMood}/5`}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.healthMoodBadge,
                      {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accentBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.healthMoodBadgeText, { color: colors.accent }]}
                    >
                      {`🔋 ${ui.avgEnergyLabel}: ${weeklySummary.avgEnergy}/5`}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {ui.weeklyChartTitle}
            </Text>

            {isHydrated && !isPremium ? (
              <View
                style={[
                  styles.lockedCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.lockedTitle, { color: colors.text }]}>
                  {`🔒 ${ui.premiumChartTitle}`}
                </Text>
                <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                  {ui.premiumChartText}
                </Text>
                <Pressable
                  style={[styles.lockedButton, { backgroundColor: colors.accent }]}
                  onPress={goToPremium}
                >
                  <Text
                    style={[
                      styles.lockedButtonText,
                      { color: colors.accentContrast },
                    ]}
                  >
                    {ui.seePremium}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {weeklyBars.map((item) => (
                  <View key={item.id} style={styles.chartDayBlock}>
                    <Text style={[styles.chartDayLabel, { color: colors.text }]}>
                      {item.label}
                    </Text>

                    <View style={styles.chartRow}>
                      <Text style={styles.chartMetric}>💧</Text>
                      <View
                        style={[
                          styles.chartTrack,
                          { backgroundColor: surfaceMuted },
                        ]}
                      >
                        <View
                          style={[
                            styles.chartFillWater,
                            { width: `${item.water}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.chartRow}>
                      <Text style={styles.chartMetric}>😴</Text>
                      <View
                        style={[
                          styles.chartTrack,
                          { backgroundColor: surfaceMuted },
                        ]}
                      >
                        <View
                          style={[
                            styles.chartFillSleep,
                            { width: `${item.sleep}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.chartRow}>
                      <Text style={styles.chartMetric}>🏃</Text>
                      <View
                        style={[
                          styles.chartTrack,
                          { backgroundColor: surfaceMuted },
                        ]}
                      >
                        <View
                          style={[
                            styles.chartFillExercise,
                            { width: `${item.exercise}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.chartRow}>
                      <Text style={styles.chartMetric}>🔋</Text>
                      <View
                        style={[
                          styles.chartTrack,
                          { backgroundColor: surfaceMuted },
                        ]}
                      >
                        <View
                          style={[
                            styles.chartFillEnergy,
                            { width: `${item.energy}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {ui.historyTitle}
            </Text>

            {historyEntries.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {ui.emptyHistoryTitle}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {ui.emptyHistoryText}
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {historyEntries.map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.historyCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.historyTop}>
                      <Text style={[styles.historyDate, { color: colors.text }]}>
                        {formatDate(entry.dateKey)}
                      </Text>
                      <Pressable onPress={() => removeEntry(entry.dateKey)}>
                        <Text style={[styles.removeText, { color: colors.textMuted }]}>
                          {ui.remove}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.historyInfoGrid}>
                      <Text
                        style={[styles.historyInfo, { color: colors.textSecondary }]}
                      >
                        {`💧 ${ui.historyWater}: ${entry.waterCups}`}
                      </Text>
                      <Text
                        style={[styles.historyInfo, { color: colors.textSecondary }]}
                      >
                        {`😴 ${ui.historySleep}: ${entry.sleepHours}h`}
                      </Text>
                      <Text
                        style={[styles.historyInfo, { color: colors.textSecondary }]}
                      >
                        {`🏃 ${ui.historyExercise}: ${entry.exerciseMinutes} min`}
                      </Text>
                      <Text
                        style={[styles.historyInfo, { color: colors.textSecondary }]}
                      >
                        {`⚖️ ${ui.historyWeight}: ${
                          entry.weight !== null ? `${entry.weight} kg` : "--"
                        }`}
                      </Text>
                    </View>

                    <Text style={[styles.historyMood, { color: colors.accent }]}>
                      {`${getMoodEmoji(entry.mood)} ${ui.moodLabel}: ${getMoodLabel(
                        entry.mood,
                        language
                      )}`}
                    </Text>
                    <Text style={[styles.historyMood, { color: colors.accent }]}>
                      {`${getEnergyEmoji(entry.energy)} ${ui.energyLabel}: ${getEnergyLabel(
                        entry.energy,
                        language
                      )}`}
                    </Text>

                    {entry.notes ? (
                      <Text style={[styles.historyNotes, { color: colors.textMuted }]}>
                        📝 {entry.notes}
                      </Text>
                    ) : null}
                  </View>
                ))}

                {isHydrated && !isPremium && sortedEntries.length > FREE_HISTORY_PREVIEW ? (
                  <View
                    style={[
                      styles.lockedCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.lockedTitle, { color: colors.text }]}>
                      {`🔒 ${premiumHistoryUi.title}`}
                    </Text>
                    <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                      {premiumHistoryUi.text(FREE_HISTORY_PREVIEW)}
                    </Text>
                    <Pressable
                      style={[
                        styles.lockedButton,
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
                          styles.lockedButtonText,
                          { color: colors.accentButtonText },
                        ]}
                      >
                        {ui.unlock}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <View
          style={[
            styles.modalBackdrop,
            { backgroundColor: "rgba(0,0,0,0.72)" },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {ui.dailyCheckinTitle}
            </Text>

            <TextInput
              value={waterCups}
              onChangeText={setWaterCups}
              placeholder={ui.waterPlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={sleepHours}
              onChangeText={setSleepHours}
              placeholder={ui.sleepPlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={exerciseMinutes}
              onChangeText={setExerciseMinutes}
              placeholder={ui.exercisePlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder={ui.weightPlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>
              {ui.moodLabel}
            </Text>
            <View style={styles.optionGrid}>
              {MOOD_OPTIONS.map((item) => {
                const active = mood === item;
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: active
                          ? colors.accentSoft
                          : colors.surfaceAlt,
                        borderColor: active
                          ? colors.accentBorder
                          : colors.border,
                      },
                    ]}
                    onPress={() => setMood(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: active ? colors.accent : colors.textSecondary },
                      ]}
                    >
                      {getMoodEmoji(item)} {getMoodLabel(item, language)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>
              {ui.energyLabel}
            </Text>
            <View style={styles.optionGrid}>
              {ENERGY_OPTIONS.map((item) => {
                const active = energy === item;
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: active
                          ? colors.accentSoft
                          : colors.surfaceAlt,
                        borderColor: active
                          ? colors.accentBorder
                          : colors.border,
                      },
                    ]}
                    onPress={() => setEnergy(item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: active ? colors.accent : colors.textSecondary },
                      ]}
                    >
                      {getEnergyEmoji(item)} {getEnergyLabel(item, language)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={ui.notesPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              multiline
            />

            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={saveTodayHealth}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {ui.saveCheckin}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setModalOpen(false)}
            >
              <Text
                style={[styles.cancelButtonText, { color: colors.text }]}
              >
                {ui.cancel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={medicationModalOpen} transparent animationType="slide">
        <View
          style={[
            styles.modalBackdrop,
            { backgroundColor: "rgba(0,0,0,0.72)" },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {ui.newMedicationTitle}
            </Text>

            <TextInput
              value={medicationName}
              onChangeText={setMedicationName}
              placeholder={ui.medicationNamePlaceholder}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={medicationDosage}
              onChangeText={setMedicationDosage}
              placeholder={ui.medicationDosagePlaceholder}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={medicationTime}
              onChangeText={setMedicationTime}
              placeholder={ui.medicationTimePlaceholder}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={medicationNotes}
              onChangeText={setMedicationNotes}
              placeholder={ui.notesPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              multiline
            />

            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={adicionarMedicamento}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {ui.saveMedication}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setMedicationModalOpen(false)}
            >
              <Text
                style={[styles.cancelButtonText, { color: colors.text }]}
              >
                {ui.cancel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showModuleTour && activeHealthTourStep ? (
        <GuidedTourOverlay
          visible={showModuleTour}
          icon={activeHealthTourStep.icon}
          title={activeHealthTourStep.title}
          description={activeHealthTourStep.description}
          stepLabel={copy.tourStep
            .replace("{{current}}", String(moduleTourStepIndex + 1))
            .replace("{{total}}", String(healthTourSteps.length))}
          accentColor={colors.accent}
          surfaceColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          textSecondaryColor={colors.textSecondary}
          primaryLabel={activeHealthTourStep.primaryLabel}
          onPrimary={() => {
            void handleAdvanceModuleTour();
          }}
          secondaryLabel={copy.skipTour}
          onSecondary={() => {
            void handleSkipModuleTour();
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

  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },

  header: {
    marginBottom: 18,
  },

  headerPlanRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  backButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },

  backButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  planBadgeTop: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },

  planBadgeTopText: {
    fontSize: 12,
    fontWeight: "900",
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 18,
  },

  loadingCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  loadingTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  loadingText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  upgradeCard: {
    borderRadius: 18,
    padding: 14,
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

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },

  summaryCard: {
    width: "48.5%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  summaryValue: {
    fontSize: 28,
    fontWeight: "900",
  },

  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  addButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },

  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 16,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  medicationSummaryCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },

  medicationSummaryTitle: {
    fontSize: 13,
    fontWeight: "800",
  },

  medicationSummaryText: {
    fontSize: 12,
    marginTop: 6,
  },

  medicationsList: {
    gap: 10,
    marginBottom: 18,
  },

  medicationCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  medicationCardInactive: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    opacity: 0.75,
  },

  medicationTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  medicationMain: {
    flex: 1,
  },

  medicationName: {
    fontSize: 14,
    fontWeight: "900",
  },

  medicationMeta: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  medicationNotes: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  medicationStatus: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },

  medicationActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },

  medicationActionButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },

  medicationActionButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },

  pauseText: {
    fontSize: 12,
    fontWeight: "700",
  },

  reactivateText: {
    fontSize: 12,
    fontWeight: "700",
  },

  weekCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },

  weekStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },

  weekStatBox: {
    width: "48.5%",
    borderRadius: 14,
    padding: 12,
  },

  weekStatValue: {
    fontSize: 22,
    fontWeight: "900",
  },

  weekStatLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  healthMoodRow: {
    marginTop: 12,
    gap: 8,
  },

  healthMoodBadge: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },

  healthMoodBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  chartCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },

  chartDayBlock: {
    marginBottom: 14,
  },

  chartDayLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },

  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  chartMetric: {
    width: 26,
    fontSize: 14,
  },

  chartTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },

  chartFillWater: {
    height: "100%",
    backgroundColor: "#38bdf8",
    borderRadius: 999,
  },

  chartFillSleep: {
    height: "100%",
    backgroundColor: "#8b5cf6",
    borderRadius: 999,
  },

  chartFillExercise: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 999,
    width: "0%",
  },

  chartFillEnergy: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 999,
    width: "0%",
  },

  emptyBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  emptyTitle: {
    fontWeight: "800",
    fontSize: 15,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  historyList: {
    gap: 12,
  },

  historyCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  historyDate: {
    fontSize: 14,
    fontWeight: "900",
  },

  removeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  historyInfoGrid: {
    gap: 6,
    marginBottom: 10,
  },

  historyInfo: {
    fontSize: 13,
    fontWeight: "700",
  },

  historyMood: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  historyNotes: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  lockedCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  lockedTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  lockedText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  lockedButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },

  lockedButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    borderWidth: 1,
    maxHeight: "92%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 10,
  },

  notesInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 10,
  },

  optionGrid: {
    gap: 8,
    marginBottom: 12,
  },

  optionItem: {
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
  },

  optionText: {
    fontSize: 12,
    fontWeight: "700",
  },

  saveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
  },

  saveButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  cancelButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },

  cancelButtonText: {
    fontWeight: "800",
    fontSize: 13,
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
