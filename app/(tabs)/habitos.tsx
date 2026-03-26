import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppScreenHeader from "../../components/AppScreenHeader";
import GuidedTourOverlay from "../../components/GuidedTourOverlay";
import { rescheduleSmartNotifications } from "../../lib/notifications";
import {
  FREE_POLICY,
  HabitCategory,
  HabitItem,
  getLocalizedHabitsLibrary,
} from "../constants/habitsLibrary";
import { AI_PLAN_KEY, normalizeLifeJourneyPlan } from "../utils/lifeJourney";
import { getCurrentStreak } from "../utils/progress";
import {
  completeJourneyModuleTour,
  readJourneyModuleTourState,
  skipJourneyModuleTour,
} from "../utils/journeyTour";
import { useAppLanguage } from "../utils/languageContext";
import { useAppTheme } from "../utils/themeContext";

type Habit = {
  id: string;
  title: string;
  createdAt: string;
  completedDates: string[];
};

type Challenge21 = {
  id: string;
  habitId: string;
  habitTitle: string;
  startedAt: string;
  completedDates: string[];
  finishedAt: string | null;
  canceledAt: string | null;
};

const STORAGE_KEY = "@vida_em_ordem_habitos_v1";
const PREMIUM_KEY = "@vida_em_ordem_subscription_plan_v1";
const CHALLENGE_KEY = "@vida_em_ordem_desafio_21d_v1";

const FREE_MAX_HABITS = 5;

const copyByLanguage = {
  pt: {
    performanceExcellent: "Excelente",
    performanceVeryGood: "Muito bom",
    performanceGood: "Bom",
    performanceGrowing: "Em evolução",
    performanceStarting: "Começando",
    tour1Title: "Comece com hábitos simples",
    tour1Description:
      "Seu melhor começo aqui é criar poucos hábitos, mas bem viáveis, para ganhar consistência sem sobrecarga.",
    tour2Title: "Marque a execução do dia",
    tour2Description:
      "Sempre que concluir um hábito, toque nele. O app usa isso para medir sua constância e validar a jornada.",
    tour3Title: "Desafios aceleram seu ritmo",
    tour3Description:
      "Quando um hábito começar a ganhar força, transforme ele em um desafio de 21 dias para reforçar a disciplina.",
    alertFreeLimitTitle: "Limite do plano Free",
    alertFreeLimitText:
      "No plano Free você pode ter até {{value}} hábitos ativos. No Premium, você ganha mais espaço para evoluir com calma.",
    alertEmptyTitle: "Atenção",
    alertEmptyText: "Digite um nome para o hábito.",
    alertExistsTitle: "Já existe",
    alertExistsText: "Você já adicionou esse hábito.",
    alertPremiumHabitTitle: "Hábito do Premium",
    alertPremiumHabitText:
      "Esse hábito faz parte da biblioteca completa do Premium. Se quiser, você pode conhecer essa versão agora.",
    challengeActiveTitle: "Desafio já ativo",
    challengeActiveText: "Esse hábito já está em um desafio de 21 dias.",
    challengeLimitText:
      "No plano Free você pode ter apenas 1 desafio de 21 dias ativo por vez. No Premium, você acompanha mais de um desafio ao mesmo tempo.",
    challengeStartedTitle: "Desafio iniciado",
    challengeStartedText: "Seu desafio de 21 dias para \"{{value}}\" começou.",
    challengeEndTitle: "Encerrar desafio",
    challengeEndText: "Deseja encerrar este desafio agora?",
    challengeEndAction: "Encerrar",
    challengeCompletedTitle: "Desafio concluído",
    challengeCompletedText:
      "Parabéns! Você completou 21 dias do hábito \"{{value}}\".",
    removeHabitTitle: "Remover hábito",
    removeHabitTextWithChallenge:
      "Ao remover \"{{value}}\", o desafio ativo ligado a ele também será removido. Deseja continuar?",
    removeHabitTextSimple: "Tem certeza que deseja remover \"{{value}}\"?",
    removeHabitFallback: "este hábito",
    removeHabitAction: "Remover",
    saveHabitsError: "Não foi possível salvar. Tente novamente.",
    saveChallengesError: "Não foi possível salvar os desafios.",
    saveChangesError: "Não foi possível salvar as alterações.",
    loadHabitsError: "Não foi possível carregar seus hábitos.",
    headerTitle: "Hábitos",
    headerSubtitle: "Hoje: {{done}} de {{total}} concluídos",
    planPremium: "Plano Premium",
    planFree: "Plano Free",
    executiveBadge: "Visão rápida do seu ritmo",
    executiveTitleEmpty: "Seu painel de hábitos ainda está vazio",
    executiveTitleProgress: "{{value}} hoje",
    metricToday: "Execução de hoje",
    metricStreak: "Streak atual",
    addHabitTitle: "Adicionar hábito",
    addHabitHintPremium: "Você pode expandir sua rotina com mais liberdade.",
    addHabitHintFree: "Plano Free: até {{value}} hábitos ativos.",
    addHabitPlaceholder: "Ex.: Beber água, Ler 10 min...",
    addHabitButton: "Adicionar",
    addHabitLimit: "Limite",
    doneToday: "Concluído hoje",
    notDoneToday: "Não concluído hoje",
    challengeLabel: "Desafio",
    removeLabel: "Remover",
    loading: "Carregando...",
    pickerTitle: "Escolher hábito",
    close: "Fechar",
    searchPlaceholder: "Buscar hábito...",
    freeNotice: "No Free, alguns hábitos aparecem como Premium.",
    lockedSuffix: " • Premium",
    lockedAvailable: "Disponível no Premium",
    tapToAdd: "Toque para adicionar",
    emptySearchTitle: "Nada encontrado",
    emptySearchText: "Tente buscar por “água”, “ler”, “sono”, “meditar”…",
    fullListButton: "Conhecer lista completa",
    skipTour: "Pular tour",
    smartEmpty:
      "Seu sistema de hábitos começa no primeiro passo. Crie poucos hábitos, mas que realmente caibam na sua rotina.",
    smartFull:
      "Dia fechado com sucesso. Quando o básico vira padrão, a evolução deixa de depender da motivação.",
    smartGood:
      "Você já está no trilho. Falta pouco para transformar hoje em um dia bem executado.",
    smartStreak:
      "Sua sequência já está ganhando musculatura. Agora vale proteger o ritmo e evitar buracos desnecessários.",
    smartBase:
      "O segredo agora não é fazer tudo. É repetir o essencial até o hábito parar de pedir esforço.",
  },
  en: {
    performanceExcellent: "Excellent",
    performanceVeryGood: "Very good",
    performanceGood: "Good",
    performanceGrowing: "Improving",
    performanceStarting: "Starting",
    tour1Title: "Start with simple habits",
    tour1Description:
      "Your best start here is to create just a few realistic habits so you can build consistency without overload.",
    tour2Title: "Mark today's completion",
    tour2Description:
      "Whenever you finish a habit, tap it. The app uses this to measure your consistency and validate your journey.",
    tour3Title: "Challenges speed up your rhythm",
    tour3Description:
      "When a habit starts gaining traction, turn it into a 21-day challenge to reinforce discipline.",
    alertFreeLimitTitle: "Free plan limit",
    alertFreeLimitText:
      "On the Free plan you can have up to {{value}} active habits. Premium gives you more room to grow calmly.",
    alertEmptyTitle: "Attention",
    alertEmptyText: "Enter a name for the habit.",
    alertExistsTitle: "Already exists",
    alertExistsText: "You already added this habit.",
    alertPremiumHabitTitle: "Premium habit",
    alertPremiumHabitText:
      "This habit is part of the full Premium library. If you want, you can explore that version now.",
    challengeActiveTitle: "Challenge already active",
    challengeActiveText: "This habit is already in a 21-day challenge.",
    challengeLimitText:
      "On the Free plan you can only have 1 active 21-day challenge at a time. Premium lets you track more than one.",
    challengeStartedTitle: "Challenge started",
    challengeStartedText: "Your 21-day challenge for \"{{value}}\" has started.",
    challengeEndTitle: "End challenge",
    challengeEndText: "Do you want to end this challenge now?",
    challengeEndAction: "End",
    challengeCompletedTitle: "Challenge completed",
    challengeCompletedText: "Congratulations! You completed 21 days of the habit \"{{value}}\".",
    removeHabitTitle: "Remove habit",
    removeHabitTextWithChallenge:
      "If you remove \"{{value}}\", the active challenge linked to it will also be removed. Do you want to continue?",
    removeHabitTextSimple: "Are you sure you want to remove \"{{value}}\"?",
    removeHabitFallback: "this habit",
    removeHabitAction: "Remove",
    saveHabitsError: "Could not save. Please try again.",
    saveChallengesError: "Could not save the challenges.",
    saveChangesError: "Could not save the changes.",
    loadHabitsError: "Could not load your habits.",
    headerTitle: "Habits",
    headerSubtitle: "Today: {{done}} of {{total}} completed",
    planPremium: "Premium Plan",
    planFree: "Free Plan",
    executiveBadge: "Quick view of your rhythm",
    executiveTitleEmpty: "Your habits dashboard is still empty",
    executiveTitleProgress: "{{value}} today",
    metricToday: "Today's execution",
    metricStreak: "Current streak",
    addHabitTitle: "Add habit",
    addHabitHintPremium: "You can expand your routine with more freedom.",
    addHabitHintFree: "Free plan: up to {{value}} active habits.",
    addHabitPlaceholder: "Ex: Drink water, Read 10 min...",
    addHabitButton: "Add",
    addHabitLimit: "Limit",
    doneToday: "Completed today",
    notDoneToday: "Not completed today",
    challengeLabel: "Challenge",
    removeLabel: "Remove",
    loading: "Loading...",
    pickerTitle: "Choose habit",
    close: "Close",
    searchPlaceholder: "Search habit...",
    freeNotice: "On Free, some habits appear as Premium.",
    lockedSuffix: " • Premium",
    lockedAvailable: "Available in Premium",
    tapToAdd: "Tap to add",
    emptySearchTitle: "Nothing found",
    emptySearchText: "Try searching for “water”, “read”, “sleep”, “meditate”…",
    fullListButton: "Explore full list",
    skipTour: "Skip tour",
    smartEmpty:
      "Your habit system starts with the first step. Create just a few habits that truly fit your routine.",
    smartFull:
      "Day completed successfully. When the basics become standard, progress stops depending on motivation.",
    smartGood:
      "You are already on track. You're close to turning today into a well-executed day.",
    smartStreak:
      "Your streak is already gaining strength. Now it is worth protecting the rhythm and avoiding unnecessary gaps.",
    smartBase:
      "The secret now is not doing everything. It is repeating the essentials until the habit stops demanding effort.",
  },
  es: {
    performanceExcellent: "Excelente",
    performanceVeryGood: "Muy bueno",
    performanceGood: "Bueno",
    performanceGrowing: "En evolución",
    performanceStarting: "Empezando",
    tour1Title: "Empieza con hábitos simples",
    tour1Description:
      "Tu mejor inicio aquí es crear pocos hábitos, pero muy viables, para ganar constancia sin sobrecarga.",
    tour2Title: "Marca la ejecución del día",
    tour2Description:
      "Siempre que completes un hábito, tócala. La app usa eso para medir tu constancia y validar la jornada.",
    tour3Title: "Los desafíos aceleran tu ritmo",
    tour3Description:
      "Cuando un hábito empiece a ganar fuerza, conviértelo en un desafío de 21 días para reforzar la disciplina.",
    alertFreeLimitTitle: "Límite del plan Free",
    alertFreeLimitText:
      "En el plan Free puedes tener hasta {{value}} hábitos activos. Premium te da más espacio para evolucionar con calma.",
    alertEmptyTitle: "Atención",
    alertEmptyText: "Escribe un nombre para el hábito.",
    alertExistsTitle: "Ya existe",
    alertExistsText: "Ya agregaste este hábito.",
    alertPremiumHabitTitle: "Hábito Premium",
    alertPremiumHabitText:
      "Este hábito forma parte de la biblioteca completa de Premium. Si quieres, puedes conocer esa versión ahora.",
    challengeActiveTitle: "Desafío ya activo",
    challengeActiveText: "Este hábito ya está en un desafío de 21 días.",
    challengeLimitText:
      "En el plan Free solo puedes tener 1 desafío activo de 21 días a la vez. Premium te permite acompañar más de uno.",
    challengeStartedTitle: "Desafío iniciado",
    challengeStartedText: "Tu desafío de 21 días para \"{{value}}\" comenzó.",
    challengeEndTitle: "Finalizar desafío",
    challengeEndText: "¿Quieres finalizar este desafío ahora?",
    challengeEndAction: "Finalizar",
    challengeCompletedTitle: "Desafío completado",
    challengeCompletedText: "¡Felicidades! Completaste 21 días del hábito \"{{value}}\".",
    removeHabitTitle: "Eliminar hábito",
    removeHabitTextWithChallenge:
      "Si eliminas \"{{value}}\", el desafío activo vinculado a él también será eliminado. ¿Quieres continuar?",
    removeHabitTextSimple: "¿Seguro que quieres eliminar \"{{value}}\"?",
    removeHabitFallback: "este hábito",
    removeHabitAction: "Eliminar",
    saveHabitsError: "No fue posible guardar. Intenta nuevamente.",
    saveChallengesError: "No fue posible guardar los desafíos.",
    saveChangesError: "No fue posible guardar los cambios.",
    loadHabitsError: "No fue posible cargar tus hábitos.",
    headerTitle: "Hábitos",
    headerSubtitle: "Hoy: {{done}} de {{total}} completados",
    planPremium: "Plan Premium",
    planFree: "Plan Free",
    executiveBadge: "Vista rápida de tu ritmo",
    executiveTitleEmpty: "Tu panel de hábitos todavía está vacío",
    executiveTitleProgress: "{{value}} hoy",
    metricToday: "Ejecución de hoy",
    metricStreak: "Racha actual",
    addHabitTitle: "Agregar hábito",
    addHabitHintPremium: "Puedes ampliar tu rutina con más libertad.",
    addHabitHintFree: "Plan Free: hasta {{value}} hábitos activos.",
    addHabitPlaceholder: "Ej.: Beber agua, Leer 10 min...",
    addHabitButton: "Agregar",
    addHabitLimit: "Límite",
    doneToday: "Completado hoy",
    notDoneToday: "No completado hoy",
    challengeLabel: "Desafío",
    removeLabel: "Eliminar",
    loading: "Cargando...",
    pickerTitle: "Elegir hábito",
    close: "Cerrar",
    searchPlaceholder: "Buscar hábito...",
    freeNotice: "En Free, algunos hábitos aparecen como Premium.",
    lockedSuffix: " • Premium",
    lockedAvailable: "Disponible en Premium",
    tapToAdd: "Toca para agregar",
    emptySearchTitle: "Nada encontrado",
    emptySearchText: "Prueba buscar “agua”, “leer”, “sueño”, “meditar”…",
    fullListButton: "Conocer lista completa",
    skipTour: "Saltar tour",
    smartEmpty:
      "Tu sistema de hábitos comienza con el primer paso. Crea pocos hábitos, pero que realmente encajen en tu rutina.",
    smartFull:
      "Día cerrado con éxito. Cuando lo básico se vuelve estándar, la evolución deja de depender de la motivación.",
    smartGood:
      "Ya estás en el camino. Falta poco para transformar hoy en un día bien ejecutado.",
    smartStreak:
      "Tu racha ya está ganando fuerza. Ahora vale proteger el ritmo y evitar huecos innecesarios.",
    smartBase:
      "El secreto ahora no es hacerlo todo. Es repetir lo esencial hasta que el hábito deje de pedir esfuerzo.",
  },
  fr: {
    performanceExcellent: "Excellent",
    performanceVeryGood: "Très bon",
    performanceGood: "Bon",
    performanceGrowing: "En évolution",
    performanceStarting: "Commencer",
    tour1Title: "Commencez par des habitudes simples",
    tour1Description:
      "Le meilleur départ ici est de créer peu d'habitudes, mais vraiment faisables, pour gagner en constance sans surcharge.",
    tour2Title: "Marquez l'exécution du jour",
    tour2Description:
      "Chaque fois que vous accomplissez une habitude, touchez-la. L'app utilise cela pour mesurer votre constance et valider le parcours.",
    tour3Title: "Les défis accélèrent votre rythme",
    tour3Description:
      "Quand une habitude commence à prendre de la force, transformez-la en défi de 21 jours pour renforcer la discipline.",
    alertFreeLimitTitle: "Limite du plan Free",
    alertFreeLimitText:
      "Avec le plan Free, vous pouvez avoir jusqu'à {{value}} habitudes actives. Premium vous donne plus d'espace pour évoluer calmement.",
    alertEmptyTitle: "Attention",
    alertEmptyText: "Saisissez un nom pour l'habitude.",
    alertExistsTitle: "Existe déjà",
    alertExistsText: "Vous avez déjà ajouté cette habitude.",
    alertPremiumHabitTitle: "Habitude Premium",
    alertPremiumHabitText:
      "Cette habitude fait partie de la bibliothèque complète Premium. Si vous voulez, vous pouvez découvrir cette version maintenant.",
    challengeActiveTitle: "Défi déjà actif",
    challengeActiveText: "Cette habitude est déjà dans un défi de 21 jours.",
    challengeLimitText:
      "Avec le plan Free, vous ne pouvez avoir qu'un seul défi actif de 21 jours à la fois. Premium vous permet d'en suivre plusieurs.",
    challengeStartedTitle: "Défi lancé",
    challengeStartedText: "Votre défi de 21 jours pour \"{{value}}\" a commencé.",
    challengeEndTitle: "Terminer le défi",
    challengeEndText: "Voulez-vous terminer ce défi maintenant ?",
    challengeEndAction: "Terminer",
    challengeCompletedTitle: "Défi terminé",
    challengeCompletedText: "Bravo ! Vous avez accompli 21 jours de l'habitude \"{{value}}\".",
    removeHabitTitle: "Supprimer l'habitude",
    removeHabitTextWithChallenge:
      "Si vous supprimez \"{{value}}\", le défi actif qui lui est lié sera aussi supprimé. Voulez-vous continuer ?",
    removeHabitTextSimple: "Êtes-vous sûr de vouloir supprimer \"{{value}}\" ?",
    removeHabitFallback: "cette habitude",
    removeHabitAction: "Supprimer",
    saveHabitsError: "Impossible d'enregistrer. Réessayez.",
    saveChallengesError: "Impossible d'enregistrer les défis.",
    saveChangesError: "Impossible d'enregistrer les modifications.",
    loadHabitsError: "Impossible de charger vos habitudes.",
    headerTitle: "Habitudes",
    headerSubtitle: "Aujourd'hui : {{done}} sur {{total}} terminées",
    planPremium: "Plan Premium",
    planFree: "Plan Free",
    executiveBadge: "Vue rapide de votre rythme",
    executiveTitleEmpty: "Votre panneau d'habitudes est encore vide",
    executiveTitleProgress: "{{value}} aujourd'hui",
    metricToday: "Exécution du jour",
    metricStreak: "Série actuelle",
    addHabitTitle: "Ajouter une habitude",
    addHabitHintPremium: "Vous pouvez développer votre routine plus librement.",
    addHabitHintFree: "Plan Free : jusqu'à {{value}} habitudes actives.",
    addHabitPlaceholder: "Ex. : Boire de l'eau, Lire 10 min...",
    addHabitButton: "Ajouter",
    addHabitLimit: "Limite",
    doneToday: "Fait aujourd'hui",
    notDoneToday: "Pas fait aujourd'hui",
    challengeLabel: "Défi",
    removeLabel: "Supprimer",
    loading: "Chargement...",
    pickerTitle: "Choisir une habitude",
    close: "Fermer",
    searchPlaceholder: "Rechercher une habitude...",
    freeNotice: "En Free, certaines habitudes apparaissent comme Premium.",
    lockedSuffix: " • Premium",
    lockedAvailable: "Disponible en Premium",
    tapToAdd: "Touchez pour ajouter",
    emptySearchTitle: "Aucun résultat",
    emptySearchText: "Essayez de rechercher “eau”, “lire”, “sommeil”, “méditer”…",
    fullListButton: "Découvrir la liste complète",
    skipTour: "Passer le tour",
    smartEmpty:
      "Votre système d'habitudes commence au premier pas. Créez peu d'habitudes, mais de vraies habitudes qui entrent dans votre routine.",
    smartFull:
      "Journée réussie. Quand l'essentiel devient un standard, l'évolution cesse de dépendre de la motivation.",
    smartGood:
      "Vous êtes déjà sur la bonne voie. Il manque peu pour transformer aujourd'hui en journée bien exécutée.",
    smartStreak:
      "Votre série commence déjà à se renforcer. Maintenant, il vaut mieux protéger le rythme et éviter les trous inutiles.",
    smartBase:
      "Le secret maintenant n'est pas de tout faire. C'est de répéter l'essentiel jusqu'à ce que l'habitude cesse de demander de l'effort.",
  },
  it: {
    performanceExcellent: "Eccellente",
    performanceVeryGood: "Molto buono",
    performanceGood: "Buono",
    performanceGrowing: "In evoluzione",
    performanceStarting: "Inizio",
    tour1Title: "Inizia con abitudini semplici",
    tour1Description:
      "Il tuo miglior inizio qui è creare poche abitudini, ma davvero fattibili, per costruire costanza senza sovraccarico.",
    tour2Title: "Segna l'esecuzione del giorno",
    tour2Description:
      "Ogni volta che completi un'abitudine, toccala. L'app usa questo per misurare la tua costanza e validare il percorso.",
    tour3Title: "Le sfide accelerano il tuo ritmo",
    tour3Description:
      "Quando un'abitudine inizia a prendere forza, trasformala in una sfida di 21 giorni per rafforzare la disciplina.",
    alertFreeLimitTitle: "Limite del piano Free",
    alertFreeLimitText:
      "Nel piano Free puoi avere fino a {{value}} abitudini attive. Premium ti offre più spazio per crescere con calma.",
    alertEmptyTitle: "Attenzione",
    alertEmptyText: "Inserisci un nome per l'abitudine.",
    alertExistsTitle: "Esiste già",
    alertExistsText: "Hai già aggiunto questa abitudine.",
    alertPremiumHabitTitle: "Abitudine Premium",
    alertPremiumHabitText:
      "Questa abitudine fa parte della libreria completa Premium. Se vuoi, puoi scoprire questa versione adesso.",
    challengeActiveTitle: "Sfida già attiva",
    challengeActiveText: "Questa abitudine è già in una sfida di 21 giorni.",
    challengeLimitText:
      "Nel piano Free puoi avere solo 1 sfida attiva di 21 giorni alla volta. Premium ti permette di seguirne più di una.",
    challengeStartedTitle: "Sfida avviata",
    challengeStartedText: "La tua sfida di 21 giorni per \"{{value}}\" è iniziata.",
    challengeEndTitle: "Chiudi sfida",
    challengeEndText: "Vuoi chiudere questa sfida adesso?",
    challengeEndAction: "Chiudi",
    challengeCompletedTitle: "Sfida completata",
    challengeCompletedText: "Complimenti! Hai completato 21 giorni dell'abitudine \"{{value}}\".",
    removeHabitTitle: "Rimuovi abitudine",
    removeHabitTextWithChallenge:
      "Se rimuovi \"{{value}}\", anche la sfida attiva collegata verrà rimossa. Vuoi continuare?",
    removeHabitTextSimple: "Sei sicuro di voler rimuovere \"{{value}}\"?",
    removeHabitFallback: "questa abitudine",
    removeHabitAction: "Rimuovi",
    saveHabitsError: "Non è stato possibile salvare. Riprova.",
    saveChallengesError: "Non è stato possibile salvare le sfide.",
    saveChangesError: "Non è stato possibile salvare le modifiche.",
    loadHabitsError: "Non è stato possibile caricare le tue abitudini.",
    headerTitle: "Abitudini",
    headerSubtitle: "Oggi: {{done}} di {{total}} completate",
    planPremium: "Piano Premium",
    planFree: "Piano Free",
    executiveBadge: "Vista rapida del tuo ritmo",
    executiveTitleEmpty: "Il tuo pannello abitudini è ancora vuoto",
    executiveTitleProgress: "{{value}} oggi",
    metricToday: "Esecuzione di oggi",
    metricStreak: "Streak attuale",
    addHabitTitle: "Aggiungi abitudine",
    addHabitHintPremium: "Puoi ampliare la tua routine con più libertà.",
    addHabitHintFree: "Piano Free: fino a {{value}} abitudini attive.",
    addHabitPlaceholder: "Es.: Bere acqua, Leggere 10 min...",
    addHabitButton: "Aggiungi",
    addHabitLimit: "Limite",
    doneToday: "Completata oggi",
    notDoneToday: "Non completata oggi",
    challengeLabel: "Sfida",
    removeLabel: "Rimuovi",
    loading: "Caricamento...",
    pickerTitle: "Scegli abitudine",
    close: "Chiudi",
    searchPlaceholder: "Cerca abitudine...",
    freeNotice: "Nel Free, alcune abitudini appaiono come Premium.",
    lockedSuffix: " • Premium",
    lockedAvailable: "Disponibile in Premium",
    tapToAdd: "Tocca per aggiungere",
    emptySearchTitle: "Niente trovato",
    emptySearchText: "Prova a cercare “acqua”, “leggere”, “sonno”, “meditare”…",
    fullListButton: "Scopri la lista completa",
    skipTour: "Salta tour",
    smartEmpty:
      "Il tuo sistema di abitudini inizia dal primo passo. Crea poche abitudini, ma che entrino davvero nella tua routine.",
    smartFull:
      "Giornata chiusa con successo. Quando l'essenziale diventa standard, l'evoluzione smette di dipendere dalla motivazione.",
    smartGood:
      "Sei già sulla strada giusta. Manca poco per trasformare oggi in una giornata ben eseguita.",
    smartStreak:
      "La tua sequenza sta già guadagnando forza. Ora vale la pena proteggere il ritmo ed evitare buchi inutili.",
    smartBase:
      "Il segreto ora non è fare tutto. È ripetere l'essenziale finché l'abitudine smette di chiedere sforzo.",
  },
} as const;

const challengeCopyByLanguage = {
  pt: {
    tourStep: "Tour • {{current}}/{{total}}",
    challengeTitle: "Desafio 21 dias",
    challengeSubtitlePremium: "Premium: múltiplos desafios ativos",
    challengeSubtitleFree: "Free: 1 desafio ativo por vez",
    challengeActiveSingle: "{{value}} ativo",
    challengeActivePlural: "{{value}} ativos",
    challengeEmptyTitle: "Nenhum desafio ativo",
    challengeEmptyText:
      "Escolha um hábito da sua lista e toque em “Iniciar desafio” para começar sua jornada de 21 dias.",
    challengeCompletedMeta: "{{value}}/21 dias concluídos",
    challengeDay: "Dia {{value}}",
    challengeProgress: "{{value}}% concluído",
    challengeTodayDone: "Hoje concluído ✅",
    challengeCompleteToday: "Concluir hoje",
    challengeMissingHabit: "Hábito não encontrado.",
    finishedChallenges: "🎉 Desafios concluídos: {{value}}",
    habitsTitle: "Seus hábitos",
    habitsHint: "Toque no hábito para marcar como feito hoje ✅",
    emptyHabitsTitle: "Nenhum hábito ainda",
    emptyHabitsText:
      "Comece pequeno: 1 hábito por vez. Consistência vence intensidade.",
    challengeBadgeShort: "21 dias",
    tourNext: "Próximo",
    tourFinish: "Finalizar tour",
    pickFromList: "Escolher da lista",
    pickHintPremium: "Biblioteca completa por categorias",
    pickHintFree: "Biblioteca limitada por categorias",
    freeLimitReachedTitle: "Limite do Free atingido",
    freeLimitReachedText:
      "Você já alcançou o máximo de hábitos do plano Free. No Premium, sua evolução ganha mais espaço e menos freio.",
    challengeEndButton: "Encerrar",
  },
  en: {
    tourStep: "Tour • {{current}}/{{total}}",
    challengeTitle: "21-day challenge",
    challengeSubtitlePremium: "Premium: multiple active challenges",
    challengeSubtitleFree: "Free: 1 active challenge at a time",
    challengeActiveSingle: "{{value}} active",
    challengeActivePlural: "{{value}} active",
    challengeEmptyTitle: "No active challenge",
    challengeEmptyText:
      "Choose a habit from your list and tap “Start challenge” to begin your 21-day journey.",
    challengeCompletedMeta: "{{value}}/21 days completed",
    challengeDay: "Day {{value}}",
    challengeProgress: "{{value}}% completed",
    challengeTodayDone: "Done today ✅",
    challengeCompleteToday: "Complete today",
    challengeMissingHabit: "Habit not found.",
    finishedChallenges: "🎉 Challenges completed: {{value}}",
    habitsTitle: "Your habits",
    habitsHint: "Tap a habit to mark it as done today ✅",
    emptyHabitsTitle: "No habits yet",
    emptyHabitsText:
      "Start small: 1 habit at a time. Consistency beats intensity.",
    challengeBadgeShort: "21 days",
    tourNext: "Next",
    tourFinish: "Finish tour",
    pickFromList: "Choose from the list",
    pickHintPremium: "Full library by category",
    pickHintFree: "Limited library by category",
    freeLimitReachedTitle: "Free limit reached",
    freeLimitReachedText:
      "You already reached the maximum number of habits on the Free plan. On Premium, your progress gets more room and less friction.",
    challengeEndButton: "End",
  },
  es: {
    tourStep: "Tour • {{current}}/{{total}}",
    challengeTitle: "Desafío de 21 días",
    challengeSubtitlePremium: "Premium: múltiples desafíos activos",
    challengeSubtitleFree: "Free: 1 desafío activo por vez",
    challengeActiveSingle: "{{value}} activo",
    challengeActivePlural: "{{value}} activos",
    challengeEmptyTitle: "Ningún desafío activo",
    challengeEmptyText:
      "Elige un hábito de tu lista y toca “Iniciar desafío” para comenzar tu jornada de 21 días.",
    challengeCompletedMeta: "{{value}}/21 días completados",
    challengeDay: "Día {{value}}",
    challengeProgress: "{{value}}% completado",
    challengeTodayDone: "Hecho hoy ✅",
    challengeCompleteToday: "Completar hoy",
    challengeMissingHabit: "Hábito no encontrado.",
    finishedChallenges: "🎉 Desafíos completados: {{value}}",
    habitsTitle: "Tus hábitos",
    habitsHint: "Toca el hábito para marcarlo como hecho hoy ✅",
    emptyHabitsTitle: "Todavía no hay hábitos",
    emptyHabitsText:
      "Empieza pequeño: 1 hábito por vez. La constancia vence a la intensidad.",
    challengeBadgeShort: "21 días",
    tourNext: "Continuar",
    tourFinish: "Finalizar tour",
    pickFromList: "Elegir de la lista",
    pickHintPremium: "Biblioteca completa por categorías",
    pickHintFree: "Biblioteca limitada por categorías",
    freeLimitReachedTitle: "Límite de Free alcanzado",
    freeLimitReachedText:
      "Ya alcanzaste el máximo de hábitos del plan Free. En Premium, tu evolución gana más espacio y menos freno.",
    challengeEndButton: "Finalizar",
  },
  fr: {
    tourStep: "Tour • {{current}}/{{total}}",
    challengeTitle: "Défi de 21 jours",
    challengeSubtitlePremium: "Premium : plusieurs défis actifs",
    challengeSubtitleFree: "Free : 1 défi actif à la fois",
    challengeActiveSingle: "{{value}} actif",
    challengeActivePlural: "{{value}} actifs",
    challengeEmptyTitle: "Aucun défi actif",
    challengeEmptyText:
      "Choisissez une habitude dans votre liste et touchez “Démarrer le défi” pour commencer votre parcours de 21 jours.",
    challengeCompletedMeta: "{{value}}/21 jours accomplis",
    challengeDay: "Jour {{value}}",
    challengeProgress: "{{value}}% accompli",
    challengeTodayDone: "Fait aujourd'hui ✅",
    challengeCompleteToday: "Faire aujourd'hui",
    challengeMissingHabit: "Habitude introuvable.",
    finishedChallenges: "🎉 Défis terminés : {{value}}",
    habitsTitle: "Vos habitudes",
    habitsHint: "Touchez une habitude pour la marquer comme faite aujourd'hui ✅",
    emptyHabitsTitle: "Aucune habitude pour l'instant",
    emptyHabitsText:
      "Commencez petit : 1 habitude à la fois. La constance bat l'intensité.",
    challengeBadgeShort: "21 jours",
    tourNext: "Suivant",
    tourFinish: "Terminer le tour",
    pickFromList: "Choisir dans la liste",
    pickHintPremium: "Bibliothèque complète par catégories",
    pickHintFree: "Bibliothèque limitée par catégories",
    freeLimitReachedTitle: "Limite du Free atteinte",
    freeLimitReachedText:
      "Vous avez déjà atteint le nombre maximum d'habitudes du plan Free. Avec Premium, votre évolution gagne plus d'espace et moins de frein.",
    challengeEndButton: "Terminer",
  },
  it: {
    tourStep: "Tour • {{current}}/{{total}}",
    challengeTitle: "Sfida di 21 giorni",
    challengeSubtitlePremium: "Premium: più sfide attive",
    challengeSubtitleFree: "Free: 1 sfida attiva per volta",
    challengeActiveSingle: "{{value}} attiva",
    challengeActivePlural: "{{value}} attive",
    challengeEmptyTitle: "Nessuna sfida attiva",
    challengeEmptyText:
      "Scegli un'abitudine dalla tua lista e tocca “Avvia sfida” per iniziare il tuo percorso di 21 giorni.",
    challengeCompletedMeta: "{{value}}/21 giorni completati",
    challengeDay: "Giorno {{value}}",
    challengeProgress: "{{value}}% completato",
    challengeTodayDone: "Fatto oggi ✅",
    challengeCompleteToday: "Completa oggi",
    challengeMissingHabit: "Abitudine non trovata.",
    finishedChallenges: "🎉 Sfide completate: {{value}}",
    habitsTitle: "Le tue abitudini",
    habitsHint: "Tocca l'abitudine per segnarla come fatta oggi ✅",
    emptyHabitsTitle: "Ancora nessuna abitudine",
    emptyHabitsText:
      "Inizia in piccolo: 1 abitudine alla volta. La costanza batte l'intensità.",
    challengeBadgeShort: "21 giorni",
    tourNext: "Avanti",
    tourFinish: "Termina tour",
    pickFromList: "Scegli dalla lista",
    pickHintPremium: "Libreria completa per categorie",
    pickHintFree: "Libreria limitata per categorie",
    freeLimitReachedTitle: "Limite Free raggiunto",
    freeLimitReachedText:
      "Hai già raggiunto il numero massimo di abitudini del piano Free. Con Premium, la tua evoluzione ha più spazio e meno freni.",
    challengeEndButton: "Chiudi",
  },
} as const;

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function uniqueDates(dates: string[]) {
  return Array.from(new Set(dates));
}

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

function getPerformanceLabel(
  percent: number
): keyof typeof copyByLanguage.pt {
  if (percent >= 90) return "performanceExcellent";
  if (percent >= 70) return "performanceVeryGood";
  if (percent >= 40) return "performanceGood";
  if (percent >= 1) return "performanceGrowing";
  return "performanceStarting";
}

export default function Habitos() {
  const { settings, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const copy = useMemo(
    () => ({
      ...copyByLanguage[language],
      ...challengeCopyByLanguage[language],
    }),
    [language]
  );
  const habitsTourSteps = useMemo(
    () => [
      {
        icon: "add-outline" as const,
        title: copy.tour1Title,
        description: copy.tour1Description,
        primaryLabel: copy.tourNext,
      },
      {
        icon: "checkmark-circle-outline" as const,
        title: copy.tour2Title,
        description: copy.tour2Description,
        primaryLabel: copy.tourNext,
      },
      {
        icon: "rocket-outline" as const,
        title: copy.tour3Title,
        description: copy.tour3Description,
        primaryLabel: copy.tourFinish,
      },
    ],
    [copy]
  );

  const [habits, setHabits] = useState<Habit[]>([]);
  const [challenges, setChallenges] = useState<Challenge21[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showModuleTour, setShowModuleTour] = useState(false);
  const [moduleTourStepIndex, setModuleTourStepIndex] = useState(0);

  const [animatingHabitId, setAnimatingHabitId] = useState<string | null>(null);
  const itemScaleAnim = useRef(new Animated.Value(1)).current;

  const today = useMemo(() => todayKey(), []);

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const runHabitCompleteAnimation = useCallback(
    async (habitId: string) => {
      setAnimatingHabitId(habitId);

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      itemScaleAnim.setValue(1);

      Animated.sequence([
        Animated.timing(itemScaleAnim, {
          toValue: 1.035,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(itemScaleAnim, {
          toValue: 1,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimatingHabitId(null);
      });
    },
    [itemScaleAnim]
  );

  const carregarPremium = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PREMIUM_KEY);
      const effectivePlan = settings.plan === "premium" || raw === "premium";
      setIsPremium(effectivePlan);
    } catch {
      setIsPremium(settings.plan === "premium");
    }
  }, [settings.plan]);

  const carregarHabitos = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);

      if (!raw) {
        setHabits([]);
        return;
      }

      const parsed = JSON.parse(raw) as Habit[];

      setHabits(
        Array.isArray(parsed)
          ? parsed.map((h) => ({
              id: String(h.id),
              title: String(h.title ?? ""),
              createdAt: String(h.createdAt ?? new Date().toISOString()),
              completedDates: Array.isArray(h.completedDates)
                ? uniqueDates(h.completedDates.map(String))
                : [],
            }))
          : []
      );
    } catch (e) {
      console.log("Erro ao carregar hábitos:", e);
      Alert.alert(t("common.error"), copy.loadHabitsError);
      setHabits([]);
    }
  }, [copy.loadHabitsError, t]);

  const carregarDesafios = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CHALLENGE_KEY);

      if (!raw) {
        setChallenges([]);
        return;
      }

      const parsed = JSON.parse(raw) as Challenge21[];

      setChallenges(
        Array.isArray(parsed)
          ? parsed.map((c) => ({
              id: String(c.id),
              habitId: String(c.habitId ?? ""),
              habitTitle: String(c.habitTitle ?? ""),
              startedAt: String(c.startedAt ?? new Date().toISOString()),
              completedDates: Array.isArray(c.completedDates)
                ? uniqueDates(c.completedDates.map(String))
                : [],
              finishedAt: c.finishedAt ? String(c.finishedAt) : null,
              canceledAt: c.canceledAt ? String(c.canceledAt) : null,
            }))
          : []
      );
    } catch (e) {
      console.log("Erro ao carregar desafios:", e);
      setChallenges([]);
    }
  }, []);

  const salvarHabitos = useCallback(async (next: Habit[]) => {
    try {
      setHabits(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log("Erro ao salvar hábitos:", e);
      Alert.alert(t("common.error"), copy.saveHabitsError);
    }
  }, [copy.saveHabitsError, t]);

  const salvarDesafios = useCallback(async (next: Challenge21[]) => {
    try {
      setChallenges(next);
      await AsyncStorage.setItem(CHALLENGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log("Erro ao salvar desafios:", e);
      Alert.alert(t("common.error"), copy.saveChallengesError);
    }
  }, [copy.saveChallengesError, t]);

  const salvarTudo = useCallback(async (nextHabits: Habit[], nextChallenges: Challenge21[]) => {
    try {
      setHabits(nextHabits);
      setChallenges(nextChallenges);

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHabits)),
        AsyncStorage.setItem(CHALLENGE_KEY, JSON.stringify(nextChallenges)),
      ]);
    } catch (e) {
      console.log("Erro ao salvar dados:", e);
      Alert.alert(t("common.error"), copy.saveChangesError);
    }
  }, [copy.saveChangesError, t]);

  useEffect(() => {
    const carregarTudo = async () => {
      try {
        setLoading(true);
        await Promise.all([
          carregarPremium(),
          carregarHabitos(),
          carregarDesafios(),
        ]);
        await loadModuleTour();
      } finally {
        setLoading(false);
      }
    };

    carregarTudo();
  }, [carregarPremium, carregarHabitos, carregarDesafios, loadModuleTour]);

  useFocusEffect(
    useCallback(() => {
      const carregarTudo = async () => {
        await Promise.all([
          carregarPremium(),
          carregarHabitos(),
          carregarDesafios(),
        ]);
        await loadModuleTour();
      };

      carregarTudo();
    }, [carregarPremium, carregarHabitos, carregarDesafios, loadModuleTour])
  );

  const activeChallenges = useMemo(
    () => challenges.filter((c) => !c.finishedAt && !c.canceledAt),
    [challenges]
  );

  const finishedChallenges = useMemo(
    () => challenges.filter((c) => !!c.finishedAt && !c.canceledAt),
    [challenges]
  );

  const activeChallengeHabitIds = useMemo(
    () => new Set(activeChallenges.map((c) => c.habitId)),
    [activeChallenges]
  );
  const habitsLibrary = useMemo(
    () => getLocalizedHabitsLibrary(language),
    [language]
  );

  const feitosHoje = useMemo(() => {
    return habits.reduce(
      (acc, h) => acc + (h.completedDates.includes(today) ? 1 : 0),
      0
    );
  }, [habits, today]);

  const total = habits.length;
  const freeLimitReached = !isPremium && total >= FREE_MAX_HABITS;
  const progressoHoje = total > 0 ? Math.min(Math.round((feitosHoje / total) * 100), 100) : 0;
  const streakAtual = useMemo(() => getCurrentStreak(habits), [habits]);
  const activeHabitsTourStep = habitsTourSteps[moduleTourStepIndex];

  const smartInsight = useMemo(() => {
    if (total === 0) {
      return copy.smartEmpty;
    }

    if (progressoHoje >= 100) {
      return copy.smartFull;
    }

    if (progressoHoje >= 60) {
      return copy.smartGood;
    }

    if (streakAtual >= 7) {
      return copy.smartStreak;
    }

    return copy.smartBase;
  }, [copy, total, progressoHoje, streakAtual]);

  useEffect(() => {
    if (loading) return;

    const sincronizarNotificacoes = async () => {
      await rescheduleSmartNotifications({
        todayDone: feitosHoje,
        totalHabits: total,
        activeChallenges: activeChallenges.length,
        currentStreak: streakAtual,
      });
    };

    sincronizarNotificacoes();
  }, [loading, feitosHoje, total, activeChallenges.length, streakAtual]);

  const handleAdvanceModuleTour = useCallback(async () => {
    const lastStep = moduleTourStepIndex >= habitsTourSteps.length - 1;

    if (!lastStep) {
      setModuleTourStepIndex((current) => current + 1);
      return;
    }

    await completeJourneyModuleTour("habitos");
    setShowModuleTour(false);
  }, [moduleTourStepIndex, habitsTourSteps.length]);

  const handleSkipModuleTour = useCallback(async () => {
    await skipJourneyModuleTour("habitos");
    setShowModuleTour(false);
  }, []);

  const loadModuleTour = useCallback(async () => {
    try {
      const [aiPlanRaw, moduleTourState] = await Promise.all([
        AsyncStorage.getItem(AI_PLAN_KEY),
        readJourneyModuleTourState(),
      ]);

      const normalizedPlan = aiPlanRaw
        ? normalizeLifeJourneyPlan(JSON.parse(aiPlanRaw), language)
        : null;

      if (
        normalizedPlan?.primaryArea === "habitos" &&
        !moduleTourState.habitos
      ) {
        setModuleTourStepIndex(0);
        setShowModuleTour(true);
      } else {
        setShowModuleTour(false);
      }
    } catch (error) {
      console.log("Erro ao carregar tour de hábitos:", error);
      setShowModuleTour(false);
    }
  }, [language]);

  const ensureCanAddHabit = useCallback(() => {
    if (!isPremium && habits.length >= FREE_MAX_HABITS) {
      Alert.alert(
        copy.alertFreeLimitTitle,
        copy.alertFreeLimitText.replace("{{value}}", String(FREE_MAX_HABITS)),
        [
          { text: t("common.nowNot"), style: "cancel" },
          { text: t("common.knowPremium"), onPress: goToPremium },
        ]
      );
      return false;
    }

    return true;
  }, [copy.alertFreeLimitText, copy.alertFreeLimitTitle, goToPremium, habits.length, isPremium, t]);

  const adicionarHabitoTexto = useCallback(async () => {
    const title = newTitle.trim();

    if (!title) {
      Alert.alert(copy.alertEmptyTitle, copy.alertEmptyText);
      return;
    }

    if (!ensureCanAddHabit()) {
      return;
    }

    const exists = habits.some(
      (h) => normalizeText(h.title) === normalizeText(title)
    );

    if (exists) {
      Alert.alert(copy.alertExistsTitle, copy.alertExistsText);
      return;
    }

    const next: Habit[] = [
      {
        id: uid(),
        title,
        createdAt: new Date().toISOString(),
        completedDates: [],
      },
      ...habits,
    ];

    setNewTitle("");
    await salvarHabitos(next);
  }, [copy.alertEmptyText, copy.alertEmptyTitle, copy.alertExistsText, copy.alertExistsTitle, newTitle, habits, salvarHabitos, ensureCanAddHabit]);

  const adicionarHabitoDaLista = useCallback(
    async (item: HabitItem) => {
      const locked = !!item.isPremium && !isPremium;

      if (locked) {
        Alert.alert(
          copy.alertPremiumHabitTitle,
          copy.alertPremiumHabitText,
          [
            { text: t("common.nowNot"), style: "cancel" },
            {
              text: t("common.knowPremium"),
              onPress: () => {
                setPickerOpen(false);
                goToPremium();
              },
            },
          ]
        );
        return;
      }

      if (!ensureCanAddHabit()) {
        return;
      }

      const exists = habits.some(
        (h) => normalizeText(h.title) === normalizeText(item.title)
      );

      if (exists) {
        Alert.alert(copy.alertExistsTitle, copy.alertExistsText);
        return;
      }

      const next: Habit[] = [
        {
          id: uid(),
          title: item.title,
          createdAt: new Date().toISOString(),
          completedDates: [],
        },
        ...habits,
      ];

      await salvarHabitos(next);
      setPickerOpen(false);
      setSearch("");
    },
    [
      copy.alertExistsText,
      copy.alertExistsTitle,
      copy.alertPremiumHabitText,
      copy.alertPremiumHabitTitle,
      habits,
      isPremium,
      salvarHabitos,
      goToPremium,
      ensureCanAddHabit,
      t,
    ]
  );

  const iniciarDesafio = useCallback(
    async (habit: Habit) => {
      const alreadyActive = activeChallenges.some((c) => c.habitId === habit.id);

      if (alreadyActive) {
        Alert.alert(copy.challengeActiveTitle, copy.challengeActiveText);
        return;
      }

      if (!isPremium && activeChallenges.length >= 1) {
        Alert.alert(
          copy.alertFreeLimitTitle,
          copy.challengeLimitText,
          [
            { text: t("common.nowNot"), style: "cancel" },
            {
              text: t("common.knowPremium"),
              onPress: goToPremium,
            },
          ]
        );
        return;
      }

      const newChallenge: Challenge21 = {
        id: uid(),
        habitId: habit.id,
        habitTitle: habit.title,
        startedAt: new Date().toISOString(),
        completedDates: habit.completedDates.includes(today) ? [today] : [],
        finishedAt: null,
        canceledAt: null,
      };

      const nextChallenges = [newChallenge, ...challenges];
      await salvarDesafios(nextChallenges);

      Alert.alert(
        copy.challengeStartedTitle,
        copy.challengeStartedText.replace("{{value}}", habit.title)
      );
    },
    [
      activeChallenges,
      challenges,
      copy.alertFreeLimitTitle,
      copy.challengeActiveText,
      copy.challengeActiveTitle,
      copy.challengeLimitText,
      copy.challengeStartedText,
      copy.challengeStartedTitle,
      isPremium,
      salvarDesafios,
      today,
      goToPremium,
      t,
    ]
  );

  const encerrarDesafio = useCallback(
    async (challengeId: string) => {
      Alert.alert(copy.challengeEndTitle, copy.challengeEndText, [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: copy.challengeEndAction,
          style: "destructive",
          onPress: async () => {
            const next = challenges.map((c) =>
              c.id === challengeId
                ? {
                    ...c,
                    canceledAt: new Date().toISOString(),
                  }
                : c
            );

            await salvarDesafios(next);
          },
        },
      ]);
    },
    [challenges, copy.challengeEndAction, copy.challengeEndText, copy.challengeEndTitle, salvarDesafios, t]
  );

  const toggleHoje = useCallback(
    async (habitId: string) => {
      const nextHabits = habits.map((h) => {
        if (h.id !== habitId) return h;

        const hasToday = h.completedDates.includes(today);
        const completedDates = hasToday
          ? h.completedDates.filter((d) => d !== today)
          : [today, ...h.completedDates];

        return { ...h, completedDates: uniqueDates(completedDates) };
      });

      const habitAfterToggle = nextHabits.find((h) => h.id === habitId);
      const doneAfterToggle = !!habitAfterToggle?.completedDates.includes(today);

      const nextChallenges = challenges.map((c) => {
        if (c.canceledAt || c.finishedAt || c.habitId !== habitId) return c;

        let completedDates = c.completedDates;

        if (doneAfterToggle && !completedDates.includes(today)) {
          completedDates = [today, ...completedDates];
        }

        if (!doneAfterToggle && completedDates.includes(today)) {
          completedDates = completedDates.filter((d) => d !== today);
        }

        completedDates = uniqueDates(completedDates);

        const finishedAt =
          completedDates.length >= 21
            ? c.finishedAt ?? new Date().toISOString()
            : null;

        return {
          ...c,
          completedDates,
          finishedAt,
        };
      });

      await salvarTudo(nextHabits, nextChallenges);

      if (doneAfterToggle) {
        runHabitCompleteAnimation(habitId);
      }

      const finishedNow = nextChallenges.find(
        (c) =>
          c.habitId === habitId &&
          !!c.finishedAt &&
          c.completedDates.length >= 21
      );

      if (finishedNow && doneAfterToggle) {
        Alert.alert(
          copy.challengeCompletedTitle,
          copy.challengeCompletedText.replace("{{value}}", finishedNow.habitTitle)
        );
      }
    },
    [habits, challenges, copy.challengeCompletedText, copy.challengeCompletedTitle, salvarTudo, today, runHabitCompleteAnimation]
  );

  const removerHabito = useCallback(
    (habitId: string) => {
      const habit = habits.find((h) => h.id === habitId);
      const hasChallenge = challenges.some(
        (c) => c.habitId === habitId && !c.finishedAt && !c.canceledAt
      );

      Alert.alert(
        copy.removeHabitTitle,
        hasChallenge
          ? copy.removeHabitTextWithChallenge.replace(
              "{{value}}",
              habit?.title ?? copy.removeHabitFallback
            )
          : copy.removeHabitTextSimple.replace(
              "{{value}}",
              habit?.title ?? copy.removeHabitFallback
            ),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: copy.removeHabitAction,
            style: "destructive",
            onPress: async () => {
              const nextHabits = habits.filter((h) => h.id !== habitId);
              const nextChallenges = challenges.filter((c) => c.habitId !== habitId);
              await salvarTudo(nextHabits, nextChallenges);
            },
          },
        ]
      );
    },
    [
      habits,
      challenges,
      copy.removeHabitAction,
      copy.removeHabitFallback,
      copy.removeHabitTextSimple,
      copy.removeHabitTextWithChallenge,
      copy.removeHabitTitle,
      salvarTudo,
      t,
    ]
  );

  const filteredLibrary: HabitCategory[] = useMemo(() => {
    const q = normalizeText(search);

    const cats = habitsLibrary.map((cat) => {
      let items = cat.items;

      if (!isPremium && !FREE_POLICY.showLockedPremiumItems) {
        items = items.filter((i) => !i.isPremium);
      }

      if (!q) {
        return { ...cat, items };
      }

      const filtered = items.filter((i) =>
        normalizeText(i.title).includes(q)
      );

      return { ...cat, items: filtered };
    }).filter((cat) => cat.items.length > 0);

    return cats;
  }, [habitsLibrary, isPremium, search]);

  const flatPickerItems = useMemo(() => {
    const out: (
      | { type: "header"; id: string; title: string }
      | { type: "item"; id: string; item: HabitItem }
    )[] = [];

    filteredLibrary.forEach((cat) => {
      out.push({
        type: "header",
        id: `header_${cat.id}`,
        title: cat.title,
      });

      cat.items.forEach((it) => {
        out.push({
          type: "item",
          id: it.id,
          item: it,
        });
      });
    });

    return out;
  }, [filteredLibrary]);

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <AppScreenHeader
          title={copy.headerTitle}
          subtitle={copy.headerSubtitle
            .replace("{{done}}", String(feitosHoje))
            .replace("{{total}}", String(total))}
          icon="leaf-outline"
          showBack={false}
          badgeLabel={isPremium ? t("common.premium") : t("common.free")}
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={goToPremium}
        />

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isPremium
                  ? colors.successSoft
                  : colors.surfaceAlt,
                borderColor: isPremium ? colors.success : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isPremium ? colors.success : colors.text },
              ]}
            >
              {isPremium ? copy.planPremium : copy.planFree}
            </Text>
          </View>
        </View>
      </View>

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
            {copy.executiveBadge}
          </Text>
        </View>

        <Text style={[styles.executiveTitle, { color: colors.text }]}>
          {total === 0
            ? copy.executiveTitleEmpty
            : copy.executiveTitleProgress.replace(
                "{{value}}",
                copy[getPerformanceLabel(progressoHoje)]
              )}
        </Text>

        <Text style={[styles.executiveDescription, { color: colors.textSecondary }]}>
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
              {progressoHoje}%
            </Text>
            <Text style={[styles.executiveMiniLabel, { color: colors.textMuted }]}>
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
              {streakAtual}
            </Text>
            <Text style={[styles.executiveMiniLabel, { color: colors.textMuted }]}>
              {copy.metricStreak}
            </Text>
          </View>
        </View>

        {total > 0 ? (
          <View
            style={[
              styles.heroProgressTrack,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${progressoHoje}%`,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {copy.addHabitTitle}
        </Text>

        <Text style={[styles.cardHint, { color: colors.textSecondary }]}>
          {isPremium
            ? copy.addHabitHintPremium
            : copy.addHabitHintFree.replace("{{value}}", String(FREE_MAX_HABITS))}
        </Text>

        <View style={styles.row}>
          <TextInput
            placeholder={copy.addHabitPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            editable={!freeLimitReached}
            returnKeyType="done"
            onSubmitEditing={adicionarHabitoTexto}
          />

          <Pressable
            style={[
              styles.addButton,
              {
                backgroundColor: freeLimitReached ? colors.border : colors.accent,
                borderColor: freeLimitReached ? colors.border : colors.accent,
                opacity: freeLimitReached ? 0.72 : 1,
              },
            ]}
            onPress={adicionarHabitoTexto}
            disabled={freeLimitReached}
          >
            <Text style={styles.addButtonText}>
              {freeLimitReached ? copy.addHabitLimit : copy.addHabitButton}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.pickButton,
            {
              backgroundColor: colors.accentSoft,
              borderColor: colors.accentBorder,
              opacity: freeLimitReached ? 0.72 : 1,
            },
          ]}
          onPress={() => {
            if (freeLimitReached) {
              ensureCanAddHabit();
              return;
            }
            setPickerOpen(true);
          }}
        >
          <Text style={[styles.pickButtonText, { color: colors.accent }]}>
            {copy.pickFromList}
          </Text>
          <Text style={[styles.pickButtonHint, { color: colors.accent }]}>
            {isPremium ? copy.pickHintPremium : copy.pickHintFree}
          </Text>
        </Pressable>

        {freeLimitReached ? (
          <View
            style={[
              styles.limitCard,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.accentBorder,
              },
            ]}
            >
            <Text style={[styles.limitTitle, { color: colors.text }]}>
              {copy.freeLimitReachedTitle}
            </Text>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>
              {copy.freeLimitReachedText}
            </Text>

            <Pressable
              style={[styles.upgradeButtonSmall, { backgroundColor: colors.accent }]}
              onPress={goToPremium}
            >
              <Text style={styles.upgradeButtonText}>{t("common.knowPremium")}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.challengeSection}>
        <View style={styles.challengeHeader}>
          <View>
            <Text style={[styles.challengeTitle, { color: colors.text }]}>
              {copy.challengeTitle}
            </Text>
            <Text style={[styles.challengeSubtitle, { color: colors.textSecondary }]}>
              {isPremium
                ? copy.challengeSubtitlePremium
                : copy.challengeSubtitleFree}
            </Text>
          </View>

          <View
            style={[
              styles.challengeBadge,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text style={[styles.challengeBadgeText, { color: colors.accent }]}>
              {(activeChallenges.length === 1
                ? copy.challengeActiveSingle
                : copy.challengeActivePlural
              ).replace("{{value}}", String(activeChallenges.length))}
            </Text>
          </View>
        </View>

        {activeChallenges.length === 0 ? (
          <View
            style={[
              styles.challengeEmpty,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.challengeEmptyTitle, { color: colors.text }]}>
              {copy.challengeEmptyTitle}
            </Text>
            <Text style={[styles.challengeEmptyText, { color: colors.textSecondary }]}>
              {copy.challengeEmptyText}
            </Text>
          </View>
        ) : (
          activeChallenges.map((challenge) => {
            const progress = Math.min(challenge.completedDates.length / 21, 1);
            const doneToday = challenge.completedDates.includes(today);
            const habitExists = habits.some((h) => h.id === challenge.habitId);
            const currentDay = getChallengeCurrentDay(challenge.startedAt, today);

            return (
              <View
                key={challenge.id}
                style={[
                  styles.challengeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <View style={styles.challengeCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.challengeCardTitle, { color: colors.text }]}>
                      {challenge.habitTitle}
                    </Text>
                    <Text style={[styles.challengeCardMeta, { color: colors.textSecondary }]}>
                      {copy.challengeCompletedMeta.replace(
                        "{{value}}",
                        String(challenge.completedDates.length)
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.challengeDayPill,
                      {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accentBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.challengeDayPillText,
                        { color: colors.accent },
                      ]}
                    >
                      {copy.challengeDay.replace("{{value}}", String(currentDay))}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.progressLabel, { color: colors.accent }]}>
                  {copy.challengeProgress.replace(
                    "{{value}}",
                    String(Math.round(progress * 100))
                  )}
                </Text>

                <View style={styles.challengeActions}>
                  {habitExists ? (
                    <Pressable
                      style={[
                        styles.challengePrimaryButton,
                        { backgroundColor: colors.accent },
                        doneToday && {
                          backgroundColor: colors.accentSoft,
                          borderWidth: 1,
                          borderColor: colors.success,
                        },
                      ]}
                      onPress={() => toggleHoje(challenge.habitId)}
                    >
                      <Text
                        style={[
                          styles.challengePrimaryButtonText,
                          doneToday && {
                            color: colors.success,
                          },
                        ]}
                      >
                        {doneToday
                          ? copy.challengeTodayDone
                          : copy.challengeCompleteToday}
                      </Text>
                    </Pressable>
                  ) : (
                    <View
                      style={[
                        styles.challengeMissingHabit,
                        { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      <Text
                        style={[
                          styles.challengeMissingHabitText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {copy.challengeMissingHabit}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    style={[
                      styles.challengeSecondaryButton,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.danger,
                      },
                    ]}
                    onPress={() => encerrarDesafio(challenge.id)}
                  >
                    <Text
                      style={[
                        styles.challengeSecondaryButtonText,
                        { color: colors.danger },
                      ]}
                    >
                      {copy.challengeEndButton}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {finishedChallenges.length > 0 ? (
          <View
            style={[
              styles.challengeHistoryBox,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.success,
              },
            ]}
          >
            <Text
              style={[
                styles.challengeHistoryText,
                { color: colors.success },
              ]}
            >
              {copy.finishedChallenges.replace(
                "{{value}}",
                String(finishedChallenges.length)
              )}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {copy.habitsTitle}
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          {copy.habitsHint}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
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
                  {copy.emptyHabitsTitle}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {copy.emptyHabitsText}
                </Text>
              </View>
            }
          renderItem={({ item }) => {
            const done = item.completedDates.includes(today);
            const isInChallenge = activeChallengeHabitIds.has(item.id);
            const isAnimating = animatingHabitId === item.id;

            return (
              <Animated.View
                style={[
                  isAnimating && {
                    transform: [{ scale: itemScaleAnim }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.item,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.check,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                      done && {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.success,
                      },
                    ]}
                    onPress={() => toggleHoje(item.id)}
                  >
                    <Text
                      style={[
                        styles.checkText,
                        { color: colors.textMuted },
                        done && { color: colors.success },
                      ]}
                    >
                      {done ? "✓" : "○"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.itemMain}
                    onPress={() => toggleHoje(item.id)}
                  >
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: colors.text },
                        done && {
                          color: colors.textSecondary,
                          textDecorationLine: "line-through",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                      {done ? copy.doneToday : copy.notDoneToday}
                    </Text>
                  </Pressable>

                  <View style={styles.itemRight}>
                    {isInChallenge ? (
                      <View
                        style={[
                          styles.itemChallengeBadge,
                          {
                            backgroundColor: colors.accentSoft,
                            borderColor: colors.success,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.itemChallengeBadgeText,
                            { color: colors.success },
                          ]}
                        >
                          {copy.challengeBadgeShort}
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[
                          styles.challengeMiniButton,
                          {
                            backgroundColor: colors.accentSoft,
                            borderColor: colors.accentBorder,
                          },
                        ]}
                        onPress={() => iniciarDesafio(item)}
                      >
                        <Text
                          style={[
                            styles.challengeMiniButtonText,
                            { color: colors.accent },
                          ]}
                        >
                          {copy.challengeLabel}
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={[
                        styles.removeBtn,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.danger,
                        },
                      ]}
                      onPress={() => removerHabito(item.id)}
                    >
                      <Text
                        style={[
                          styles.removeBtnText,
                          { color: colors.danger },
                        ]}
                      >
                        {copy.removeLabel}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            );
          }}
        />

        {loading ? (
          <View style={styles.loadingOverlay}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {copy.loading}
            </Text>
          </View>
        ) : null}

        <Modal
          visible={pickerOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setPickerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {copy.pickerTitle}
                </Text>

                <Pressable
                  style={[
                    styles.modalClose,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setPickerOpen(false)}
                >
                  <Text
                    style={[styles.modalCloseText, { color: colors.text }]}
                  >
                    {copy.close}
                  </Text>
                </Pressable>
              </View>

              <TextInput
                placeholder={copy.searchPlaceholder}
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
              />

              {!isPremium ? (
                <View
                  style={[
                    styles.freeNotice,
                    {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.freeNoticeText, { color: colors.accent }]}
                  >
                    {copy.freeNotice}
                  </Text>
                </View>
              ) : null}

              <FlatList
                data={flatPickerItems}
                keyExtractor={(x) => x.id}
                contentContainerStyle={styles.pickerList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  if (item.type === "header") {
                    return (
                      <Text style={[styles.catHeader, { color: colors.text }]}>
                        {item.title}
                      </Text>
                    );
                  }

                  const locked = !!item.item.isPremium && !isPremium;

                  return (
                    <Pressable
                      style={[
                        styles.pickerItem,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        locked && {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.warning,
                        },
                      ]}
                      onPress={() => adicionarHabitoDaLista(item.item)}
                    >
                      <Text
                        style={[styles.pickerItemTitle, { color: colors.text }]}
                      >
                        {item.item.title}
                        {locked ? copy.lockedSuffix : ""}
                      </Text>

                      <Text
                        style={[
                          styles.pickerItemSub,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {locked
                          ? copy.lockedAvailable
                          : copy.tapToAdd}
                      </Text>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
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
                      {copy.emptySearchTitle}
                    </Text>
                    <Text
                      style={[styles.emptyText, { color: colors.textSecondary }]}
                    >
                      {copy.emptySearchText}
                    </Text>
                  </View>
                }
              />

              {!isPremium ? (
                <Pressable
                  style={[
                    styles.premiumCta,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={() => {
                    setPickerOpen(false);
                    goToPremium();
                  }}
                >
                  <Text style={styles.premiumCtaText}>
                    {copy.fullListButton}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Modal>

        {showModuleTour && activeHabitsTourStep ? (
          <GuidedTourOverlay
            visible={showModuleTour}
            icon={activeHabitsTourStep.icon}
            title={activeHabitsTourStep.title}
            description={activeHabitsTourStep.description}
            stepLabel={copy.tourStep
              .replace("{{current}}", String(moduleTourStepIndex + 1))
              .replace("{{total}}", String(habitsTourSteps.length))}
            accentColor={colors.accent}
            surfaceColor={colors.surface}
            borderColor={colors.border}
            textColor={colors.text}
            textSecondaryColor={colors.textSecondary}
            primaryLabel={activeHabitsTourStep.primaryLabel}
            onPrimary={() => {
              void handleAdvanceModuleTour();
            }}
            secondaryLabel={copy.skipTour}
            onSecondary={() => {
              void handleSkipModuleTour();
            }}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  header: {
    paddingTop: 8,
    paddingBottom: 14,
  },

  badgeRow: {
    marginTop: -2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  badgeText: {
    fontWeight: "800",
    fontSize: 12,
  },

  badgeCta: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  badgeCtaText: {
    fontWeight: "800",
    fontSize: 12,
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

  heroProgressTrack: {
    marginTop: 14,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
  },

  heroProgressFill: {
    height: "100%",
    borderRadius: 999,
  },

  upgradeCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },

  upgradeTitle: {
    fontWeight: "900",
    fontSize: 16,
  },

  upgradeText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },

  upgradeButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  upgradeButtonSmall: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  upgradeButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  cardTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },

  cardHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },

  addButton: {
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  addButtonText: {
    color: "white",
    fontWeight: "800",
  },

  pickButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  pickButtonText: {
    fontWeight: "800",
    fontSize: 14,
  },

  pickButtonHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  limitCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  limitTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  limitText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },

  challengeSection: {
    marginTop: 16,
    marginBottom: 8,
  },

  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },

  challengeTitle: {
    fontWeight: "900",
    fontSize: 18,
  },

  challengeSubtitle: {
    marginTop: 4,
    fontSize: 12,
  },

  challengeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  challengeBadgeText: {
    fontWeight: "800",
    fontSize: 12,
  },

  challengeEmpty: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },

  challengeEmptyTitle: {
    fontWeight: "800",
    fontSize: 15,
  },

  challengeEmptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },

  challengeCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },

  challengeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  challengeCardTitle: {
    fontWeight: "900",
    fontSize: 16,
  },

  challengeCardMeta: {
    marginTop: 4,
    fontSize: 12,
  },

  challengeDayPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  challengeDayPillText: {
    fontWeight: "800",
    fontSize: 12,
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  progressLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
  },

  challengeActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  challengePrimaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  challengePrimaryButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },

  challengeSecondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  challengeSecondaryButtonText: {
    fontWeight: "800",
    fontSize: 12,
  },

  challengeMissingHabit: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
  },

  challengeMissingHabitText: {
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },

  challengeHistoryBox: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  challengeHistoryText: {
    fontWeight: "800",
    fontSize: 13,
  },

  listHeader: {
    marginTop: 16,
    marginBottom: 10,
  },

  sectionTitle: {
    fontWeight: "800",
    fontSize: 16,
  },

  sectionHint: {
    marginTop: 4,
    fontSize: 12,
  },

  listContent: {
    paddingBottom: 120,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },

  check: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  checkText: {
    fontSize: 18,
    fontWeight: "900",
  },

  itemMain: {
    flex: 1,
    paddingHorizontal: 12,
  },

  itemTitle: {
    fontSize: 16,
    fontWeight: "800",
  },

  itemMeta: {
    marginTop: 4,
    fontSize: 12,
  },

  itemRight: {
    alignItems: "flex-end",
    gap: 8,
  },

  challengeMiniButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  challengeMiniButtonText: {
    fontWeight: "800",
    fontSize: 11,
  },

  itemChallengeBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  itemChallengeBadgeText: {
    fontWeight: "800",
    fontSize: 11,
  },

  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },

  removeBtnText: {
    fontWeight: "800",
    fontSize: 12,
  },

  emptyBox: {
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },

  emptyTitle: {
    fontWeight: "900",
    fontSize: 16,
  },

  emptyText: {
    marginTop: 8,
    lineHeight: 18,
    fontSize: 13,
  },

  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: "center",
  },

  loadingText: {
    fontWeight: "700",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },

  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 14,
    borderWidth: 1,
    maxHeight: "88%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  modalTitle: {
    fontWeight: "900",
    fontSize: 16,
  },

  modalClose: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },

  modalCloseText: {
    fontWeight: "800",
    fontSize: 12,
  },

  searchInput: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 10,
  },

  freeNotice: {
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },

  freeNoticeText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },

  pickerList: {
    paddingBottom: 18,
  },

  catHeader: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
  },

  pickerItem: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },

  pickerItemTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  pickerItemSub: {
    fontSize: 12,
    marginTop: 4,
  },

  premiumCta: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  premiumCtaText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
});
