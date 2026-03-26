import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import GuidedTourOverlay from "../components/GuidedTourOverlay";
import { BankConnection } from "./services/openFinance";
import { listRealAccounts, listRealTransactions } from "./services/openFinanceApi";
import {
  AI_JOURNEY_PROGRESS_KEY,
  AI_PLAN_KEY,
  evaluateJourney,
  type AIJourneyProgress,
  type LifeJourneyPlan,
} from "./utils/lifeJourney";
import {
  completeJourneyModuleTour,
  readJourneyModuleTourState,
  skipJourneyModuleTour,
} from "./utils/journeyTour";
import { useAppLanguage } from "./utils/languageContext";
import {
  formatCurrencyByLanguage,
  formatDateTimeByLanguage,
  formatMaskedCurrencyByLanguage,
  formatMonthYearByLanguage,
} from "./utils/locale";
import { useAppTheme } from "./utils/themeContext";

type SubscriptionPlan = "free" | "premium";
type MoneyEntryType = "entrada" | "saida";

type MoneyCategory =
  | "Moradia"
  | "Alimentação"
  | "Transporte"
  | "Lazer"
  | "Investimentos"
  | "Educação"
  | "Saúde"
  | "Outros";

type MoneyEntry = {
  id: string;
  title: string;
  amount: number;
  type: MoneyEntryType;
  category: MoneyCategory;
  createdAt: string;
  source?: "open_finance";
  institutionId?: string;
  institutionName?: string;
  externalId?: string;
  tags?: string[];
  isRecurring?: boolean;
  notes?: string;
};

type MoneyGoal = {
  target: number;
};

type FixedBillCategory =
  | "Moradia"
  | "Alimentação"
  | "Transporte"
  | "Saúde"
  | "Educação"
  | "Lazer"
  | "Serviços"
  | "Assinaturas"
  | "Outros";

type FixedBill = {
  id: string;
  title: string;
  amount: number;
  dueDay: number;
  category: FixedBillCategory;
  lastPaidPeriod?: string | null;
  createdAt: string;
};

type FilterPeriod = "month" | "3months" | "6months" | "all";

type MoneyJourneyAction =
  | "entry"
  | "bill"
  | "goals"
  | "learning"
  | "time"
  | "work"
  | "leisure"
  | "checkin"
  | "spiritual"
  | "habits"
  | "bank"
  | "upgrade";

type MoneyJourneyGuide = {
  headerSubtitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaTitle: string;
  ctaText: string;
  ctaButtonLabel: string;
  action: MoneyJourneyAction;
};

type MoneyJourneyModule = {
  label: string;
  action: MoneyJourneyAction;
};

const MONEY_ENTRIES_KEY = "@vida_em_ordem_money_entries_v1";
const MONEY_GOAL_KEY = "@vida_em_ordem_money_goal_v1";
const MONEY_FIXED_BILLS_KEY = "@vida_em_ordem_money_fixed_bills_v2";
const BANK_CONNECTIONS_KEY = "@vida_em_ordem_bank_connections_v2";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

const FREE_MAX_MANUAL_ENTRIES = 30;
const FREE_MAX_FIXED_BILLS = 3;
const DUPLICATE_ENTRY_WINDOW_MS = 2 * 60 * 1000;

const CATEGORIES: MoneyCategory[] = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Lazer",
  "Investimentos",
  "Educação",
  "Saúde",
  "Outros",
];

const FIXED_BILL_CATEGORIES: FixedBillCategory[] = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Serviços",
  "Assinaturas",
  "Outros",
];

const FILTER_OPTIONS: { key: FilterPeriod; label: string }[] = [
  { key: "month", label: "Mês atual" },
  { key: "3months", label: "3 meses" },
  { key: "6months", label: "6 meses" },
  { key: "all", label: "Total" },
];

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getCategoryEmoji(category: MoneyCategory | FixedBillCategory) {
  switch (category) {
    case "Moradia":
      return "🏠";
    case "Alimentação":
      return "🍽️";
    case "Transporte":
      return "🚗";
    case "Lazer":
      return "🎉";
    case "Investimentos":
      return "📈";
    case "Educação":
      return "📚";
    case "Saúde":
      return "💊";
    case "Serviços":
      return "🧾";
    case "Assinaturas":
      return "📲";
    case "Outros":
    default:
      return "📦";
  }
}

const moneyDeepUiCopyByLanguage = {
  pt: {
    categoryLabels: {
      Moradia: "Moradia",
      "Alimentação": "Alimentação",
      Transporte: "Transporte",
      Lazer: "Lazer",
      Investimentos: "Investimentos",
      "Educação": "Educação",
      "Saúde": "Saúde",
      Serviços: "Serviços",
      Assinaturas: "Assinaturas",
      Outros: "Outros",
    } as Record<MoneyCategory | FixedBillCategory, string>,
    accountBalance: (value: string) => `Saldo: ${value}`,
    monthPanelTitle: "Painel do mês",
    fixedSummaryTotal: "fixas mensais",
    fixedSummaryVariable: "variáveis do mês",
    fixedSummaryPaid: "fixas pagas",
    fixedSummaryPending: "fixas pendentes",
    monthlyAlertsTitle: "Alertas do mês",
    monthlyAlertsText: (today: number, upcoming: number, overdue: number) =>
      `Hoje: ${today} • Próximos 3 dias: ${upcoming} • Atrasadas: ${overdue}`,
    fixedBillsTitle: "Contas fixas mensais",
    freeFixedBillsInfo: (limit: number, remaining: number) =>
      `Free: até ${limit} contas fixas. Restam ${remaining}.`,
    addFixedBill: "Adicionar conta fixa",
    freeLimitReached: "Limite Free atingido",
    emptyFixedBillsTitle: "Nenhuma conta fixa cadastrada",
    emptyFixedBillsText:
      "Cadastre aluguel, energia, água, internet, assinaturas e outras despesas mensais.",
    dueDayText: (day: number) => `vence dia ${day}`,
    statusPaid: "Pago",
    statusOverdue: "Atrasado",
    statusDueToday: "Vence hoje",
    statusDueSoon: "Vence em breve",
    statusPending: "Pendente",
    markPending: "Marcar pendente",
    markPaid: "Marcar pago",
    edit: "Editar",
    entriesTitle: "Movimentações",
    freeEntriesInfo: (limit: number, remaining: number) =>
      `Free: até ${limit} movimentações manuais. Restam ${remaining}.`,
    addEntry: "Adicionar movimentação",
    monthlySummaryTitle: "Resumo mensal",
    emptyMonthlyDataTitle: "Sem dados mensais ainda",
    emptyMonthlyDataText:
      "Adicione movimentações para visualizar o gráfico de entradas e saídas.",
    chartIncome: "Entradas",
    chartExpense: "Saídas",
    recentTransactionsTitle: "Transações recentes",
    emptyRecentTransactionsTitle: "Nenhuma transação ainda",
    emptyRecentTransactionsText:
      "As últimas movimentações aparecerão aqui com visual mais rápido para leitura.",
    importedSource: "Open Finance",
    categoriesTitle: "Categorias",
    categoriesPremiumTitle: "Categorias detalhadas são Premium",
    categoriesPremiumText:
      "No Premium você desbloqueia análise por categoria, distribuição e visão detalhada dos lançamentos.",
    unlock: "Desbloquear",
    emptyCategoriesTitle: "Nenhuma categoria com dados ainda",
    emptyCategoriesText:
      "Adicione movimentações para visualizar o resumo por categoria.",
    balanceLabel: (value: string) => `Saldo: ${value}`,
    tapToHide: "Toque para ocultar",
    tapToViewEntries: "Toque para ver lançamentos",
    distributionTitle: "Distribuição por categoria",
    distributionPremiumTitle: "Distribuição visual é Premium",
    distributionPremiumText:
      "Tenha gráficos e comparativos mais avançados com o plano Premium.",
    distributionPremiumButton: "Quero Premium",
    emptyDistributionTitle: "Sem distribuição ainda",
    emptyDistributionText:
      "Quando houver movimentações, o peso de cada categoria aparecerá aqui.",
    entryCount: (count: number) => `${count} lançamento(s)`,
    emptyDetailTitle: "Sem lançamentos",
    emptyDetailText: "Essa categoria ainda não possui movimentações.",
    newEntryTitle: "Nova movimentação",
    freeLimitRealtimeTitle: "Limite Free em tempo real",
    manualUsageText: (used: number, limit: number) =>
      `Você usou ${used} de ${limit} lançamentos manuais.`,
    duplicateWarningTitle: "Possível duplicidade detectada",
    duplicateWarningText: "Já existe um lançamento igual salvo há pouco tempo.",
    descriptionPlaceholder: "Descrição",
    amountPlaceholder: "Valor",
    entryTypeIncome: "Entrada",
    entryTypeExpense: "Saída",
    categoryTitle: "Categoria",
    modalUpgradeText: "Upgrade para remover limites e automatizar importações",
    saveEntry: "Salvar movimentação",
    editFixedBillTitle: "Editar conta fixa",
    newFixedBillTitle: "Nova conta fixa",
    fixedBillsUsageText: (used: number, limit: number) =>
      `Você usou ${used} de ${limit} contas fixas.`,
    billNamePlaceholder: "Nome da conta",
    dueDayPlaceholder: "Dia do vencimento (1 a 31)",
    saveChanges: "Salvar alterações",
    saveBill: "Salvar conta",
  },
  en: {
    categoryLabels: {
      Moradia: "Housing",
      "Alimentação": "Food",
      Transporte: "Transport",
      Lazer: "Leisure",
      Investimentos: "Investments",
      "Educação": "Education",
      "Saúde": "Health",
      Serviços: "Services",
      Assinaturas: "Subscriptions",
      Outros: "Other",
    } as Record<MoneyCategory | FixedBillCategory, string>,
    accountBalance: (value: string) => `Balance: ${value}`,
    monthPanelTitle: "Month dashboard",
    fixedSummaryTotal: "monthly fixed bills",
    fixedSummaryVariable: "monthly variable expenses",
    fixedSummaryPaid: "paid fixed bills",
    fixedSummaryPending: "pending fixed bills",
    monthlyAlertsTitle: "Month alerts",
    monthlyAlertsText: (today: number, upcoming: number, overdue: number) =>
      `Today: ${today} • Next 3 days: ${upcoming} • Overdue: ${overdue}`,
    fixedBillsTitle: "Monthly fixed bills",
    freeFixedBillsInfo: (limit: number, remaining: number) =>
      `Free: up to ${limit} fixed bills. ${remaining} left.`,
    addFixedBill: "Add fixed bill",
    freeLimitReached: "Free limit reached",
    emptyFixedBillsTitle: "No fixed bill added yet",
    emptyFixedBillsText:
      "Add rent, electricity, water, internet, subscriptions, and other monthly expenses.",
    dueDayText: (day: number) => `due on day ${day}`,
    statusPaid: "Paid",
    statusOverdue: "Overdue",
    statusDueToday: "Due today",
    statusDueSoon: "Due soon",
    statusPending: "Pending",
    markPending: "Mark pending",
    markPaid: "Mark paid",
    edit: "Edit",
    entriesTitle: "Transactions",
    freeEntriesInfo: (limit: number, remaining: number) =>
      `Free: up to ${limit} manual transactions. ${remaining} left.`,
    addEntry: "Add transaction",
    monthlySummaryTitle: "Monthly summary",
    emptyMonthlyDataTitle: "No monthly data yet",
    emptyMonthlyDataText:
      "Add transactions to view the income and expense chart.",
    chartIncome: "Income",
    chartExpense: "Expenses",
    recentTransactionsTitle: "Recent transactions",
    emptyRecentTransactionsTitle: "No transactions yet",
    emptyRecentTransactionsText:
      "Your latest transactions will appear here in a quick-reading layout.",
    importedSource: "Open Finance",
    categoriesTitle: "Categories",
    categoriesPremiumTitle: "Detailed categories are Premium",
    categoriesPremiumText:
      "With Premium you unlock category analysis, distribution, and a detailed view of your entries.",
    unlock: "Unlock",
    emptyCategoriesTitle: "No category data yet",
    emptyCategoriesText:
      "Add transactions to view the category summary.",
    balanceLabel: (value: string) => `Balance: ${value}`,
    tapToHide: "Tap to hide",
    tapToViewEntries: "Tap to view entries",
    distributionTitle: "Category distribution",
    distributionPremiumTitle: "Visual distribution is Premium",
    distributionPremiumText:
      "Get more advanced charts and comparisons with Premium.",
    distributionPremiumButton: "I want Premium",
    emptyDistributionTitle: "No distribution yet",
    emptyDistributionText:
      "When transactions exist, the weight of each category will appear here.",
    entryCount: (count: number) => `${count} entr${count === 1 ? "y" : "ies"}`,
    emptyDetailTitle: "No entries",
    emptyDetailText: "This category does not have transactions yet.",
    newEntryTitle: "New transaction",
    freeLimitRealtimeTitle: "Real-time Free limit",
    manualUsageText: (used: number, limit: number) =>
      `You have used ${used} of ${limit} manual entries.`,
    duplicateWarningTitle: "Possible duplicate detected",
    duplicateWarningText: "A similar transaction was saved a short while ago.",
    descriptionPlaceholder: "Description",
    amountPlaceholder: "Amount",
    entryTypeIncome: "Income",
    entryTypeExpense: "Expense",
    categoryTitle: "Category",
    modalUpgradeText: "Upgrade to remove limits and automate imports",
    saveEntry: "Save transaction",
    editFixedBillTitle: "Edit fixed bill",
    newFixedBillTitle: "New fixed bill",
    fixedBillsUsageText: (used: number, limit: number) =>
      `You have used ${used} of ${limit} fixed bills.`,
    billNamePlaceholder: "Bill name",
    dueDayPlaceholder: "Due day (1 to 31)",
    saveChanges: "Save changes",
    saveBill: "Save bill",
  },
  es: {
    categoryLabels: {
      Moradia: "Vivienda",
      "Alimentação": "Alimentación",
      Transporte: "Transporte",
      Lazer: "Ocio",
      Investimentos: "Inversiones",
      "Educação": "Educación",
      "Saúde": "Salud",
      Serviços: "Servicios",
      Assinaturas: "Suscripciones",
      Outros: "Otros",
    } as Record<MoneyCategory | FixedBillCategory, string>,
    accountBalance: (value: string) => `Saldo: ${value}`,
    monthPanelTitle: "Panel del mes",
    fixedSummaryTotal: "fijas mensuales",
    fixedSummaryVariable: "variables del mes",
    fixedSummaryPaid: "fijas pagadas",
    fixedSummaryPending: "fijas pendientes",
    monthlyAlertsTitle: "Alertas del mes",
    monthlyAlertsText: (today: number, upcoming: number, overdue: number) =>
      `Hoy: ${today} • Próximos 3 días: ${upcoming} • Atrasadas: ${overdue}`,
    fixedBillsTitle: "Cuentas fijas mensuales",
    freeFixedBillsInfo: (limit: number, remaining: number) =>
      `Free: hasta ${limit} cuentas fijas. Quedan ${remaining}.`,
    addFixedBill: "Añadir cuenta fija",
    freeLimitReached: "Límite Free alcanzado",
    emptyFixedBillsTitle: "Todavía no hay cuentas fijas",
    emptyFixedBillsText:
      "Añade alquiler, electricidad, agua, internet, suscripciones y otros gastos mensuales.",
    dueDayText: (day: number) => `vence el día ${day}`,
    statusPaid: "Pagada",
    statusOverdue: "Atrasada",
    statusDueToday: "Vence hoy",
    statusDueSoon: "Vence pronto",
    statusPending: "Pendiente",
    markPending: "Marcar pendiente",
    markPaid: "Marcar pagada",
    edit: "Editar",
    entriesTitle: "Movimientos",
    freeEntriesInfo: (limit: number, remaining: number) =>
      `Free: hasta ${limit} movimientos manuales. Quedan ${remaining}.`,
    addEntry: "Añadir movimiento",
    monthlySummaryTitle: "Resumen mensual",
    emptyMonthlyDataTitle: "Todavía no hay datos mensuales",
    emptyMonthlyDataText:
      "Añade movimientos para ver el gráfico de ingresos y gastos.",
    chartIncome: "Ingresos",
    chartExpense: "Gastos",
    recentTransactionsTitle: "Transacciones recientes",
    emptyRecentTransactionsTitle: "Todavía no hay transacciones",
    emptyRecentTransactionsText:
      "Tus últimos movimientos aparecerán aquí con una lectura más rápida.",
    importedSource: "Open Finance",
    categoriesTitle: "Categorías",
    categoriesPremiumTitle: "Las categorías detalladas son Premium",
    categoriesPremiumText:
      "Con Premium desbloqueas análisis por categoría, distribución y vista detallada de los movimientos.",
    unlock: "Desbloquear",
    emptyCategoriesTitle: "Todavía no hay categorías con datos",
    emptyCategoriesText:
      "Añade movimientos para ver el resumen por categoría.",
    balanceLabel: (value: string) => `Saldo: ${value}`,
    tapToHide: "Toca para ocultar",
    tapToViewEntries: "Toca para ver movimientos",
    distributionTitle: "Distribución por categoría",
    distributionPremiumTitle: "La distribución visual es Premium",
    distributionPremiumText:
      "Obtén gráficos y comparativas más avanzadas con Premium.",
    distributionPremiumButton: "Quiero Premium",
    emptyDistributionTitle: "Todavía no hay distribución",
    emptyDistributionText:
      "Cuando haya movimientos, el peso de cada categoría aparecerá aquí.",
    entryCount: (count: number) => `${count} movimiento(s)`,
    emptyDetailTitle: "Sin movimientos",
    emptyDetailText: "Esta categoría todavía no tiene movimientos.",
    newEntryTitle: "Nuevo movimiento",
    freeLimitRealtimeTitle: "Límite Free en tiempo real",
    manualUsageText: (used: number, limit: number) =>
      `Has usado ${used} de ${limit} movimientos manuales.`,
    duplicateWarningTitle: "Posible duplicado detectado",
    duplicateWarningText: "Ya existe un movimiento muy parecido guardado hace poco.",
    descriptionPlaceholder: "Descripción",
    amountPlaceholder: "Valor",
    entryTypeIncome: "Ingreso",
    entryTypeExpense: "Gasto",
    categoryTitle: "Categoría",
    modalUpgradeText: "Haz upgrade para quitar límites y automatizar importaciones",
    saveEntry: "Guardar movimiento",
    editFixedBillTitle: "Editar cuenta fija",
    newFixedBillTitle: "Nueva cuenta fija",
    fixedBillsUsageText: (used: number, limit: number) =>
      `Has usado ${used} de ${limit} cuentas fijas.`,
    billNamePlaceholder: "Nombre de la cuenta",
    dueDayPlaceholder: "Día de vencimiento (1 a 31)",
    saveChanges: "Guardar cambios",
    saveBill: "Guardar cuenta",
  },
  fr: {
    categoryLabels: {
      Moradia: "Logement",
      "Alimentação": "Alimentation",
      Transporte: "Transport",
      Lazer: "Loisirs",
      Investimentos: "Investissements",
      "Educação": "Éducation",
      "Saúde": "Santé",
      Serviços: "Services",
      Assinaturas: "Abonnements",
      Outros: "Autres",
    } as Record<MoneyCategory | FixedBillCategory, string>,
    accountBalance: (value: string) => `Solde : ${value}`,
    monthPanelTitle: "Tableau du mois",
    fixedSummaryTotal: "charges fixes mensuelles",
    fixedSummaryVariable: "dépenses variables du mois",
    fixedSummaryPaid: "charges fixes payées",
    fixedSummaryPending: "charges fixes en attente",
    monthlyAlertsTitle: "Alertes du mois",
    monthlyAlertsText: (today: number, upcoming: number, overdue: number) =>
      `Aujourd'hui : ${today} • Prochains 3 jours : ${upcoming} • En retard : ${overdue}`,
    fixedBillsTitle: "Charges fixes mensuelles",
    freeFixedBillsInfo: (limit: number, remaining: number) =>
      `Free : jusqu'à ${limit} charges fixes. Il en reste ${remaining}.`,
    addFixedBill: "Ajouter une charge fixe",
    freeLimitReached: "Limite Free atteinte",
    emptyFixedBillsTitle: "Aucune charge fixe enregistrée",
    emptyFixedBillsText:
      "Ajoutez loyer, électricité, eau, internet, abonnements et autres dépenses mensuelles.",
    dueDayText: (day: number) => `échéance le ${day}`,
    statusPaid: "Payée",
    statusOverdue: "En retard",
    statusDueToday: "Échéance aujourd'hui",
    statusDueSoon: "Échéance proche",
    statusPending: "En attente",
    markPending: "Marquer en attente",
    markPaid: "Marquer payée",
    edit: "Modifier",
    entriesTitle: "Mouvements",
    freeEntriesInfo: (limit: number, remaining: number) =>
      `Free : jusqu'à ${limit} mouvements manuels. Il en reste ${remaining}.`,
    addEntry: "Ajouter un mouvement",
    monthlySummaryTitle: "Résumé mensuel",
    emptyMonthlyDataTitle: "Aucune donnée mensuelle pour le moment",
    emptyMonthlyDataText:
      "Ajoutez des mouvements pour voir le graphique des entrées et sorties.",
    chartIncome: "Entrées",
    chartExpense: "Sorties",
    recentTransactionsTitle: "Transactions récentes",
    emptyRecentTransactionsTitle: "Aucune transaction pour le moment",
    emptyRecentTransactionsText:
      "Vos derniers mouvements apparaîtront ici dans une vue plus rapide à lire.",
    importedSource: "Open Finance",
    categoriesTitle: "Catégories",
    categoriesPremiumTitle: "Les catégories détaillées sont Premium",
    categoriesPremiumText:
      "Avec Premium, vous débloquez l'analyse par catégorie, la répartition et la vue détaillée des mouvements.",
    unlock: "Débloquer",
    emptyCategoriesTitle: "Aucune catégorie avec des données pour le moment",
    emptyCategoriesText:
      "Ajoutez des mouvements pour voir le résumé par catégorie.",
    balanceLabel: (value: string) => `Solde : ${value}`,
    tapToHide: "Touchez pour masquer",
    tapToViewEntries: "Touchez pour voir les mouvements",
    distributionTitle: "Répartition par catégorie",
    distributionPremiumTitle: "La répartition visuelle est Premium",
    distributionPremiumText:
      "Obtenez des graphiques et comparatifs plus avancés avec Premium.",
    distributionPremiumButton: "Je veux Premium",
    emptyDistributionTitle: "Pas encore de répartition",
    emptyDistributionText:
      "Quand il y aura des mouvements, le poids de chaque catégorie apparaîtra ici.",
    entryCount: (count: number) => `${count} mouvement(s)`,
    emptyDetailTitle: "Aucun mouvement",
    emptyDetailText: "Cette catégorie ne possède pas encore de mouvements.",
    newEntryTitle: "Nouveau mouvement",
    freeLimitRealtimeTitle: "Limite Free en temps réel",
    manualUsageText: (used: number, limit: number) =>
      `Vous avez utilisé ${used} sur ${limit} mouvements manuels.`,
    duplicateWarningTitle: "Doublon possible détecté",
    duplicateWarningText:
      "Un mouvement très similaire a déjà été enregistré récemment.",
    descriptionPlaceholder: "Description",
    amountPlaceholder: "Montant",
    entryTypeIncome: "Entrée",
    entryTypeExpense: "Sortie",
    categoryTitle: "Catégorie",
    modalUpgradeText:
      "Passez à Premium pour retirer les limites et automatiser les imports",
    saveEntry: "Enregistrer le mouvement",
    editFixedBillTitle: "Modifier la charge fixe",
    newFixedBillTitle: "Nouvelle charge fixe",
    fixedBillsUsageText: (used: number, limit: number) =>
      `Vous avez utilisé ${used} sur ${limit} charges fixes.`,
    billNamePlaceholder: "Nom de la charge",
    dueDayPlaceholder: "Jour d'échéance (1 à 31)",
    saveChanges: "Enregistrer les modifications",
    saveBill: "Enregistrer la charge",
  },
  it: {
    categoryLabels: {
      Moradia: "Casa",
      "Alimentação": "Alimentazione",
      Transporte: "Trasporto",
      Lazer: "Tempo libero",
      Investimentos: "Investimenti",
      "Educação": "Educazione",
      "Saúde": "Salute",
      Serviços: "Servizi",
      Assinaturas: "Abbonamenti",
      Outros: "Altro",
    } as Record<MoneyCategory | FixedBillCategory, string>,
    accountBalance: (value: string) => `Saldo: ${value}`,
    monthPanelTitle: "Pannello del mese",
    fixedSummaryTotal: "spese fisse mensili",
    fixedSummaryVariable: "spese variabili del mese",
    fixedSummaryPaid: "spese fisse pagate",
    fixedSummaryPending: "spese fisse in sospeso",
    monthlyAlertsTitle: "Avvisi del mese",
    monthlyAlertsText: (today: number, upcoming: number, overdue: number) =>
      `Oggi: ${today} • Prossimi 3 giorni: ${upcoming} • In ritardo: ${overdue}`,
    fixedBillsTitle: "Spese fisse mensili",
    freeFixedBillsInfo: (limit: number, remaining: number) =>
      `Free: fino a ${limit} spese fisse. Ne restano ${remaining}.`,
    addFixedBill: "Aggiungi spesa fissa",
    freeLimitReached: "Limite Free raggiunto",
    emptyFixedBillsTitle: "Nessuna spesa fissa registrata",
    emptyFixedBillsText:
      "Aggiungi affitto, elettricità, acqua, internet, abbonamenti e altre spese mensili.",
    dueDayText: (day: number) => `scade il giorno ${day}`,
    statusPaid: "Pagata",
    statusOverdue: "In ritardo",
    statusDueToday: "Scade oggi",
    statusDueSoon: "Scade a breve",
    statusPending: "In sospeso",
    markPending: "Segna in sospeso",
    markPaid: "Segna pagata",
    edit: "Modifica",
    entriesTitle: "Movimenti",
    freeEntriesInfo: (limit: number, remaining: number) =>
      `Free: fino a ${limit} movimenti manuali. Ne restano ${remaining}.`,
    addEntry: "Aggiungi movimento",
    monthlySummaryTitle: "Riepilogo mensile",
    emptyMonthlyDataTitle: "Nessun dato mensile ancora",
    emptyMonthlyDataText:
      "Aggiungi movimenti per vedere il grafico di entrate e uscite.",
    chartIncome: "Entrate",
    chartExpense: "Uscite",
    recentTransactionsTitle: "Transazioni recenti",
    emptyRecentTransactionsTitle: "Nessuna transazione ancora",
    emptyRecentTransactionsText:
      "Gli ultimi movimenti appariranno qui con una lettura più rapida.",
    importedSource: "Open Finance",
    categoriesTitle: "Categorie",
    categoriesPremiumTitle: "Le categorie dettagliate sono Premium",
    categoriesPremiumText:
      "Con Premium sblocchi analisi per categoria, distribuzione e vista dettagliata dei movimenti.",
    unlock: "Sblocca",
    emptyCategoriesTitle: "Nessuna categoria con dati ancora",
    emptyCategoriesText:
      "Aggiungi movimenti per vedere il riepilogo per categoria.",
    balanceLabel: (value: string) => `Saldo: ${value}`,
    tapToHide: "Tocca per nascondere",
    tapToViewEntries: "Tocca per vedere i movimenti",
    distributionTitle: "Distribuzione per categoria",
    distributionPremiumTitle: "La distribuzione visiva è Premium",
    distributionPremiumText:
      "Ottieni grafici e confronti più avanzati con Premium.",
    distributionPremiumButton: "Voglio Premium",
    emptyDistributionTitle: "Nessuna distribuzione ancora",
    emptyDistributionText:
      "Quando ci saranno movimenti, il peso di ogni categoria apparirà qui.",
    entryCount: (count: number) => `${count} movimento/i`,
    emptyDetailTitle: "Nessun movimento",
    emptyDetailText: "Questa categoria non ha ancora movimenti.",
    newEntryTitle: "Nuovo movimento",
    freeLimitRealtimeTitle: "Limite Free in tempo reale",
    manualUsageText: (used: number, limit: number) =>
      `Hai usato ${used} di ${limit} movimenti manuali.`,
    duplicateWarningTitle: "Possibile duplicato rilevato",
    duplicateWarningText:
      "Esiste già un movimento molto simile salvato poco fa.",
    descriptionPlaceholder: "Descrizione",
    amountPlaceholder: "Importo",
    entryTypeIncome: "Entrata",
    entryTypeExpense: "Uscita",
    categoryTitle: "Categoria",
    modalUpgradeText: "Fai upgrade per rimuovere i limiti e automatizzare le importazioni",
    saveEntry: "Salva movimento",
    editFixedBillTitle: "Modifica spesa fissa",
    newFixedBillTitle: "Nuova spesa fissa",
    fixedBillsUsageText: (used: number, limit: number) =>
      `Hai usato ${used} di ${limit} spese fisse.`,
    billNamePlaceholder: "Nome della spesa",
    dueDayPlaceholder: "Giorno di scadenza (da 1 a 31)",
    saveChanges: "Salva modifiche",
    saveBill: "Salva spesa",
  },
} as const;

function getMoneyCategoryLabel(
  category: MoneyCategory | FixedBillCategory,
  language: keyof typeof moneyDeepUiCopyByLanguage
) {
  return moneyDeepUiCopyByLanguage[language].categoryLabels[category] ?? category;
}

function getMonthKey(dateString: string) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentPeriodKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isEntryInPeriod(entryDateString: string, filter: FilterPeriod) {
  if (filter === "all") return true;

  const entryDate = new Date(entryDateString);
  const now = new Date();

  if (filter === "month") {
    return (
      entryDate.getFullYear() === now.getFullYear() &&
      entryDate.getMonth() === now.getMonth()
    );
  }

  const monthsBack = filter === "3months" ? 2 : 5;
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

  return entryDate >= startDate && entryDate <= now;
}

function getTodayDay() {
  return new Date().getDate();
}

function isBillPaidInCurrentMonth(bill: FixedBill, currentPeriod: string) {
  return bill.lastPaidPeriod === currentPeriod;
}

function getFinancialScore(params: {
  totalEntradas: number;
  totalSaidas: number;
  contasPendentesValor: number;
  overdueCount: number;
  investments: number;
  saldoAtual: number;
}) {
  const {
    totalEntradas,
    totalSaidas,
    contasPendentesValor,
    overdueCount,
    investments,
    saldoAtual,
  } = params;

  let score = 60;

  if (totalEntradas > 0) {
    const savingsRate = (saldoAtual / totalEntradas) * 100;
    score += clamp(savingsRate * 0.5, -20, 20);
  }

  if (investments > 0) score += 8;
  if (contasPendentesValor > 0) score -= 10;
  if (overdueCount > 0) score -= overdueCount * 8;
  if (totalSaidas > totalEntradas && totalEntradas > 0) score -= 15;

  return clamp(Math.round(score), 0, 100);
}

function getFinancialScoreLabelByLanguage(
  score: number,
  language: keyof typeof moneyUiCopyByLanguage
) {
  const labels = moneyUiCopyByLanguage[language].scoreLabels;
  if (score >= 85) return labels.excellent;
  if (score >= 70) return labels.good;
  if (score >= 55) return labels.stable;
  if (score >= 40) return labels.warning;
  return labels.critical;
}

function normalizeEntry(item: any): MoneyEntry {
  return {
    id: String(item?.id ?? uid()),
    title: String(item?.title ?? ""),
    amount: Number(item?.amount ?? 0),
    type: item?.type === "entrada" ? "entrada" : "saida",
    category: item?.category ?? "Outros",
    createdAt: String(item?.createdAt ?? new Date().toISOString()),
    source: item?.source === "open_finance" ? "open_finance" : undefined,
    institutionId: item?.institutionId ? String(item.institutionId) : undefined,
    institutionName: item?.institutionName ? String(item.institutionName) : undefined,
    externalId: item?.externalId ? String(item.externalId) : undefined,
    tags: Array.isArray(item?.tags) ? item.tags.map(String) : [],
    isRecurring: !!item?.isRecurring,
    notes: item?.notes ? String(item.notes) : undefined,
  };
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

const moduleCopyByLanguage = {
  pt: {
    headerTitle: "Dinheiro",
    headerSubtitle: "Organize entradas, saídas, metas e contas fixas do mês.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Recurso do Premium",
    premiumAlertText:
      "{{feature}} faz parte da experiência Premium e amplia sua organização financeira.",
    premiumAlertCancel: "Agora não",
    premiumAlertButton: "Conhecer Premium",
    tourStep: "Tour do módulo • {{current}}/{{total}}",
    skipTour: "Pular tour",
    next: "Próximo",
    finish: "Finalizar tour",
    tour1Title: "Comece registrando suas movimentações",
    tour1Description:
      "A primeira vitória aqui é lançar entradas e saídas. Isso dá clareza real para a IA acompanhar sua evolução financeira.",
    tour2Title: "Monte sua base mensal",
    tour2Description:
      "Use o bloco de contas fixas mensais para estruturar compromissos recorrentes e evitar desorganização no mês.",
    tour3Title: "Conectar banco acelera sua leitura",
    tour3Description:
      "Quando você conectar um banco, o app amplia sua visão financeira e deixa o módulo ainda mais inteligente.",
    upgradeTitle: "Desbloqueie o Premium",
    upgradeText:
      "Conecte múltiplos bancos, veja dados reais do Open Finance, use filtros avançados e expanda seu controle financeiro.",
    upgradeButton: "Ver plano Premium",
  },
  en: {
    headerTitle: "Money",
    headerSubtitle: "Organize income, expenses, goals, and fixed monthly bills.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Premium feature",
    premiumAlertText:
      "{{feature}} is part of the Premium experience and expands your financial organization.",
    premiumAlertCancel: "Not now",
    premiumAlertButton: "Explore Premium",
    tourStep: "Module tour • {{current}}/{{total}}",
    skipTour: "Skip tour",
    next: "Next",
    finish: "Finish tour",
    tour1Title: "Start by logging your transactions",
    tour1Description:
      "The first win here is adding income and expenses. That gives the AI real clarity to track your financial progress.",
    tour2Title: "Build your monthly base",
    tour2Description:
      "Use the monthly fixed bills section to organize recurring commitments and avoid chaos during the month.",
    tour3Title: "Connecting a bank speeds up your view",
    tour3Description:
      "When you connect a bank, the app expands your financial picture and makes this module even smarter.",
    upgradeTitle: "Unlock Premium",
    upgradeText:
      "Connect multiple banks, view real Open Finance data, use advanced filters, and expand your financial control.",
    upgradeButton: "See Premium plan",
  },
  es: {
    headerTitle: "Dinero",
    headerSubtitle:
      "Organiza ingresos, gastos, metas y cuentas fijas del mes.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Función Premium",
    premiumAlertText:
      "{{feature}} forma parte de la experiencia Premium y amplía tu organización financiera.",
    premiumAlertCancel: "Ahora no",
    premiumAlertButton: "Conocer Premium",
    tourStep: "Tour del módulo • {{current}}/{{total}}",
    skipTour: "Saltar tour",
    next: "Siguiente",
    finish: "Finalizar tour",
    tour1Title: "Empieza registrando tus movimientos",
    tour1Description:
      "La primera victoria aquí es registrar ingresos y gastos. Eso le da a la IA claridad real para acompañar tu evolución financiera.",
    tour2Title: "Monta tu base mensual",
    tour2Description:
      "Usa el bloque de cuentas fijas mensuales para estructurar compromisos recurrentes y evitar desorganización durante el mes.",
    tour3Title: "Conectar un banco acelera tu lectura",
    tour3Description:
      "Cuando conectas un banco, la app amplía tu visión financiera y hace este módulo aún más inteligente.",
    upgradeTitle: "Desbloquea Premium",
    upgradeText:
      "Conecta múltiples bancos, mira datos reales de Open Finance, usa filtros avanzados y amplía tu control financiero.",
    upgradeButton: "Ver plan Premium",
  },
  fr: {
    headerTitle: "Argent",
    headerSubtitle:
      "Organisez revenus, dépenses, objectifs et charges fixes du mois.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Fonction Premium",
    premiumAlertText:
      "{{feature}} fait partie de l'expérience Premium et renforce votre organisation financière.",
    premiumAlertCancel: "Pas maintenant",
    premiumAlertButton: "Découvrir Premium",
    tourStep: "Tour du module • {{current}}/{{total}}",
    skipTour: "Passer le tour",
    next: "Suivant",
    finish: "Terminer le tour",
    tour1Title: "Commencez par enregistrer vos mouvements",
    tour1Description:
      "La première victoire ici est d'ajouter revenus et dépenses. Cela donne à l'IA une vraie clarté pour suivre votre évolution financière.",
    tour2Title: "Construisez votre base mensuelle",
    tour2Description:
      "Utilisez le bloc des charges fixes mensuelles pour structurer vos engagements récurrents et éviter le désordre dans le mois.",
    tour3Title: "Connecter une banque accélère votre lecture",
    tour3Description:
      "Quand vous connectez une banque, l'app élargit votre vision financière et rend ce module encore plus intelligent.",
    upgradeTitle: "Débloquez Premium",
    upgradeText:
      "Connectez plusieurs banques, voyez de vraies données Open Finance, utilisez des filtres avancés et développez votre contrôle financier.",
    upgradeButton: "Voir le plan Premium",
  },
  it: {
    headerTitle: "Denaro",
    headerSubtitle:
      "Organizza entrate, uscite, obiettivi e spese fisse del mese.",
    planPremium: "Premium",
    planFree: "Free",
    premiumAlertTitle: "Funzione Premium",
    premiumAlertText:
      "{{feature}} fa parte dell'esperienza Premium e amplia la tua organizzazione finanziaria.",
    premiumAlertCancel: "Non ora",
    premiumAlertButton: "Scopri Premium",
    tourStep: "Tour del modulo • {{current}}/{{total}}",
    skipTour: "Salta tour",
    next: "Avanti",
    finish: "Termina tour",
    tour1Title: "Inizia registrando i tuoi movimenti",
    tour1Description:
      "La prima vittoria qui è inserire entrate e uscite. Questo dà all'IA chiarezza reale per seguire la tua evoluzione finanziaria.",
    tour2Title: "Costruisci la tua base mensile",
    tour2Description:
      "Usa il blocco delle spese fisse mensili per organizzare gli impegni ricorrenti ed evitare disordine nel mese.",
    tour3Title: "Collegare una banca accelera la lettura",
    tour3Description:
      "Quando colleghi una banca, l'app amplia la tua visione finanziaria e rende questo modulo ancora più intelligente.",
    upgradeTitle: "Sblocca Premium",
    upgradeText:
      "Collega più banche, visualizza dati reali Open Finance, usa filtri avanzati e amplia il tuo controllo finanziario.",
    upgradeButton: "Vedi piano Premium",
  },
} as const;

const moneyUiCopyByLanguage = {
  pt: {
    errorTitle: "Erro",
    attentionTitle: "Atenção",
    smartBlockTitle: "Bloqueio inteligente",
    review: "Revisar",
    saveAnyway: "Salvar mesmo assim",
    cancel: "Cancelar",
    remove: "Remover",
    loadModuleError: "Não foi possível carregar os dados financeiros.",
    saveEntryError: "Não foi possível salvar a movimentação.",
    saveGoalError: "Não foi possível salvar a meta.",
    saveFixedBillsError: "Não foi possível salvar as contas fixas.",
    neverSynced: "Nunca sincronizado",
    scoreLabels: {
      excellent: "Finanças muito bem organizadas",
      good: "Boa saúde financeira",
      stable: "Situação estável, mas pode melhorar",
      warning: "Atenção ao controle financeiro",
      critical: "Momento de reorganizar o dinheiro",
    },
    heroEyebrow: "Painel financeiro inteligente",
    heroTitle: "Sua saúde financeira do período",
    freeEntriesLabel: "Movimentações Free",
    freeBillsLabel: "Contas fixas Free",
    remainingLabel: (remaining: number) => `Restam ${remaining}`,
    advancedPeriodFilters: "Filtros de período avançados",
    insightOverdue: (count: number) =>
      `${count} conta(s) fixa(s) atrasada(s). Priorize isso primeiro.`,
    insightNegativeBalance:
      "Seu saldo do período está negativo. Hora de frear saídas.",
    insightTopExpense: (category: string, value: string) =>
      `Maior peso do período: ${category} com ${value}.`,
    insightInvestments: (value: string) =>
      `Você já direcionou ${value} para investimentos.`,
    insightClean:
      "Seu painel está limpo. Continue registrando para gerar análises mais inteligentes.",
    smartCtaAdvanced: "Modo avançado ligado",
    smartCtaNextStep: "Seu próximo salto financeiro",
    smartCtaPremiumConnected:
      "Seu painel está em modo avançado. Continue alimentando para liberar análises ainda mais fortes.",
    smartCtaPremiumNoBank:
      "Conecte seu primeiro banco e transforme o painel em piloto automático.",
    smartCtaFreeEntries: (remaining: number) =>
      `Você está perto do limite Free. Restam ${remaining} movimentação(ões).`,
    smartCtaFreeBills: (remaining: number) =>
      `Sua gestão fixa está quase cheia no Free. Restam ${remaining} vaga(s).`,
    smartCtaDefault:
      "Se quiser ampliar a automação, o Premium conecta importações e aprofunda sua leitura financeira.",
    connectBank: "Conectar banco",
    wantPremium: "Quero Premium",
    openFinanceTitle: "Open Finance",
    openFinanceSubtitleConnected: (count: number, lastSync: string) =>
      `${count} banco(s) ativo(s) • última sync: ${lastSync}`,
    openFinanceSubtitleEmpty: "Nenhum banco conectado ainda",
    importedCount: (count: number) =>
      `${count} importada${count === 1 ? "" : "s"}`,
    openFinancePremiumFeature: "Open Finance completo",
    openFinancePremiumButton: "Open Finance é Premium",
    premiumFeatureTitle: "Recurso Premium",
    premiumFeatureText:
      "No Premium você conecta bancos reais, vê saldo consolidado e últimas transações importadas automaticamente.",
    upgradeNow: "Fazer upgrade",
    loadingData: "Carregando dados...",
    realAccounts: "Contas reais",
    accountsBalance: "Saldo nas contas",
    connectedAccounts: "Contas conectadas",
    noRealAccount: "Nenhuma conta real carregada ainda.",
    genericBankAccount: "Conta bancária",
    recentRealTransactions: "Últimas transações reais",
    noRealTransactions: "Nenhuma transação real encontrada.",
    genericTransaction: "Transação",
    periodBalance: "Saldo do período",
    hideBalance: "Ocultar",
    showBalance: "Mostrar",
    income: "Entradas",
    expense: "Saídas",
    goalTitle: "Meta financeira",
    currentGoal: (value: string) => `Meta atual: ${value}`,
    noGoal: "não definida",
    goalProgress: (value: number) => `${value}% da meta`,
    goalPlaceholder: "Ex.: 1000",
    saveGoal: "Salvar meta",
    filterLabels: {
      month: "Mês atual",
      "3months": "3 meses",
      "6months": "6 meses",
      all: "Total",
    } as Record<FilterPeriod, string>,
    limitManualEntries: "Mais de 30 movimentações manuais",
    limitFixedBills: "Mais de 3 contas fixas",
    descriptionRequired: "Digite uma descrição.",
    validAmount: "Digite um valor válido.",
    amountTooHigh:
      "O valor digitado parece alto demais. Revise antes de salvar.",
    duplicateEntry:
      "Parece que essa movimentação já foi lançada há instantes. Revise para evitar duplicidade.",
    biggerThanBalance:
      "Essa saída é maior que o saldo atual do período. Deseja salvar mesmo assim?",
    removeImportedTitle: "Remover transação importada",
    removeImportedText: (source: string) =>
      `Esta transação foi importada${source}. Deseja remover mesmo assim?`,
    goalInvalid: "Digite uma meta válida.",
    goalSavedTitle: "Meta salva",
    goalSavedText: "Sua meta financeira foi atualizada.",
    billNameRequired: "Digite o nome da conta.",
    dueDayInvalid: "Digite um dia de vencimento entre 1 e 31.",
    duplicateBill:
      "Já existe uma conta fixa muito parecida cadastrada. Revise para evitar duplicidade.",
    removeFixedBillTitle: "Remover conta fixa",
    removeFixedBillText: "Deseja remover esta conta fixa?",
  },
  en: {
    errorTitle: "Error",
    attentionTitle: "Attention",
    smartBlockTitle: "Smart block",
    review: "Review",
    saveAnyway: "Save anyway",
    cancel: "Cancel",
    remove: "Remove",
    loadModuleError: "Could not load the financial data.",
    saveEntryError: "Could not save the transaction.",
    saveGoalError: "Could not save the goal.",
    saveFixedBillsError: "Could not save the fixed bills.",
    neverSynced: "Never synced",
    scoreLabels: {
      excellent: "Finances are very well organized",
      good: "Good financial health",
      stable: "Stable situation, but it can improve",
      warning: "Attention to financial control",
      critical: "Time to reorganize your money",
    },
    heroEyebrow: "Smart financial dashboard",
    heroTitle: "Your financial health this period",
    freeEntriesLabel: "Free entries",
    freeBillsLabel: "Free fixed bills",
    remainingLabel: (remaining: number) => `${remaining} left`,
    advancedPeriodFilters: "Advanced period filters",
    insightOverdue: (count: number) =>
      `${count} overdue fixed bill(s). Prioritize this first.`,
    insightNegativeBalance:
      "Your balance for this period is negative. Time to slow down expenses.",
    insightTopExpense: (category: string, value: string) =>
      `Biggest expense this period: ${category} at ${value}.`,
    insightInvestments: (value: string) =>
      `You have already directed ${value} into investments.`,
    insightClean:
      "Your dashboard is clean. Keep tracking to generate smarter insights.",
    smartCtaAdvanced: "Advanced mode on",
    smartCtaNextStep: "Your next financial leap",
    smartCtaPremiumConnected:
      "Your dashboard is in advanced mode. Keep feeding it to unlock even stronger insights.",
    smartCtaPremiumNoBank:
      "Connect your first bank and turn the dashboard into autopilot.",
    smartCtaFreeEntries: (remaining: number) =>
      `You are close to the Free limit. ${remaining} manual transaction(s) left.`,
    smartCtaFreeBills: (remaining: number) =>
      `Your fixed bill management is almost full on Free. ${remaining} slot(s) left.`,
    smartCtaDefault:
      "If you want more automation, Premium connects imports and deepens your financial view.",
    connectBank: "Connect bank",
    wantPremium: "I want Premium",
    openFinanceTitle: "Open Finance",
    openFinanceSubtitleConnected: (count: number, lastSync: string) =>
      `${count} active bank(s) • last sync: ${lastSync}`,
    openFinanceSubtitleEmpty: "No bank connected yet",
    importedCount: (count: number) =>
      `${count} imported`,
    openFinancePremiumFeature: "Full Open Finance",
    openFinancePremiumButton: "Open Finance is Premium",
    premiumFeatureTitle: "Premium feature",
    premiumFeatureText:
      "On Premium you connect real banks, see consolidated balances, and recent imported transactions automatically.",
    upgradeNow: "Upgrade now",
    loadingData: "Loading data...",
    realAccounts: "Real accounts",
    accountsBalance: "Account balances",
    connectedAccounts: "Connected accounts",
    noRealAccount: "No real account loaded yet.",
    genericBankAccount: "Bank account",
    recentRealTransactions: "Latest real transactions",
    noRealTransactions: "No real transactions found.",
    genericTransaction: "Transaction",
    periodBalance: "Period balance",
    hideBalance: "Hide",
    showBalance: "Show",
    income: "Income",
    expense: "Expenses",
    goalTitle: "Financial goal",
    currentGoal: (value: string) => `Current goal: ${value}`,
    noGoal: "not set",
    goalProgress: (value: number) => `${value}% of the goal`,
    goalPlaceholder: "Ex: 1000",
    saveGoal: "Save goal",
    filterLabels: {
      month: "Current month",
      "3months": "3 months",
      "6months": "6 months",
      all: "All time",
    } as Record<FilterPeriod, string>,
    limitManualEntries: "More than 30 manual transactions",
    limitFixedBills: "More than 3 fixed bills",
    descriptionRequired: "Enter a description.",
    validAmount: "Enter a valid amount.",
    amountTooHigh: "The amount looks too high. Review it before saving.",
    duplicateEntry:
      "It looks like this transaction was just added. Review it to avoid duplicates.",
    biggerThanBalance:
      "This expense is larger than the current balance for the period. Save it anyway?",
    removeImportedTitle: "Remove imported transaction",
    removeImportedText: (source: string) =>
      `This transaction was imported${source}. Do you still want to remove it?`,
    goalInvalid: "Enter a valid goal.",
    goalSavedTitle: "Goal saved",
    goalSavedText: "Your financial goal has been updated.",
    billNameRequired: "Enter the bill name.",
    dueDayInvalid: "Enter a due day between 1 and 31.",
    duplicateBill:
      "A very similar fixed bill already exists. Review it to avoid duplicates.",
    removeFixedBillTitle: "Remove fixed bill",
    removeFixedBillText: "Do you want to remove this fixed bill?",
  },
  es: {
    errorTitle: "Error",
    attentionTitle: "Atención",
    smartBlockTitle: "Bloqueo inteligente",
    review: "Revisar",
    saveAnyway: "Guardar igual",
    cancel: "Cancelar",
    remove: "Eliminar",
    loadModuleError: "No fue posible cargar los datos financieros.",
    saveEntryError: "No fue posible guardar el movimiento.",
    saveGoalError: "No fue posible guardar la meta.",
    saveFixedBillsError: "No fue posible guardar las cuentas fijas.",
    neverSynced: "Nunca sincronizado",
    scoreLabels: {
      excellent: "Finanzas muy bien organizadas",
      good: "Buena salud financiera",
      stable: "Situación estable, pero puede mejorar",
      warning: "Atención al control financiero",
      critical: "Momento de reorganizar tu dinero",
    },
    heroEyebrow: "Panel financiero inteligente",
    heroTitle: "Tu salud financiera del período",
    freeEntriesLabel: "Movimientos Free",
    freeBillsLabel: "Cuentas fijas Free",
    remainingLabel: (remaining: number) => `Quedan ${remaining}`,
    advancedPeriodFilters: "Filtros avanzados de período",
    insightOverdue: (count: number) =>
      `${count} cuenta(s) fija(s) atrasada(s). Prioriza esto primero.`,
    insightNegativeBalance:
      "Tu saldo del período está negativo. Es hora de frenar los gastos.",
    insightTopExpense: (category: string, value: string) =>
      `El mayor peso del período es ${category} con ${value}.`,
    insightInvestments: (value: string) =>
      `Ya dirigiste ${value} a inversiones.`,
    insightClean:
      "Tu panel está limpio. Sigue registrando para generar análisis más inteligentes.",
    smartCtaAdvanced: "Modo avanzado activado",
    smartCtaNextStep: "Tu próximo salto financiero",
    smartCtaPremiumConnected:
      "Tu panel está en modo avanzado. Sigue alimentándolo para liberar análisis aún más fuertes.",
    smartCtaPremiumNoBank:
      "Conecta tu primer banco y convierte el panel en piloto automático.",
    smartCtaFreeEntries: (remaining: number) =>
      `Estás cerca del límite Free. Quedan ${remaining} movimiento(s).`,
    smartCtaFreeBills: (remaining: number) =>
      `Tu gestión fija casi está llena en Free. Quedan ${remaining} espacio(s).`,
    smartCtaDefault:
      "Si quieres ampliar la automatización, Premium conecta importaciones y profundiza tu lectura financiera.",
    connectBank: "Conectar banco",
    wantPremium: "Quiero Premium",
    openFinanceTitle: "Open Finance",
    openFinanceSubtitleConnected: (count: number, lastSync: string) =>
      `${count} banco(s) activo(s) • última sync: ${lastSync}`,
    openFinanceSubtitleEmpty: "Todavía no hay bancos conectados",
    importedCount: (count: number) =>
      `${count} importada${count === 1 ? "" : "s"}`,
    openFinancePremiumFeature: "Open Finance completo",
    openFinancePremiumButton: "Open Finance es Premium",
    premiumFeatureTitle: "Función Premium",
    premiumFeatureText:
      "En Premium conectas bancos reales, ves saldo consolidado y últimas transacciones importadas automáticamente.",
    upgradeNow: "Hacer upgrade",
    loadingData: "Cargando datos...",
    realAccounts: "Cuentas reales",
    accountsBalance: "Saldo en cuentas",
    connectedAccounts: "Cuentas conectadas",
    noRealAccount: "Todavía no hay cuentas reales cargadas.",
    genericBankAccount: "Cuenta bancaria",
    recentRealTransactions: "Últimas transacciones reales",
    noRealTransactions: "No se encontraron transacciones reales.",
    genericTransaction: "Transacción",
    periodBalance: "Saldo del período",
    hideBalance: "Ocultar",
    showBalance: "Mostrar",
    income: "Ingresos",
    expense: "Gastos",
    goalTitle: "Meta financiera",
    currentGoal: (value: string) => `Meta actual: ${value}`,
    noGoal: "no definida",
    goalProgress: (value: number) => `${value}% de la meta`,
    goalPlaceholder: "Ej.: 1000",
    saveGoal: "Guardar meta",
    filterLabels: {
      month: "Mes actual",
      "3months": "3 meses",
      "6months": "6 meses",
      all: "Total",
    } as Record<FilterPeriod, string>,
    limitManualEntries: "Más de 30 movimientos manuales",
    limitFixedBills: "Más de 3 cuentas fijas",
    descriptionRequired: "Escribe una descripción.",
    validAmount: "Escribe un valor válido.",
    amountTooHigh: "El valor parece demasiado alto. Revísalo antes de guardar.",
    duplicateEntry:
      "Parece que este movimiento ya fue registrado hace un momento. Revísalo para evitar duplicados.",
    biggerThanBalance:
      "Esta salida es mayor que el saldo actual del período. ¿Quieres guardarla igual?",
    removeImportedTitle: "Eliminar transacción importada",
    removeImportedText: (source: string) =>
      `Esta transacción fue importada${source}. ¿Quieres eliminarla de todos modos?`,
    goalInvalid: "Escribe una meta válida.",
    goalSavedTitle: "Meta guardada",
    goalSavedText: "Tu meta financiera fue actualizada.",
    billNameRequired: "Escribe el nombre de la cuenta.",
    dueDayInvalid: "Escribe un día de vencimiento entre 1 y 31.",
    duplicateBill:
      "Ya existe una cuenta fija muy parecida. Revísala para evitar duplicados.",
    removeFixedBillTitle: "Eliminar cuenta fija",
    removeFixedBillText: "¿Deseas eliminar esta cuenta fija?",
  },
  fr: {
    errorTitle: "Erreur",
    attentionTitle: "Attention",
    smartBlockTitle: "Blocage intelligent",
    review: "Vérifier",
    saveAnyway: "Enregistrer quand même",
    cancel: "Annuler",
    remove: "Supprimer",
    loadModuleError: "Impossible de charger les données financières.",
    saveEntryError: "Impossible d'enregistrer le mouvement.",
    saveGoalError: "Impossible d'enregistrer l'objectif.",
    saveFixedBillsError: "Impossible d'enregistrer les charges fixes.",
    neverSynced: "Jamais synchronisé",
    scoreLabels: {
      excellent: "Finances très bien organisées",
      good: "Bonne santé financière",
      stable: "Situation stable, mais perfectible",
      warning: "Attention au contrôle financier",
      critical: "Moment de réorganiser votre argent",
    },
    heroEyebrow: "Tableau financier intelligent",
    heroTitle: "Votre santé financière sur la période",
    freeEntriesLabel: "Mouvements Free",
    freeBillsLabel: "Charges fixes Free",
    remainingLabel: (remaining: number) => `${remaining} restant(s)`,
    advancedPeriodFilters: "Filtres avancés de période",
    insightOverdue: (count: number) =>
      `${count} charge(s) fixe(s) en retard. Priorisez cela d'abord.`,
    insightNegativeBalance:
      "Votre solde de la période est négatif. Il est temps de ralentir les sorties.",
    insightTopExpense: (category: string, value: string) =>
      `Plus gros poste de la période : ${category} avec ${value}.`,
    insightInvestments: (value: string) =>
      `Vous avez déjà dirigé ${value} vers des investissements.`,
    insightClean:
      "Votre tableau de bord est propre. Continuez à enregistrer pour générer des analyses plus intelligentes.",
    smartCtaAdvanced: "Mode avancé activé",
    smartCtaNextStep: "Votre prochain saut financier",
    smartCtaPremiumConnected:
      "Votre tableau de bord est en mode avancé. Continuez à l'alimenter pour débloquer des analyses encore plus fortes.",
    smartCtaPremiumNoBank:
      "Connectez votre première banque et passez le tableau de bord en pilote automatique.",
    smartCtaFreeEntries: (remaining: number) =>
      `Vous êtes proche de la limite Free. Il reste ${remaining} mouvement(s).`,
    smartCtaFreeBills: (remaining: number) =>
      `Votre gestion fixe est presque pleine en Free. Il reste ${remaining} place(s).`,
    smartCtaDefault:
      "Si vous voulez plus d'automatisation, Premium connecte les imports et approfondit votre lecture financière.",
    connectBank: "Connecter la banque",
    wantPremium: "Je veux Premium",
    openFinanceTitle: "Open Finance",
    openFinanceSubtitleConnected: (count: number, lastSync: string) =>
      `${count} banque(s) active(s) • dernière sync : ${lastSync}`,
    openFinanceSubtitleEmpty: "Aucune banque connectée pour le moment",
    importedCount: (count: number) =>
      `${count} importée${count === 1 ? "" : "s"}`,
    openFinancePremiumFeature: "Open Finance complet",
    openFinancePremiumButton: "Open Finance est Premium",
    premiumFeatureTitle: "Fonction Premium",
    premiumFeatureText:
      "Avec Premium, vous connectez de vraies banques, voyez un solde consolidé et les dernières transactions importées automatiquement.",
    upgradeNow: "Passer à Premium",
    loadingData: "Chargement des données...",
    realAccounts: "Comptes réels",
    accountsBalance: "Solde des comptes",
    connectedAccounts: "Comptes connectés",
    noRealAccount: "Aucun compte réel chargé pour le moment.",
    genericBankAccount: "Compte bancaire",
    recentRealTransactions: "Dernières transactions réelles",
    noRealTransactions: "Aucune transaction réelle trouvée.",
    genericTransaction: "Transaction",
    periodBalance: "Solde de la période",
    hideBalance: "Masquer",
    showBalance: "Afficher",
    income: "Entrées",
    expense: "Sorties",
    goalTitle: "Objectif financier",
    currentGoal: (value: string) => `Objectif actuel : ${value}`,
    noGoal: "non défini",
    goalProgress: (value: number) => `${value}% de l'objectif`,
    goalPlaceholder: "Ex. : 1000",
    saveGoal: "Enregistrer l'objectif",
    filterLabels: {
      month: "Mois actuel",
      "3months": "3 mois",
      "6months": "6 mois",
      all: "Total",
    } as Record<FilterPeriod, string>,
    limitManualEntries: "Plus de 30 mouvements manuels",
    limitFixedBills: "Plus de 3 charges fixes",
    descriptionRequired: "Saisissez une description.",
    validAmount: "Saisissez un montant valide.",
    amountTooHigh: "Le montant semble trop élevé. Vérifiez avant d'enregistrer.",
    duplicateEntry:
      "Il semble que ce mouvement ait déjà été ajouté récemment. Vérifiez pour éviter un doublon.",
    biggerThanBalance:
      "Cette sortie est supérieure au solde actuel de la période. Voulez-vous quand même l'enregistrer ?",
    removeImportedTitle: "Supprimer la transaction importée",
    removeImportedText: (source: string) =>
      `Cette transaction a été importée${source}. Voulez-vous quand même la supprimer ?`,
    goalInvalid: "Saisissez un objectif valide.",
    goalSavedTitle: "Objectif enregistré",
    goalSavedText: "Votre objectif financier a été mis à jour.",
    billNameRequired: "Saisissez le nom de la charge.",
    dueDayInvalid: "Saisissez un jour d'échéance entre 1 et 31.",
    duplicateBill:
      "Une charge fixe très similaire existe déjà. Vérifiez pour éviter les doublons.",
    removeFixedBillTitle: "Supprimer la charge fixe",
    removeFixedBillText: "Voulez-vous supprimer cette charge fixe ?",
  },
  it: {
    errorTitle: "Errore",
    attentionTitle: "Attenzione",
    smartBlockTitle: "Blocco intelligente",
    review: "Rivedi",
    saveAnyway: "Salva comunque",
    cancel: "Annulla",
    remove: "Rimuovi",
    loadModuleError: "Non è stato possibile caricare i dati finanziari.",
    saveEntryError: "Non è stato possibile salvare il movimento.",
    saveGoalError: "Non è stato possibile salvare l'obiettivo.",
    saveFixedBillsError: "Non è stato possibile salvare le spese fisse.",
    neverSynced: "Mai sincronizzato",
    scoreLabels: {
      excellent: "Finanze molto ben organizzate",
      good: "Buona salute finanziaria",
      stable: "Situazione stabile, ma migliorabile",
      warning: "Attenzione al controllo finanziario",
      critical: "È il momento di riorganizzare il denaro",
    },
    heroEyebrow: "Pannello finanziario intelligente",
    heroTitle: "La tua salute finanziaria del periodo",
    freeEntriesLabel: "Movimenti Free",
    freeBillsLabel: "Spese fisse Free",
    remainingLabel: (remaining: number) => `Restano ${remaining}`,
    advancedPeriodFilters: "Filtri avanzati del periodo",
    insightOverdue: (count: number) =>
      `${count} spesa/e fissa/e in ritardo. Dai priorità a questo.`,
    insightNegativeBalance:
      "Il tuo saldo del periodo è negativo. È il momento di frenare le uscite.",
    insightTopExpense: (category: string, value: string) =>
      `La voce più pesante del periodo è ${category} con ${value}.`,
    insightInvestments: (value: string) =>
      `Hai già destinato ${value} agli investimenti.`,
    insightClean:
      "Il tuo pannello è pulito. Continua a registrare per generare analisi più intelligenti.",
    smartCtaAdvanced: "Modalità avanzata attiva",
    smartCtaNextStep: "Il tuo prossimo salto finanziario",
    smartCtaPremiumConnected:
      "Il tuo pannello è in modalità avanzata. Continua ad alimentarlo per sbloccare analisi ancora più forti.",
    smartCtaPremiumNoBank:
      "Collega la tua prima banca e trasforma il pannello in pilota automatico.",
    smartCtaFreeEntries: (remaining: number) =>
      `Sei vicino al limite Free. Restano ${remaining} movimento(i).`,
    smartCtaFreeBills: (remaining: number) =>
      `La tua gestione fissa è quasi piena nel Free. Restano ${remaining} posto(i).`,
    smartCtaDefault:
      "Se vuoi più automazione, Premium collega le importazioni e approfondisce la tua lettura finanziaria.",
    connectBank: "Collega banca",
    wantPremium: "Voglio Premium",
    openFinanceTitle: "Open Finance",
    openFinanceSubtitleConnected: (count: number, lastSync: string) =>
      `${count} banca/e attiva/e • ultima sync: ${lastSync}`,
    openFinanceSubtitleEmpty: "Nessuna banca collegata ancora",
    importedCount: (count: number) =>
      `${count} importata${count === 1 ? "" : "e"}`,
    openFinancePremiumFeature: "Open Finance completo",
    openFinancePremiumButton: "Open Finance è Premium",
    premiumFeatureTitle: "Funzione Premium",
    premiumFeatureText:
      "Nel Premium colleghi banche reali, vedi saldo consolidato e ultime transazioni importate automaticamente.",
    upgradeNow: "Fai upgrade",
    loadingData: "Caricamento dati...",
    realAccounts: "Conti reali",
    accountsBalance: "Saldo dei conti",
    connectedAccounts: "Conti collegati",
    noRealAccount: "Nessun conto reale caricato ancora.",
    genericBankAccount: "Conto bancario",
    recentRealTransactions: "Ultime transazioni reali",
    noRealTransactions: "Nessuna transazione reale trovata.",
    genericTransaction: "Transazione",
    periodBalance: "Saldo del periodo",
    hideBalance: "Nascondi",
    showBalance: "Mostra",
    income: "Entrate",
    expense: "Uscite",
    goalTitle: "Obiettivo finanziario",
    currentGoal: (value: string) => `Obiettivo attuale: ${value}`,
    noGoal: "non definito",
    goalProgress: (value: number) => `${value}% dell'obiettivo`,
    goalPlaceholder: "Es.: 1000",
    saveGoal: "Salva obiettivo",
    filterLabels: {
      month: "Mese attuale",
      "3months": "3 mesi",
      "6months": "6 mesi",
      all: "Totale",
    } as Record<FilterPeriod, string>,
    limitManualEntries: "Più di 30 movimenti manuali",
    limitFixedBills: "Più di 3 spese fisse",
    descriptionRequired: "Inserisci una descrizione.",
    validAmount: "Inserisci un valore valido.",
    amountTooHigh: "Il valore sembra troppo alto. Controllalo prima di salvare.",
    duplicateEntry:
      "Sembra che questo movimento sia già stato registrato poco fa. Controlla per evitare duplicati.",
    biggerThanBalance:
      "Questa uscita è maggiore del saldo attuale del periodo. Vuoi salvarla comunque?",
    removeImportedTitle: "Rimuovi transazione importata",
    removeImportedText: (source: string) =>
      `Questa transazione è stata importata${source}. Vuoi comunque rimuoverla?`,
    goalInvalid: "Inserisci un obiettivo valido.",
    goalSavedTitle: "Obiettivo salvato",
    goalSavedText: "Il tuo obiettivo finanziario è stato aggiornato.",
    billNameRequired: "Inserisci il nome della spesa.",
    dueDayInvalid: "Inserisci un giorno di scadenza tra 1 e 31.",
    duplicateBill:
      "Esiste già una spesa fissa molto simile. Controlla per evitare duplicati.",
    removeFixedBillTitle: "Rimuovi spesa fissa",
    removeFixedBillText: "Vuoi rimuovere questa spesa fissa?",
  },
} as const;

export default function DinheiroScreen() {
  const { colors } = useAppTheme();
  const { language } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const copy = useMemo(() => moduleCopyByLanguage[language], [language]);
  const ui = useMemo(() => moneyUiCopyByLanguage[language], [language]);
  const deepUi = useMemo(() => moneyDeepUiCopyByLanguage[language], [language]);
  const formatCurrency = useCallback(
    (value: number, currencyCode?: string | null) =>
      formatCurrencyByLanguage(value, language, currencyCode),
    [language]
  );
  const maskCurrency = useCallback(
    (value: number, visible: boolean, currencyCode?: string | null) =>
      formatMaskedCurrencyByLanguage(value, visible, language, currencyCode),
    [language]
  );
  const formatDateTime = useCallback(
    (value: string) =>
      formatDateTimeByLanguage(value, language, undefined, ui.neverSynced),
    [language, ui.neverSynced]
  );
  const getMonthLabel = useCallback(
    (monthKey: string) => formatMonthYearByLanguage(monthKey, language),
    [language]
  );
  const moneyTourSteps = useMemo(
    () => [
      {
        icon: "add-circle-outline" as const,
        title: copy.tour1Title,
        description: copy.tour1Description,
        primaryLabel: copy.next,
      },
      {
        icon: "receipt-outline" as const,
        title: copy.tour2Title,
        description: copy.tour2Description,
        primaryLabel: copy.next,
      },
      {
        icon: "business-outline" as const,
        title: copy.tour3Title,
        description: copy.tour3Description,
        primaryLabel: copy.finish,
      },
    ],
    [copy]
  );
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);

  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [goal, setGoal] = useState<MoneyGoal>({ target: 0 });
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([]);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [journeyPlan, setJourneyPlan] = useState<LifeJourneyPlan | null>(null);
  const [journeyProgress, setJourneyProgress] =
    useState<AIJourneyProgress | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [fixedBillModalOpen, setFixedBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showModuleTour, setShowModuleTour] = useState(false);
  const [moduleTourStepIndex, setModuleTourStepIndex] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<MoneyCategory | null>(null);
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>("month");
  const [showBalance, setShowBalance] = useState(true);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<MoneyEntryType>("entrada");
  const [category, setCategory] = useState<MoneyCategory>("Outros");

  const [goalInput, setGoalInput] = useState("");

  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDay, setBillDueDay] = useState("");
  const [billCategory, setBillCategory] = useState<FixedBillCategory>("Moradia");

  const currentPeriod = useMemo(() => getCurrentPeriodKey(), []);
  const isPremium = plan === "premium";
  const planReady = isHydrated && plan !== null;
  
  const goToUpgrade = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const showPremiumAlert = useCallback(
    (feature: string) => {
      Alert.alert(
        copy.premiumAlertTitle,
        copy.premiumAlertText.replace("{{feature}}", feature),
        [
        { text: copy.premiumAlertCancel, style: "cancel" },
          { text: copy.premiumAlertButton, onPress: goToUpgrade },
        ]
      );
    },
    [copy, goToUpgrade]
  );

  useEffect(() => {
    async function loadOpenFinanceData() {
      if (!isPremium) {
        setAccounts([]);
        setTransactions([]);
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);
        const acc = await listRealAccounts();
        const tx = await listRealTransactions();

        setAccounts(acc?.accounts || []);
        setTransactions(tx?.transactions || []);
      } catch (error) {
        console.log("Erro ao carregar dados financeiros:", error);
        setAccounts([]);
        setTransactions([]);
      } finally {
        setLoadingData(false);
      }
    }

    loadOpenFinanceData();
  }, [isPremium]);

  const loadData = useCallback(async () => {
    try {
      const [
        entriesRaw,
        goalRaw,
        billsRaw,
        connectionsRaw,
        planRaw,
        legacyPremiumRaw,
        aiPlanRaw,
        aiJourneyProgressRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(MONEY_ENTRIES_KEY),
        AsyncStorage.getItem(MONEY_GOAL_KEY),
        AsyncStorage.getItem(MONEY_FIXED_BILLS_KEY),
        AsyncStorage.getItem(BANK_CONNECTIONS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
        AsyncStorage.getItem("isPremium"),
        AsyncStorage.getItem(AI_PLAN_KEY),
        AsyncStorage.getItem(AI_JOURNEY_PROGRESS_KEY),
      ]);

      const parsedEntries = entriesRaw ? JSON.parse(entriesRaw) : [];
      const parsedGoal = goalRaw ? JSON.parse(goalRaw) : { target: 0 };
      const parsedBills = billsRaw ? JSON.parse(billsRaw) : [];
      const parsedConnections = connectionsRaw ? JSON.parse(connectionsRaw) : [];
      const parsedPlan: SubscriptionPlan = 
        planRaw === "premium" || legacyPremiumRaw === "true"
          ? "premium" 
          : "free";

      setPlan(parsedPlan);
      if (parsedPlan === "premium" && planRaw !== "premium") {
        await AsyncStorage.setItem(SUBSCRIPTION_PLAN_KEY, "premium");
      }

      if (legacyPremiumRaw === "true") {
        await AsyncStorage.removeItem("isPremium");
      }

      const normalizedBills: FixedBill[] = Array.isArray(parsedBills)
        ? parsedBills.map((bill: any) => ({
            id: String(bill.id),
            title: String(bill.title ?? ""),
            amount: Number(bill.amount ?? 0),
            dueDay: Number(bill.dueDay ?? 1),
            category: bill.category ?? "Outros",
            lastPaidPeriod: bill.lastPaidPeriod ?? null,
            createdAt: String(bill.createdAt ?? new Date().toISOString()),
          }))
        : [];

      const normalizedConnections: BankConnection[] = Array.isArray(parsedConnections)
        ? parsedConnections.map((item: any) => ({
            id: String(item?.id ?? ""),
            institutionId: String(item?.institutionId ?? ""),
            institutionName: String(item?.institutionName ?? "Banco"),
            institutionLogo: String(item?.institutionLogo ?? "🏦"),
            institutionType: String(item?.institutionType ?? "Conta"),
            status: item?.status ?? "pending",
            accountCount: Number(item?.accountCount ?? 0),
            connectedAt: String(item?.connectedAt ?? new Date().toISOString()),
            lastSyncedAt: item?.lastSyncedAt ? String(item.lastSyncedAt) : null,
            consentExpiresAt: item?.consentExpiresAt
              ? String(item.consentExpiresAt)
              : null,
          }))
        : [];

      setEntries(Array.isArray(parsedEntries) ? parsedEntries.map(normalizeEntry) : []);
      setGoal(parsedGoal?.target >= 0 ? parsedGoal : { target: 0 });
      setFixedBills(normalizedBills);
      setConnections(normalizedConnections);

      setGoalInput(parsedGoal?.target ? String(parsedGoal.target).replace(".", ",") : "");
      setPeriodFilter(parsedPlan === "premium" ? "all" : "month");

      const rawJourneyPlan = aiPlanRaw ? JSON.parse(aiPlanRaw) : null;
      const rawJourneyProgress = aiJourneyProgressRaw
        ? JSON.parse(aiJourneyProgressRaw)
        : null;
      const evaluatedJourney = rawJourneyPlan
        ? await evaluateJourney(rawJourneyPlan, rawJourneyProgress, language)
        : null;

      setJourneyPlan(evaluatedJourney?.plan ?? null);
      setJourneyProgress(evaluatedJourney?.plan ? evaluatedJourney.progress : null);

      if (evaluatedJourney?.plan) {
        await AsyncStorage.setItem(
          AI_JOURNEY_PROGRESS_KEY,
          JSON.stringify(evaluatedJourney.progress)
        );
      }

      const moduleTourState = await readJourneyModuleTourState();

      if (
        evaluatedJourney?.plan?.primaryArea === "financeiro" &&
        !moduleTourState.financeiro
      ) {
        setModuleTourStepIndex(0);
        setShowModuleTour(true);
      } else {
        setShowModuleTour(false);
      }
    } catch (error) {
      console.log("Erro ao carregar módulo dinheiro:", error);
      Alert.alert(ui.errorTitle, ui.loadModuleError);
      setShowModuleTour(false);
    } finally {
      setIsHydrated(true);
    }
  }, [language, ui]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const saveEntries = useCallback(async (next: MoneyEntry[]) => {
    try {
      setEntries(next);
      await AsyncStorage.setItem(MONEY_ENTRIES_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Erro ao salvar movimentações:", error);
      Alert.alert(ui.errorTitle, ui.saveEntryError);
    }
  }, [ui]);

  const saveGoal = useCallback(async (nextTarget: number) => {
    try {
      const next = { target: nextTarget };
      setGoal(next);
      await AsyncStorage.setItem(MONEY_GOAL_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Erro ao salvar meta:", error);
      Alert.alert(ui.errorTitle, ui.saveGoalError);
    }
  }, [ui]);

  const saveFixedBills = useCallback(async (next: FixedBill[]) => {
    try {
      setFixedBills(next);
      await AsyncStorage.setItem(MONEY_FIXED_BILLS_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Erro ao salvar contas fixas:", error);
      Alert.alert(ui.errorTitle, ui.saveFixedBillsError);
    }
  }, [ui]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => isEntryInPeriod(entry.createdAt, periodFilter));
  }, [entries, periodFilter]);

  const importedEntriesCount = useMemo(() => {
    return filteredEntries.filter((entry) => entry.source === "open_finance").length;
  }, [filteredEntries]);

  const activeConnectionsCount = useMemo(() => {
    return connections.filter((connection) => connection.status === "active").length;
  }, [connections]);

  const lastSyncLabel = useMemo(() => {
    const lastDates = connections
      .map((item) => item.lastSyncedAt)
      .filter((item): item is string => !!item)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (lastDates.length === 0) return ui.neverSynced;

    return formatDateTime(lastDates[0]);
  }, [connections, formatDateTime, ui.neverSynced]);

  const totalRealAccountsBalance = useMemo(() => {
    return accounts.reduce((acc, item) => {
      const balance = Number(
        item?.balance ?? item?.currentBalance ?? item?.availableBalance ?? 0
      );
      return acc + (Number.isNaN(balance) ? 0 : balance);
    }, 0);
  }, [accounts]);

  const recentRealTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const manualEntriesCount = useMemo(() => {
    return entries.filter((entry) => entry.source !== "open_finance").length;
  }, [entries]);

  const remainingManualEntries = useMemo(() => {
    return Math.max(0, FREE_MAX_MANUAL_ENTRIES - manualEntriesCount);
  }, [manualEntriesCount]);

  const remainingFixedBills = useMemo(() => {
    return Math.max(0, FREE_MAX_FIXED_BILLS - fixedBills.length);
  }, [fixedBills.length]);

  const canCreateManualEntry = isPremium || manualEntriesCount < FREE_MAX_MANUAL_ENTRIES;
  const canCreateFixedBill = isPremium || fixedBills.length < FREE_MAX_FIXED_BILLS;
  const activeMoneyTourStep = moneyTourSteps[moduleTourStepIndex];
  const moneyJourneyGuide = useMemo<MoneyJourneyGuide | null>(() => {
    if (journeyPlan?.primaryArea !== "financeiro" || !journeyProgress) {
      return null;
    }

    const currentDay =
      journeyPlan.journeyDays[journeyProgress.currentDay - 1] ?? null;

    if (!currentDay) {
      return null;
    }

    const pendingTasks = currentDay.tasks.filter((task) => !task.completed);
    const nextTask = pendingTasks[0] ?? null;
    const entriesTask = currentDay.tasks.find(
      (task) => task.validationType === "money_entries_total"
    );
    const fixedBillsTask = currentDay.tasks.find(
      (task) => task.validationType === "fixed_bills_total"
    );
    const remainingEntries = entriesTask
      ? Math.max(0, entriesTask.targetValue - entriesTask.currentValue)
      : 0;
    const remainingFixedBillsCount = fixedBillsTask
      ? Math.max(0, fixedBillsTask.targetValue - fixedBillsTask.currentValue)
      : 0;
    const totalDays = journeyPlan.journeyDays.length;

    const moduleLabels = {
      goals: {
        pt: "Metas",
        en: "Goals",
        es: "Metas",
        fr: "Objectifs",
        it: "Obiettivi",
      },
      learning: {
        pt: "Aprendizado",
        en: "Learning",
        es: "Aprendizaje",
        fr: "Apprentissage",
        it: "Apprendimento",
      },
      time: {
        pt: "Tempo",
        en: "Time",
        es: "Tiempo",
        fr: "Temps",
        it: "Tempo",
      },
      work: {
        pt: "Trabalho",
        en: "Work",
        es: "Trabajo",
        fr: "Travail",
        it: "Lavoro",
      },
      leisure: {
        pt: "Lazer",
        en: "Leisure",
        es: "Ocio",
        fr: "Loisirs",
        it: "Svago",
      },
      checkin: {
        pt: "Check-in",
        en: "Check-in",
        es: "Check-in",
        fr: "Check-in",
        it: "Check-in",
      },
      spiritual: {
        pt: "Espiritualidade",
        en: "Spirituality",
        es: "Espiritualidad",
        fr: "Spiritualité",
        it: "Spiritualità",
      },
      habits: {
        pt: "Hábitos",
        en: "Habits",
        es: "Hábitos",
        fr: "Habitudes",
        it: "Abitudini",
      },
    } as const;

    const moduleByValidationType = {
      goals_total: {
        action: "goals",
        label: moduleLabels.goals[language],
      },
      learning_items_total: {
        action: "learning",
        label: moduleLabels.learning[language],
      },
      time_items_total: {
        action: "time",
        label: moduleLabels.time[language],
      },
      work_items_total: {
        action: "work",
        label: moduleLabels.work[language],
      },
      leisure_items_total: {
        action: "leisure",
        label: moduleLabels.leisure[language],
      },
      checkin_today: {
        action: "checkin",
        label: moduleLabels.checkin[language],
      },
      spiritual_items_total: {
        action: "spiritual",
        label: moduleLabels.spiritual[language],
      },
      habits_total: {
        action: "habits",
        label: moduleLabels.habits[language],
      },
      habits_completed_today: {
        action: "habits",
        label: moduleLabels.habits[language],
      },
    } as const;

    const copyByLanguage = {
      pt: {
        eyebrow: (day: number, total: number) =>
          `Jornada financeira • Dia ${day}/${total}`,
        dayOneHeader:
          "Hoje o app precisa da sua base financeira: comece pelas contas fixas e pelos primeiros movimentos reais do mês.",
        dayOneHeroTitle: "Sua base financeira começa aqui",
        dayOneBillsSubtitle: (bills: number, entries: number) =>
          `Cadastre ${bills} conta(s) fixa(s) e registre ${entries} movimentação(ões) reais para o app entender seu mês.`,
        dayOneEntriesHeader:
          "Sua base já começou. Agora registre entradas e saídas reais para a IA começar a ler o seu fluxo financeiro.",
        dayOneEntriesSubtitle: (entries: number) =>
          `Faltam ${entries} movimentação(ões) para fechar a leitura inicial do seu dinheiro.`,
        ongoingHeader: (day: number, total: number) =>
          `Sua jornada financeira está no dia ${day} de ${total}. Continue alimentando este módulo para a IA ajustar os próximos passos com mais precisão.`,
        billsSubtitle: (bills: number) =>
          `Complete ${bills} conta(s) fixa(s) para fechar a estrutura recorrente do seu mês.`,
        entriesSubtitle: (entries: number) =>
          `Registre mais ${entries} movimentação(ões) para dar contexto real ao seu fluxo financeiro.`,
        ctaBillTitle: "Monte sua base mensal",
        ctaBillText: (bills: number) =>
          `Cadastre ${bills} conta(s) fixa(s) agora para o app entender seus compromissos recorrentes.`,
        ctaEntryTitle: "Alimente seu fluxo real",
        ctaEntryText: (entries: number) =>
          `Registre ${entries} movimentação(ões) reais para a IA continuar organizando sua leitura financeira.`,
        finishedHeader:
          "Sua base financeira já está ativa. Continue alimentando este módulo para manter a leitura do app fiel à sua realidade.",
        finishedHeroTitle: "Seu dinheiro está ganhando clareza",
        finishedHeroSubtitle:
          "A primeira fase foi concluída. Agora este módulo já consegue orientar melhor seus próximos ajustes.",
        ctaFinishedTitle: "Próximo cuidado financeiro",
        ctaFinishedText:
          "Se surgir algo novo, registre aqui para a jornada continuar inteligente e conectada com a sua vida real.",
        crossHeader: (day: number, total: number, module: string) =>
          `Dia ${day} de ${total}: agora o dinheiro precisa conversar com ${module} para a sua vida andar como sistema.`,
        crossCtaTitle: (module: string) => `Agora avance em ${module}`,
        crossCtaText: (task: string, module: string) =>
          `Para liberar a próxima fase financeira, conclua "${task}" no módulo ${module}.`,
        openModule: (module: string) => `Abrir ${module}`,
        bridgeTitle: "Módulos que destravam seu dinheiro agora",
        bridgeText:
          "Nesta fase, o Dinheiro não anda sozinho. Essas áreas ajudam a organizar a vida inteira junto com ele.",
      },
      en: {
        eyebrow: (day: number, total: number) =>
          `Financial journey • Day ${day}/${total}`,
        dayOneHeader:
          "Today the app needs your financial foundation: start with fixed bills and your first real money entries of the month.",
        dayOneHeroTitle: "Your financial base starts here",
        dayOneBillsSubtitle: (bills: number, entries: number) =>
          `Add ${bills} fixed bill(s) and log ${entries} real money entr${entries === 1 ? "y" : "ies"} so the app can understand your month.`,
        dayOneEntriesHeader:
          "Your base has started. Now log real income and expenses so the AI can begin reading your financial flow.",
        dayOneEntriesSubtitle: (entries: number) =>
          `${entries} more entr${entries === 1 ? "y is" : "ies are"} needed to complete your first money reading.`,
        ongoingHeader: (day: number, total: number) =>
          `Your financial journey is on day ${day} of ${total}. Keep feeding this module so the AI can refine your next steps with more precision.`,
        billsSubtitle: (bills: number) =>
          `Add ${bills} more fixed bill(s) to complete your recurring monthly structure.`,
        entriesSubtitle: (entries: number) =>
          `Log ${entries} more entr${entries === 1 ? "y" : "ies"} to give real context to your monthly cash flow.`,
        ctaBillTitle: "Build your monthly base",
        ctaBillText: (bills: number) =>
          `Add ${bills} fixed bill(s) now so the app understands your recurring commitments.`,
        ctaEntryTitle: "Feed your real cash flow",
        ctaEntryText: (entries: number) =>
          `Log ${entries} real entr${entries === 1 ? "y" : "ies"} so the AI can keep organizing your financial picture.`,
        finishedHeader:
          "Your financial base is already active. Keep feeding this module so the app stays faithful to your real life.",
        finishedHeroTitle: "Your money is getting clearer",
        finishedHeroSubtitle:
          "The first phase is complete. This module can now guide your next adjustments much better.",
        ctaFinishedTitle: "Your next financial care step",
        ctaFinishedText:
          "Whenever something new happens, log it here so the journey stays smart and connected to your real life.",
        crossHeader: (day: number, total: number, module: string) =>
          `Day ${day} of ${total}: your finances now need to work together with ${module} so your life can move as one system.`,
        crossCtaTitle: (module: string) => `Now move to ${module}`,
        crossCtaText: (task: string, module: string) =>
          `To unlock the next financial phase, complete "${task}" inside ${module}.`,
        openModule: (module: string) => `Open ${module}`,
        bridgeTitle: "Modules that unlock your finances now",
        bridgeText:
          "At this stage, Money should not work alone. These areas help organize your whole life together.",
      },
      es: {
        eyebrow: (day: number, total: number) =>
          `Jornada financiera • Día ${day}/${total}`,
        dayOneHeader:
          "Hoy la app necesita tu base financiera: empieza por las cuentas fijas y por los primeros movimientos reales del mes.",
        dayOneHeroTitle: "Tu base financiera empieza aquí",
        dayOneBillsSubtitle: (bills: number, entries: number) =>
          `Registra ${bills} cuenta(s) fija(s) y ${entries} movimiento(s) reales para que la app entienda tu mes.`,
        dayOneEntriesHeader:
          "Tu base ya comenzó. Ahora registra ingresos y gastos reales para que la IA empiece a leer tu flujo financiero.",
        dayOneEntriesSubtitle: (entries: number) =>
          `Faltan ${entries} movimiento(s) para completar la lectura inicial de tu dinero.`,
        ongoingHeader: (day: number, total: number) =>
          `Tu jornada financiera va por el día ${day} de ${total}. Sigue alimentando este módulo para que la IA ajuste mejor los próximos pasos.`,
        billsSubtitle: (bills: number) =>
          `Completa ${bills} cuenta(s) fija(s) para cerrar la estructura recurrente de tu mes.`,
        entriesSubtitle: (entries: number) =>
          `Registra ${entries} movimiento(s) más para dar contexto real a tu flujo financiero.`,
        ctaBillTitle: "Construye tu base mensual",
        ctaBillText: (bills: number) =>
          `Registra ${bills} cuenta(s) fija(s) ahora para que la app entienda tus compromisos recurrentes.`,
        ctaEntryTitle: "Alimenta tu flujo real",
        ctaEntryText: (entries: number) =>
          `Registra ${entries} movimiento(s) reales para que la IA siga organizando tu lectura financiera.`,
        finishedHeader:
          "Tu base financiera ya está activa. Sigue alimentando este módulo para que la lectura de la app siga fiel a tu realidad.",
        finishedHeroTitle: "Tu dinero está ganando claridad",
        finishedHeroSubtitle:
          "La primera fase fue completada. Ahora este módulo ya puede orientar mejor tus próximos ajustes.",
        ctaFinishedTitle: "Tu próximo cuidado financiero",
        ctaFinishedText:
          "Cuando ocurra algo nuevo, regístralo aquí para que la jornada siga siendo inteligente y conectada con tu vida real.",
        crossHeader: (day: number, total: number, module: string) =>
          `Día ${day} de ${total}: ahora tus finanzas necesitan conversar con ${module} para que tu vida avance como un sistema.`,
        crossCtaTitle: (module: string) => `Ahora avanza en ${module}`,
        crossCtaText: (task: string, module: string) =>
          `Para desbloquear la próxima fase financiera, completa "${task}" dentro de ${module}.`,
        openModule: (module: string) => `Abrir ${module}`,
        bridgeTitle: "Módulos que desbloquean tus finanzas ahora",
        bridgeText:
          "En esta fase, Dinero no camina solo. Estas áreas ayudan a organizar tu vida entera junto con él.",
      },
      fr: {
        eyebrow: (day: number, total: number) =>
          `Parcours financier • Jour ${day}/${total}`,
        dayOneHeader:
          "Aujourd'hui, l'app a besoin de votre base financière : commencez par les charges fixes et par les premiers mouvements réels du mois.",
        dayOneHeroTitle: "Votre base financière commence ici",
        dayOneBillsSubtitle: (bills: number, entries: number) =>
          `Ajoutez ${bills} facture(s) fixe(s) et enregistrez ${entries} mouvement(s) réel(s) pour que l'app comprenne votre mois.`,
        dayOneEntriesHeader:
          "Votre base a déjà commencé. Enregistrez maintenant vos vraies entrées et sorties pour que l'IA commence à lire votre flux financier.",
        dayOneEntriesSubtitle: (entries: number) =>
          `Il manque ${entries} mouvement(s) pour compléter la première lecture de votre argent.`,
        ongoingHeader: (day: number, total: number) =>
          `Votre parcours financier est au jour ${day} sur ${total}. Continuez à alimenter ce module pour que l'IA ajuste mieux les prochaines étapes.`,
        billsSubtitle: (bills: number) =>
          `Complétez ${bills} facture(s) fixe(s) pour fermer la structure récurrente de votre mois.`,
        entriesSubtitle: (entries: number) =>
          `Enregistrez encore ${entries} mouvement(s) pour donner un contexte réel à votre flux financier.`,
        ctaBillTitle: "Construisez votre base mensuelle",
        ctaBillText: (bills: number) =>
          `Ajoutez ${bills} facture(s) fixe(s) maintenant pour que l'app comprenne vos engagements récurrents.`,
        ctaEntryTitle: "Alimentez votre flux réel",
        ctaEntryText: (entries: number) =>
          `Enregistrez ${entries} mouvement(s) réel(s) pour que l'IA continue à organiser votre lecture financière.`,
        finishedHeader:
          "Votre base financière est déjà active. Continuez à alimenter ce module pour que la lecture de l'app reste fidèle à votre réalité.",
        finishedHeroTitle: "Votre argent devient plus clair",
        finishedHeroSubtitle:
          "La première phase est terminée. Ce module peut maintenant guider beaucoup mieux vos prochains ajustements.",
        ctaFinishedTitle: "Votre prochain soin financier",
        ctaFinishedText:
          "Dès qu'il se passe quelque chose de nouveau, enregistrez-le ici pour que le parcours reste intelligent et connecté à votre vraie vie.",
        crossHeader: (day: number, total: number, module: string) =>
          `Jour ${day} sur ${total} : vos finances doivent maintenant travailler avec ${module} pour organiser votre vie comme un système.`,
        crossCtaTitle: (module: string) => `Passez maintenant à ${module}`,
        crossCtaText: (task: string, module: string) =>
          `Pour débloquer la prochaine phase financière, terminez "${task}" dans ${module}.`,
        openModule: (module: string) => `Ouvrir ${module}`,
        bridgeTitle: "Modules qui débloquent vos finances maintenant",
        bridgeText:
          "À cette étape, l'Argent n'avance pas seul. Ces domaines aident à organiser votre vie entière avec lui.",
      },
      it: {
        eyebrow: (day: number, total: number) =>
          `Percorso finanziario • Giorno ${day}/${total}`,
        dayOneHeader:
          "Oggi l'app ha bisogno della tua base finanziaria: inizia dalle spese fisse e dai primi movimenti reali del mese.",
        dayOneHeroTitle: "La tua base finanziaria inizia qui",
        dayOneBillsSubtitle: (bills: number, entries: number) =>
          `Registra ${bills} spesa/e fissa/e e ${entries} movimento/i reale/i perché l'app capisca il tuo mese.`,
        dayOneEntriesHeader:
          "La tua base è già iniziata. Ora registra entrate e uscite reali così l'IA può iniziare a leggere il tuo flusso finanziario.",
        dayOneEntriesSubtitle: (entries: number) =>
          `Mancano ${entries} movimento/i per completare la prima lettura del tuo denaro.`,
        ongoingHeader: (day: number, total: number) =>
          `Il tuo percorso finanziario è al giorno ${day} di ${total}. Continua ad alimentare questo modulo perché l'IA possa affinare meglio i prossimi passi.`,
        billsSubtitle: (bills: number) =>
          `Completa ${bills} spesa/e fissa/e per chiudere la struttura ricorrente del tuo mese.`,
        entriesSubtitle: (entries: number) =>
          `Registra altri ${entries} movimento/i per dare contesto reale al tuo flusso finanziario.`,
        ctaBillTitle: "Costruisci la tua base mensile",
        ctaBillText: (bills: number) =>
          `Registra ${bills} spesa/e fissa/e ora così l'app capisce i tuoi impegni ricorrenti.`,
        ctaEntryTitle: "Alimenta il tuo flusso reale",
        ctaEntryText: (entries: number) =>
          `Registra ${entries} movimento/i reale/i perché l'IA continui a organizzare la tua lettura finanziaria.`,
        finishedHeader:
          "La tua base finanziaria è già attiva. Continua ad alimentare questo modulo perché la lettura dell'app resti fedele alla tua realtà.",
        finishedHeroTitle: "Il tuo denaro sta diventando più chiaro",
        finishedHeroSubtitle:
          "La prima fase è stata completata. Ora questo modulo riesce a guidare molto meglio i tuoi prossimi aggiustamenti.",
        ctaFinishedTitle: "Il tuo prossimo passo di cura finanziaria",
        ctaFinishedText:
          "Quando succede qualcosa di nuovo, registralo qui così il percorso resta intelligente e collegato alla tua vita reale.",
        crossHeader: (day: number, total: number, module: string) =>
          `Giorno ${day} di ${total}: ora le tue finanze hanno bisogno di dialogare con ${module} perché la tua vita funzioni come un sistema.`,
        crossCtaTitle: (module: string) => `Ora passa a ${module}`,
        crossCtaText: (task: string, module: string) =>
          `Per sbloccare la prossima fase finanziaria, completa "${task}" dentro ${module}.`,
        openModule: (module: string) => `Apri ${module}`,
        bridgeTitle: "Moduli che sbloccano ora le tue finanze",
        bridgeText:
          "In questa fase, il Denaro non lavora da solo. Queste aree aiutano a organizzare tutta la tua vita insieme.",
      },
    } as const;

    const localized = copyByLanguage[language];

    if (!nextTask) {
      return {
        headerSubtitle: localized.finishedHeader,
        heroEyebrow: localized.eyebrow(currentDay.day, totalDays),
        heroTitle: localized.finishedHeroTitle,
        heroSubtitle: localized.finishedHeroSubtitle,
        ctaTitle: localized.ctaFinishedTitle,
        ctaText: localized.ctaFinishedText,
        ctaButtonLabel: deepUi.addEntry,
        action: "entry",
      };
    }

    if (currentDay.day === 1 && remainingFixedBillsCount > 0) {
      return {
        headerSubtitle: localized.dayOneHeader,
        heroEyebrow: localized.eyebrow(currentDay.day, totalDays),
        heroTitle: localized.dayOneHeroTitle,
        heroSubtitle: localized.dayOneBillsSubtitle(
          remainingFixedBillsCount,
          Math.max(remainingEntries, 0)
        ),
        ctaTitle: localized.ctaBillTitle,
        ctaText: localized.ctaBillText(remainingFixedBillsCount),
        ctaButtonLabel: deepUi.addFixedBill,
        action: "bill",
      };
    }

    if (currentDay.day === 1 && remainingEntries > 0) {
      return {
        headerSubtitle: localized.dayOneEntriesHeader,
        heroEyebrow: localized.eyebrow(currentDay.day, totalDays),
        heroTitle: localized.dayOneHeroTitle,
        heroSubtitle: localized.dayOneEntriesSubtitle(remainingEntries),
        ctaTitle: localized.ctaEntryTitle,
        ctaText: localized.ctaEntryText(remainingEntries),
        ctaButtonLabel: deepUi.addEntry,
        action: "entry",
      };
    }

    if (nextTask.validationType === "fixed_bills_total") {
      return {
        headerSubtitle: localized.ongoingHeader(currentDay.day, totalDays),
        heroEyebrow: localized.eyebrow(currentDay.day, totalDays),
        heroTitle: currentDay.title,
        heroSubtitle: localized.billsSubtitle(remainingFixedBillsCount),
        ctaTitle: localized.ctaBillTitle,
        ctaText: localized.ctaBillText(remainingFixedBillsCount),
        ctaButtonLabel: deepUi.addFixedBill,
        action: "bill",
      };
    }

    if (nextTask.validationType === "money_entries_total") {
      return {
        headerSubtitle: localized.ongoingHeader(currentDay.day, totalDays),
        heroEyebrow: localized.eyebrow(currentDay.day, totalDays),
        heroTitle: currentDay.title,
        heroSubtitle: localized.entriesSubtitle(remainingEntries),
        ctaTitle: localized.ctaEntryTitle,
        ctaText: localized.ctaEntryText(remainingEntries),
        ctaButtonLabel: deepUi.addEntry,
        action: "entry",
      };
    }

    const crossModuleMeta =
      moduleByValidationType[
        nextTask.validationType as keyof typeof moduleByValidationType
      ];

    if (crossModuleMeta) {
      return {
        headerSubtitle: localized.crossHeader(
          currentDay.day,
          totalDays,
          crossModuleMeta.label
        ),
        heroEyebrow: localized.eyebrow(currentDay.day, totalDays),
        heroTitle: currentDay.title,
        heroSubtitle: localized.crossCtaText(
          nextTask.title,
          crossModuleMeta.label
        ),
        ctaTitle: localized.crossCtaTitle(crossModuleMeta.label),
        ctaText: localized.crossCtaText(nextTask.title, crossModuleMeta.label),
        ctaButtonLabel: localized.openModule(crossModuleMeta.label),
        action: crossModuleMeta.action,
      };
    }

    return {
      headerSubtitle: localized.ongoingHeader(currentDay.day, totalDays),
      heroEyebrow: localized.eyebrow(currentDay.day, totalDays),
      heroTitle: currentDay.title,
      heroSubtitle: currentDay.summary,
      ctaTitle: isPremium ? ui.connectBank : ui.smartCtaNextStep,
      ctaText: currentDay.summary,
      ctaButtonLabel: isPremium ? ui.connectBank : ui.wantPremium,
      action: isPremium ? "bank" : "upgrade",
    };
  }, [deepUi.addEntry, deepUi.addFixedBill, isPremium, journeyPlan, journeyProgress, language, ui.connectBank, ui.smartCtaNextStep, ui.wantPremium]);
  const moneyJourneyModules = useMemo<MoneyJourneyModule[]>(() => {
    if (journeyPlan?.primaryArea !== "financeiro" || !journeyProgress) {
      return [];
    }

    const currentDay =
      journeyPlan.journeyDays[journeyProgress.currentDay - 1] ?? null;

    if (!currentDay) {
      return [];
    }

    const moduleLabels = {
      bill: {
        pt: "Dinheiro",
        en: "Money",
        es: "Dinero",
        fr: "Argent",
        it: "Denaro",
      },
      entry: {
        pt: "Dinheiro",
        en: "Money",
        es: "Dinero",
        fr: "Argent",
        it: "Denaro",
      },
      goals: {
        pt: "Metas",
        en: "Goals",
        es: "Metas",
        fr: "Objectifs",
        it: "Obiettivi",
      },
      learning: {
        pt: "Aprendizado",
        en: "Learning",
        es: "Aprendizaje",
        fr: "Apprentissage",
        it: "Apprendimento",
      },
      time: {
        pt: "Tempo",
        en: "Time",
        es: "Tiempo",
        fr: "Temps",
        it: "Tempo",
      },
      work: {
        pt: "Trabalho",
        en: "Work",
        es: "Trabajo",
        fr: "Travail",
        it: "Lavoro",
      },
      leisure: {
        pt: "Lazer",
        en: "Leisure",
        es: "Ocio",
        fr: "Loisirs",
        it: "Svago",
      },
      checkin: {
        pt: "Check-in",
        en: "Check-in",
        es: "Check-in",
        fr: "Check-in",
        it: "Check-in",
      },
      spiritual: {
        pt: "Espiritualidade",
        en: "Spirituality",
        es: "Espiritualidad",
        fr: "Spiritualité",
        it: "Spiritualità",
      },
      habits: {
        pt: "Hábitos",
        en: "Habits",
        es: "Hábitos",
        fr: "Habitudes",
        it: "Abitudini",
      },
    } as const;

    const modulesByTask = {
      money_entries_total: {
        action: "entry",
        label: moduleLabels.entry[language],
      },
      fixed_bills_total: {
        action: "bill",
        label: moduleLabels.bill[language],
      },
      goals_total: {
        action: "goals",
        label: moduleLabels.goals[language],
      },
      learning_items_total: {
        action: "learning",
        label: moduleLabels.learning[language],
      },
      time_items_total: {
        action: "time",
        label: moduleLabels.time[language],
      },
      work_items_total: {
        action: "work",
        label: moduleLabels.work[language],
      },
      leisure_items_total: {
        action: "leisure",
        label: moduleLabels.leisure[language],
      },
      spiritual_items_total: {
        action: "spiritual",
        label: moduleLabels.spiritual[language],
      },
      habits_total: {
        action: "habits",
        label: moduleLabels.habits[language],
      },
      habits_completed_today: {
        action: "habits",
        label: moduleLabels.habits[language],
      },
      checkin_today: {
        action: "checkin",
        label: moduleLabels.checkin[language],
      },
    } as const;

    return currentDay.tasks.reduce<MoneyJourneyModule[]>((acc, task) => {
      const module =
        modulesByTask[task.validationType as keyof typeof modulesByTask];

      if (!module || acc.some((item) => item.action === module.action)) {
        return acc;
      }

      return [...acc, module];
    }, []);
  }, [journeyPlan, journeyProgress, language]);
  const moneyJourneyBridgeCopy = useMemo(() => {
    const copyByLanguage = {
      pt: {
        title: "Módulos que destravam seu dinheiro agora",
        text:
          "Nesta fase, o Dinheiro conversa com estas áreas para organizar sua vida como um sistema completo.",
      },
      en: {
        title: "Modules that unlock your finances now",
        text:
          "At this stage, Money works together with these areas to organize your life as one complete system.",
      },
      es: {
        title: "Módulos que desbloquean tus finanzas ahora",
        text:
          "En esta fase, Dinero conversa con estas áreas para organizar tu vida como un sistema completo.",
      },
      fr: {
        title: "Modules qui débloquent vos finances maintenant",
        text:
          "À cette étape, l'Argent travaille avec ces domaines pour organiser votre vie comme un système complet.",
      },
      it: {
        title: "Moduli che sbloccano ora le tue finanze",
        text:
          "In questa fase, il Denaro lavora con queste aree per organizzare la tua vita come un sistema completo.",
      },
    } as const;

    return copyByLanguage[language];
  }, [language]);

  const handleAdvanceModuleTour = useCallback(async () => {
    const lastStep = moduleTourStepIndex >= moneyTourSteps.length - 1;

    if (!lastStep) {
      setModuleTourStepIndex((current) => current + 1);
      return;
    }

    await completeJourneyModuleTour("financeiro");
    setShowModuleTour(false);
  }, [moduleTourStepIndex, moneyTourSteps.length]);

  const handleSkipModuleTour = useCallback(async () => {
    await skipJourneyModuleTour("financeiro");
    setShowModuleTour(false);
  }, []);

  const totalEntradas = useMemo(() => {
    return filteredEntries
      .filter((entry) => entry.type === "entrada")
      .reduce((acc, entry) => acc + entry.amount, 0);
  }, [filteredEntries]);

  const totalSaidas = useMemo(() => {
    return filteredEntries
      .filter((entry) => entry.type === "saida")
      .reduce((acc, entry) => acc + entry.amount, 0);
  }, [filteredEntries]);

  const saldoAtual = totalEntradas - totalSaidas;

  const investmentsTotal = useMemo(() => {
    return filteredEntries
      .filter((entry) => entry.category === "Investimentos" && entry.type === "entrada")
      .reduce((acc, entry) => acc + entry.amount, 0);
  }, [filteredEntries]);

  const variableExpensesCurrentMonth = useMemo(() => {
    return entries
      .filter(
        (entry) =>
          entry.type === "saida" && getMonthKey(entry.createdAt) === currentPeriod
      )
      .reduce((acc, entry) => acc + entry.amount, 0);
  }, [entries, currentPeriod]);

  const goalProgress = useMemo(() => {
    if (!goal.target || goal.target <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((saldoAtual / goal.target) * 100)));
  }, [saldoAtual, goal.target]);

  const categorySummary = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const entradas = filteredEntries
        .filter((entry) => entry.category === cat && entry.type === "entrada")
        .reduce((acc, entry) => acc + entry.amount, 0);

      const saidas = filteredEntries
        .filter((entry) => entry.category === cat && entry.type === "saida")
        .reduce((acc, entry) => acc + entry.amount, 0);

      return {
        category: cat,
        entradas,
        saidas,
        saldo: entradas - saidas,
      };
    }).filter((item) => item.entradas > 0 || item.saidas > 0);
  }, [filteredEntries]);

  const selectedCategoryEntries = useMemo(() => {
    if (!selectedCategory) return [];

    return filteredEntries
      .filter((entry) => entry.category === selectedCategory)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [filteredEntries, selectedCategory]);

  const monthlyChartData = useMemo(() => {
    const grouped = new Map<
      string,
      { monthKey: string; entradas: number; saidas: number }
    >();

    filteredEntries.forEach((entry) => {
      const monthKey = getMonthKey(entry.createdAt);
      const current = grouped.get(monthKey) ?? {
        monthKey,
        entradas: 0,
        saidas: 0,
      };

      if (entry.type === "entrada") current.entradas += entry.amount;
      if (entry.type === "saida") current.saidas += entry.amount;

      grouped.set(monthKey, current);
    });

    const sorted = Array.from(grouped.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );

    const limited = periodFilter === "all" ? sorted.slice(-6) : sorted;
    const maxValue = Math.max(
      1,
      ...limited.flatMap((item) => [item.entradas, item.saidas])
    );

    return limited.map((item) => ({
      ...item,
      label: getMonthLabel(item.monthKey),
      entradaPercent:
        item.entradas === 0 ? 0 : Math.max(8, Math.round((item.entradas / maxValue) * 100)),
      saidaPercent:
        item.saidas === 0 ? 0 : Math.max(8, Math.round((item.saidas / maxValue) * 100)),
    }));
  }, [filteredEntries, getMonthLabel, periodFilter]);

  const fixedBillsSorted = useMemo(() => {
    return [...fixedBills].sort((a, b) => a.dueDay - b.dueDay);
  }, [fixedBills]);

  const fixedBillsSummary = useMemo(() => {
    const total = fixedBills.reduce((acc, bill) => acc + bill.amount, 0);

    const paid = fixedBills
      .filter((bill) => isBillPaidInCurrentMonth(bill, currentPeriod))
      .reduce((acc, bill) => acc + bill.amount, 0);

    const pending = fixedBills
      .filter((bill) => !isBillPaidInCurrentMonth(bill, currentPeriod))
      .reduce((acc, bill) => acc + bill.amount, 0);

    const overdueCount = fixedBills.filter(
      (bill) =>
        !isBillPaidInCurrentMonth(bill, currentPeriod) && bill.dueDay < getTodayDay()
    ).length;

    const dueTodayCount = fixedBills.filter(
      (bill) =>
        !isBillPaidInCurrentMonth(bill, currentPeriod) && bill.dueDay === getTodayDay()
    ).length;

    const upcomingCount = fixedBills.filter((bill) => {
      const diff = bill.dueDay - getTodayDay();
      return (
        !isBillPaidInCurrentMonth(bill, currentPeriod) &&
        diff > 0 &&
        diff <= 3
      );
    }).length;

    return {
      total,
      paid,
      pending,
      overdueCount,
      dueTodayCount,
      upcomingCount,
    };
  }, [fixedBills, currentPeriod]);

  const financialScore = useMemo(() => {
    return getFinancialScore({
      totalEntradas,
      totalSaidas,
      contasPendentesValor: fixedBillsSummary.pending,
      overdueCount: fixedBillsSummary.overdueCount,
      investments: investmentsTotal,
      saldoAtual,
    });
  }, [
    totalEntradas,
    totalSaidas,
    fixedBillsSummary.pending,
    fixedBillsSummary.overdueCount,
    investmentsTotal,
    saldoAtual,
  ]);

  const financialScoreLabel = useMemo(
    () => getFinancialScoreLabelByLanguage(financialScore, language),
    [financialScore, language]
  );

  const financialInsights = useMemo(() => {
    const tips: string[] = [];

    if (fixedBillsSummary.overdueCount > 0) {
      tips.push(ui.insightOverdue(fixedBillsSummary.overdueCount));
    }

    if (saldoAtual < 0) {
      tips.push(ui.insightNegativeBalance);
    }

    const topExpense = [...categorySummary]
      .sort((a, b) => b.saidas - a.saidas)
      .find((item) => item.saidas > 0);

    if (topExpense) {
      tips.push(ui.insightTopExpense(topExpense.category, formatCurrency(topExpense.saidas)));
    }

    if (investmentsTotal > 0) {
      tips.push(ui.insightInvestments(formatCurrency(investmentsTotal)));
    }

    if (tips.length === 0) {
      tips.push(ui.insightClean);
    }

    return tips.slice(0, 3);
  }, [
    categorySummary,
    formatCurrency,
    fixedBillsSummary.overdueCount,
    investmentsTotal,
    saldoAtual,
    ui,
  ]);

  const duplicateManualEntry = useMemo(() => {
    const cleanTitle = normalizeText(title);
    const parsedAmount = Number(amount.replace(",", "."));

    if (!cleanTitle || !parsedAmount || parsedAmount <= 0) return null;

    return entries.find((entry) => {
      if (entry.source === "open_finance") return false;

      const sameTitle = normalizeText(entry.title) === cleanTitle;
      const sameType = entry.type === type;
      const sameCategory = entry.category === category;
      const sameAmount = Math.abs(entry.amount - parsedAmount) < 0.001;
      const recentEnough =
        Date.now() - new Date(entry.createdAt).getTime() <= DUPLICATE_ENTRY_WINDOW_MS;

      return sameTitle && sameType && sameCategory && sameAmount && recentEnough;
    });
  }, [title, amount, entries, type, category]);

  const expensePressureLevel = useMemo(() => {
    if (totalEntradas <= 0 || totalSaidas <= 0) return "ok";
    const ratio = totalSaidas / totalEntradas;

    if (ratio >= 1) return "critical";
    if (ratio >= 0.85) return "warning";
    return "ok";
  }, [totalEntradas, totalSaidas]);

  const smartCtaText = useMemo(() => {
    if (isPremium) {
      if (activeConnectionsCount > 0) {
        return ui.smartCtaPremiumConnected;
      }
      return ui.smartCtaPremiumNoBank;
    }

    if (remainingManualEntries <= 5) {
      return ui.smartCtaFreeEntries(remainingManualEntries);
    }

    if (remainingFixedBills <= 1) {
      return ui.smartCtaFreeBills(remainingFixedBills);
    }

    return ui.smartCtaDefault;
  }, [
    activeConnectionsCount,
    isPremium,
    remainingFixedBills,
    remainingManualEntries,
    ui,
  ]);

  const openEntryModal = useCallback(() => {
    if (!canCreateManualEntry) {
      showPremiumAlert(ui.limitManualEntries);
      return;
    }
    setModalOpen(true);
  }, [canCreateManualEntry, showPremiumAlert, ui.limitManualEntries]);

  const openFixedBillModal = useCallback(() => {
    if (!canCreateFixedBill) {
      showPremiumAlert(ui.limitFixedBills);
      return;
    }

    setEditingBill(null);
    setBillTitle("");
    setBillAmount("");
    setBillDueDay("");
    setBillCategory("Moradia");
    setFixedBillModalOpen(true);
  }, [canCreateFixedBill, showPremiumAlert, ui.limitFixedBills]);

  const handleMoneyJourneyAction = useCallback(() => {
    if (!moneyJourneyGuide) {
      if (isPremium) {
        router.push("/dinheiro-conexoes");
        return;
      }

      goToUpgrade();
      return;
    }

    switch (moneyJourneyGuide.action) {
      case "bill":
        openFixedBillModal();
        return;
      case "entry":
        openEntryModal();
        return;
      case "goals":
        router.push("/metas");
        return;
      case "learning":
        router.push("/aprendizado");
        return;
      case "time":
        router.push("/tempo");
        return;
      case "work":
        router.push("/trabalho");
        return;
      case "leisure":
        router.push("/lazer");
        return;
      case "checkin":
        router.push("/checkin");
        return;
      case "spiritual":
        router.push("/espiritualidade");
        return;
      case "habits":
        router.push("/habitos");
        return;
      case "bank":
        router.push("/dinheiro-conexoes");
        return;
      case "upgrade":
      default:
        goToUpgrade();
    }
  }, [goToUpgrade, isPremium, moneyJourneyGuide, openEntryModal, openFixedBillModal]);

  const adicionarMovimentacao = useCallback(async () => {
    if (!isPremium && manualEntriesCount >= FREE_MAX_MANUAL_ENTRIES) {
      showPremiumAlert(ui.limitManualEntries);
      return;
    }

    const cleanTitle = title.trim();
    const parsedAmount = Number(amount.replace(",", "."));

    if (!cleanTitle) {
      Alert.alert(ui.attentionTitle, ui.descriptionRequired);
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert(ui.attentionTitle, ui.validAmount);
      return;
    }

    if (parsedAmount > 999999999) {
      Alert.alert(ui.attentionTitle, ui.amountTooHigh);
      return;
    }

    if (duplicateManualEntry) {
      Alert.alert(ui.smartBlockTitle, ui.duplicateEntry);
      return;
    }

    const proceedToSave = async () => {
      const newEntry: MoneyEntry = {
        id: uid(),
        title: cleanTitle,
        amount: parsedAmount,
        type,
        category,
        createdAt: new Date().toISOString(),
      };

      const next = [newEntry, ...entries];
      await saveEntries(next);

      setTitle("");
      setAmount("");
      setType("entrada");
      setCategory("Outros");
      setSelectedCategory(category);
      setModalOpen(false);
    };

    if (
      type === "saida" &&
      totalEntradas > 0 &&
      parsedAmount > saldoAtual &&
      saldoAtual >= 0
    ) {
      Alert.alert(
        ui.smartBlockTitle,
        ui.biggerThanBalance,
        [
          { text: ui.review, style: "cancel" },
          { text: ui.saveAnyway, onPress: proceedToSave },
        ]
      );
      return;
    }

    await proceedToSave();
  }, [
    isPremium,
    manualEntriesCount,
    title,
    amount,
    type,
    category,
    entries,
    saveEntries,
    showPremiumAlert,
    duplicateManualEntry,
    totalEntradas,
    saldoAtual,
    ui,
  ]);

  const removerMovimentacao = useCallback(
    async (entry: MoneyEntry) => {
      const imported = entry.source === "open_finance";

      const proceed = async () => {
        const next = entries.filter((item) => item.id !== entry.id);
        await saveEntries(next);
      };

      if (imported) {
        Alert.alert(
          ui.removeImportedTitle,
          ui.removeImportedText(
            entry.institutionName ? ` ${entry.institutionName}` : ""
          ),
          [
            { text: ui.cancel, style: "cancel" },
            { text: ui.remove, style: "destructive", onPress: proceed },
          ]
        );
        return;
      }

      await proceed();
    },
    [entries, saveEntries, ui]
  );

  const salvarMeta = useCallback(async () => {
    const parsed = Number(goalInput.replace(",", "."));

    if (Number.isNaN(parsed) || parsed < 0) {
      Alert.alert(ui.attentionTitle, ui.goalInvalid);
      return;
    }

    await saveGoal(parsed);
    Alert.alert(ui.goalSavedTitle, ui.goalSavedText);
  }, [goalInput, saveGoal, ui]);

  const adicionarContaFixa = useCallback(async () => {
    if (!editingBill && !isPremium && fixedBills.length >= FREE_MAX_FIXED_BILLS) {
      showPremiumAlert(ui.limitFixedBills);
      return;
    }

    const cleanTitle = billTitle.trim();
    const parsedAmount = Number(billAmount.replace(",", "."));
    const parsedDueDay = Number(billDueDay);

    if (!cleanTitle) {
      Alert.alert(ui.attentionTitle, ui.billNameRequired);
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(ui.attentionTitle, ui.validAmount);
      return;
    }

    if (Number.isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      Alert.alert(ui.attentionTitle, ui.dueDayInvalid);
      return;
    }

    const duplicatedBill = fixedBills.find(
      (bill) =>
        bill.id !== editingBill?.id &&
        normalizeText(bill.title) === normalizeText(cleanTitle) &&
        bill.dueDay === parsedDueDay &&
        Math.abs(bill.amount - parsedAmount) < 0.001
    );

    if (duplicatedBill) {
      Alert.alert(ui.smartBlockTitle, ui.duplicateBill);
      return;
    }

    if (editingBill) {
      const updated = fixedBills.map((bill) =>
        bill.id === editingBill.id
          ? {
              ...bill,
              title: cleanTitle,
              amount: parsedAmount,
              dueDay: parsedDueDay,
              category: billCategory,
            }
          : bill
      );

      await saveFixedBills(updated);
      setEditingBill(null);
    } else {
      const newBill: FixedBill = {
        id: uid(),
        title: cleanTitle,
        amount: parsedAmount,
        dueDay: parsedDueDay,
        category: billCategory,
        lastPaidPeriod: null,
        createdAt: new Date().toISOString(),
      };

      await saveFixedBills([newBill, ...fixedBills]);
    }

    setBillTitle("");
    setBillAmount("");
    setBillDueDay("");
    setBillCategory("Moradia");
    setFixedBillModalOpen(false);
  }, [
    editingBill,
    isPremium,
    fixedBills,
    billTitle,
    billAmount,
    billDueDay,
    billCategory,
    saveFixedBills,
    showPremiumAlert,
    ui,
  ]);

  const editarContaFixa = useCallback((bill: FixedBill) => {
    setEditingBill(bill);
    setBillTitle(bill.title);
    setBillAmount(String(bill.amount).replace(".", ","));
    setBillDueDay(String(bill.dueDay));
    setBillCategory(bill.category);
    setFixedBillModalOpen(true);
  }, []);

  const toggleFixedBillPaid = useCallback(
    async (billId: string) => {
      const next = fixedBills.map((bill) => {
        if (bill.id !== billId) return bill;

        const currentlyPaid = isBillPaidInCurrentMonth(bill, currentPeriod);

        return {
          ...bill,
          lastPaidPeriod: currentlyPaid ? null : currentPeriod,
        };
      });

      await saveFixedBills(next);
    },
    [fixedBills, saveFixedBills, currentPeriod]
  );

  const removerContaFixa = useCallback(
    async (billId: string) => {
      Alert.alert(ui.removeFixedBillTitle, ui.removeFixedBillText, [
        { text: ui.cancel, style: "cancel" },
        {
          text: ui.remove,
          style: "destructive",
          onPress: async () => {
            const next = fixedBills.filter((bill) => bill.id !== billId);
            await saveFixedBills(next);
          },
        },
      ]);
    },
    [fixedBills, saveFixedBills, ui]
  );

  const handleSelectFilter = useCallback(
    (filter: FilterPeriod) => {
      if (!isPremium && filter !== "month") {
        showPremiumAlert(ui.advancedPeriodFilters);
        return;
      }

      setPeriodFilter(filter);
      setSelectedCategory(null);
    },
    [isPremium, showPremiumAlert, ui.advancedPeriodFilters]
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
          subtitle={moneyJourneyGuide?.headerSubtitle ?? copy.headerSubtitle}
          icon="wallet-outline"
          badgeLabel={
            planReady ? (isPremium ? copy.planPremium : copy.planFree) : undefined
          }
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={planReady ? goToUpgrade : undefined}
        />

        {planReady && !isPremium ? (
          <View
            style={[
              styles.upgradeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text style={[styles.upgradeTitle, { color: colors.text }]}>
              {copy.upgradeTitle}
            </Text>

            <Text style={[styles.upgradeText, { color: colors.textSecondary }]}>
              {copy.upgradeText}
            </Text>

            <View style={styles.limitGrid}>
              <View
                style={[
                  styles.limitCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.limitCardLabel, { color: colors.textMuted }]}>
                  {ui.freeEntriesLabel}
                </Text>
                <Text style={[styles.limitCardValue, { color: colors.text }]}>
                  {manualEntriesCount}/{FREE_MAX_MANUAL_ENTRIES}
                </Text>
                <Text
                  style={[
                    styles.limitCardHint,
                    {
                      color:
                        remainingManualEntries <= 5 ? colors.warning : colors.textSecondary,
                    },
                  ]}
                >
                  {ui.remainingLabel(remainingManualEntries)}
                </Text>
              </View>

              <View
                style={[
                  styles.limitCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.limitCardLabel, { color: colors.textMuted }]}>
                  {ui.freeBillsLabel}
                </Text>
                <Text style={[styles.limitCardValue, { color: colors.text }]}>
                  {fixedBills.length}/{FREE_MAX_FIXED_BILLS}
                </Text>
                <Text
                  style={[
                    styles.limitCardHint,
                    {
                      color:
                        remainingFixedBills <= 1 ? colors.warning : colors.textSecondary,
                    },
                  ]}
                >
                  {ui.remainingLabel(remainingFixedBills)}
                </Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.upgradeButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={goToUpgrade}
            >
              <Text
                style={[
                  styles.upgradeButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {copy.upgradeButton}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.ctaStrip,
            {
              backgroundColor: colors.surface,
              borderColor:
                expensePressureLevel === "critical"
                  ? colors.danger
                  : expensePressureLevel === "warning"
                  ? colors.warning
                  : colors.border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.ctaStripTitle, { color: colors.text }]}>
              {moneyJourneyGuide?.ctaTitle ||
                (isPremium ? ui.smartCtaAdvanced : ui.smartCtaNextStep)}
            </Text>
            <Text style={[styles.ctaStripText, { color: colors.textSecondary }]}>
              {moneyJourneyGuide?.ctaText ?? smartCtaText}
            </Text>
          </View>

          <Pressable
            style={[
              styles.ctaStripButton,
              {
                backgroundColor: moneyJourneyGuide
                  ? colors.accentButtonBackground
                  : isPremium
                  ? colors.surfaceAlt
                  : colors.accentButtonBackground,
                borderColor: moneyJourneyGuide
                  ? colors.accentButtonBorder
                  : isPremium
                  ? colors.border
                  : colors.accentButtonBorder,
              },
              (moneyJourneyGuide || !isPremium) &&
                colors.isWhiteAccentButton &&
                styles.whiteAccentButton,
            ]}
            onPress={handleMoneyJourneyAction}
          >
            <Text
              style={[
                styles.ctaStripButtonText,
                {
                  color: moneyJourneyGuide
                    ? colors.accentButtonText
                    : isPremium
                    ? colors.text
                    : colors.accentButtonText,
                },
              ]}
            >
              {moneyJourneyGuide?.ctaButtonLabel ||
                (isPremium ? ui.connectBank : ui.wantPremium)}
            </Text>
          </Pressable>
        </View>

        {moneyJourneyModules.length > 1 ? (
          <View
            style={[
              styles.moduleBridgeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.moduleBridgeTitle, { color: colors.text }]}>
              {moneyJourneyBridgeCopy.title}
            </Text>

            <Text
              style={[styles.moduleBridgeText, { color: colors.textSecondary }]}
            >
              {moneyJourneyBridgeCopy.text}
            </Text>

            <View style={styles.moduleBridgePills}>
              {moneyJourneyModules.map((module) => (
                <View
                  key={module.action}
                  style={[
                    styles.moduleBridgePill,
                    {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.moduleBridgePillText, { color: colors.accent }]}
                  >
                    {module.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
              {moneyJourneyGuide?.heroEyebrow ?? ui.heroEyebrow}
            </Text>

            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Text style={[styles.heroBadgeText, { color: colors.accent }]}>
                {financialScore}/100
              </Text>
            </View>
          </View>

          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {moneyJourneyGuide?.heroTitle ?? ui.heroTitle}
          </Text>

          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {moneyJourneyGuide?.heroSubtitle ?? financialScoreLabel}
          </Text>

          <View style={[styles.heroTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.heroFill,
                {
                  width: `${Math.max(financialScore, 4)}%`,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>

          <View style={styles.insightsWrap}>
            {financialInsights.map((tip, index) => (
              <Text
                key={`${tip}_${index}`}
                style={[styles.insightText, { color: colors.textMuted }]}
              >
                • {tip}
              </Text>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.openFinanceCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.openFinanceTopRow}>
            <View style={styles.openFinanceLeft}>
              <Text style={[styles.openFinanceTitle, { color: colors.text }]}>
                {ui.openFinanceTitle}
              </Text>

              <Text
                style={[styles.openFinanceSubtitle, { color: colors.textSecondary }]}
              >
                {activeConnectionsCount > 0
                  ? ui.openFinanceSubtitleConnected(
                      activeConnectionsCount,
                      lastSyncLabel
                    )
                  : ui.openFinanceSubtitleEmpty}
              </Text>
            </View>

            <View
              style={[
                styles.openFinanceBadge,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Text style={[styles.openFinanceBadgeText, { color: colors.accent }]}>
                {ui.importedCount(importedEntriesCount)}
              </Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.openFinanceButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={() => {
              if (!isPremium) {
                showPremiumAlert(ui.openFinancePremiumFeature);
                return;
              }
              router.push("/dinheiro-conexoes");
            }}
          >
            <Text
              style={[
                styles.openFinanceButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {isPremium
                ? activeConnectionsCount > 0
                  ? ui.connectBank
                  : ui.connectBank
                : ui.openFinancePremiumButton}
            </Text>
          </Pressable>

          <View style={styles.openFinanceDataSection}>
            {planReady && !isPremium ? (
              <View
                style={[
                  styles.openFinanceLockedCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.openFinanceLockedTitle, { color: colors.text }]}>
                  {ui.premiumFeatureTitle}
                </Text>

                <Text
                  style={[
                    styles.openFinanceLockedText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {ui.premiumFeatureText}
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
                  onPress={goToUpgrade}
                >
                  <Text
                    style={[
                      styles.upgradeButtonText,
                      { color: colors.accentButtonText },
                    ]}
                  >
                    {ui.upgradeNow}
                  </Text>
                </Pressable>
              </View>
            ) : loadingData ? (
              <Text
                style={[styles.openFinanceLoadingText, { color: colors.textSecondary }]}
              >
                {ui.loadingData}
              </Text>
            ) : (
              <>
                <View style={styles.openFinanceMiniGrid}>
                  <View
                    style={[
                      styles.openFinanceMiniCard,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.openFinanceMiniLabel, { color: colors.textMuted }]}
                    >
                      {ui.realAccounts}
                    </Text>
                    <Text
                      style={[styles.openFinanceMiniValue, { color: colors.text }]}
                    >
                      {accounts.length}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.openFinanceMiniCard,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.openFinanceMiniLabel, { color: colors.textMuted }]}
                    >
                      {ui.accountsBalance}
                    </Text>
                    <Text
                      style={[styles.openFinanceMiniValue, { color: colors.text }]}
                    >
                      {maskCurrency(totalRealAccountsBalance, showBalance)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sectionSubTitle, { color: colors.text }]}>
                  {ui.connectedAccounts}
                </Text>

                {accounts.length === 0 ? (
                  <View
                    style={[
                      styles.openFinanceDataCard,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.openFinanceDataText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {ui.noRealAccount}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.openFinanceList}>
                    {accounts.map((acc) => {
                      const accountName =
                        acc?.name ||
                        acc?.displayName ||
                        acc?.institutionName ||
                        ui.genericBankAccount;

                      const balance = Number(
                        acc?.balance ?? acc?.currentBalance ?? acc?.availableBalance ?? 0
                      );

                      return (
                        <View
                          key={String(acc?.id ?? uid())}
                          style={[
                            styles.openFinanceDataCard,
                            {
                              backgroundColor: colors.surfaceAlt,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.openFinanceDataTitle,
                              { color: colors.text },
                            ]}
                          >
                            {accountName}
                          </Text>

                          <Text
                            style={[
                              styles.openFinanceDataText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {deepUi.accountBalance(
                              maskCurrency(balance, showBalance)
                            )}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <Text style={[styles.sectionSubTitle, { color: colors.text }]}>
                  {ui.recentRealTransactions}
                </Text>

                {recentRealTransactions.length === 0 ? (
                  <View
                    style={[
                      styles.openFinanceDataCard,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.openFinanceDataText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {ui.noRealTransactions}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.openFinanceList}>
                    {recentRealTransactions.map((tx) => {
                      const txAmount = Number(tx?.amount ?? 0);
                      const txDescription =
                        tx?.description || tx?.title || tx?.name || ui.genericTransaction;
                      const txDate =
                        tx?.date || tx?.createdAt || tx?.authorizedDate || null;

                      return (
                        <View
                          key={String(tx?.id ?? uid())}
                          style={[
                            styles.openFinanceDataCard,
                            {
                              backgroundColor: colors.surfaceAlt,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.openFinanceDataTitle,
                              { color: colors.text },
                            ]}
                          >
                            {txDescription}
                          </Text>

                          <Text
                            style={[
                              styles.openFinanceDataText,
                              {
                                color:
                                  txAmount < 0 ? colors.danger : colors.success,
                              },
                            ]}
                          >
                            {txAmount < 0 ? "-" : "+"}{" "}
                            {showBalance
                              ? formatCurrency(Math.abs(txAmount))
                              : "R$ •••••"}
                          </Text>

                          {txDate ? (
                            <Text
                              style={[
                                styles.openFinanceDataMeta,
                                { color: colors.textMuted },
                              ]}
                            >
                              {formatDateTime(txDate)}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        <View
          style={[
            styles.balanceHeroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.balanceHeroTopRow}>
            <Text style={[styles.balanceHeroLabel, { color: colors.textMuted }]}>
              {ui.periodBalance}
            </Text>

            <Pressable
              style={[
                styles.balanceVisibilityButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowBalance((prev) => !prev)}
            >
              <Text
                style={[
                  styles.balanceVisibilityButtonText,
                  { color: colors.textMuted },
                ]}
              >
                {showBalance ? ui.hideBalance : ui.showBalance}
              </Text>
            </Pressable>
          </View>

          <Text
            style={[
              styles.balanceHeroValue,
              { color: saldoAtual >= 0 ? colors.text : colors.danger },
            ]}
          >
            {maskCurrency(saldoAtual, showBalance)}
          </Text>

          <View style={styles.balanceMiniRow}>
            <View
              style={[
                styles.balanceMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.balanceMiniLabel, { color: colors.textMuted }]}>
                {ui.income}
              </Text>
              <Text style={[styles.balanceMiniValue, { color: colors.success }]}>
                {maskCurrency(totalEntradas, showBalance)}
              </Text>
            </View>

            <View
              style={[
                styles.balanceMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.balanceMiniLabel, { color: colors.textMuted }]}>
                {ui.expense}
              </Text>
              <Text style={[styles.balanceMiniValue, { color: colors.danger }]}>
                {maskCurrency(totalSaidas, showBalance)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => {
            const active = periodFilter === option.key;
            const locked = !isPremium && option.key !== "month";

            return (
              <Pressable
                key={option.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: locked ? 0.6 : 1,
                  },
                  active && {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accentBorder,
                  },
                ]}
                onPress={() => handleSelectFilter(option.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.textMuted },
                    active && { color: colors.accent },
                  ]}
                >
                  {ui.filterLabels[option.key]}
                  {locked ? " 🔒" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{ui.goalTitle}</Text>

        <View
          style={[
            styles.goalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.goalLabel, { color: colors.textMuted }]}>
            {ui.currentGoal(
              goal.target > 0 ? formatCurrency(goal.target) : ui.noGoal
            )}
          </Text>

          <View style={[styles.goalTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.goalFill,
                {
                  width: `${goalProgress}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>

          <Text style={[styles.goalProgressText, { color: colors.success }]}>
            {ui.goalProgress(goalProgress)}
          </Text>

          <View style={styles.goalInputRow}>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder={ui.goalPlaceholder}
              placeholderTextColor={colors.textSecondary}
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

            <Pressable
              style={[
                styles.goalButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={salvarMeta}
            >
              <Text
                style={[
                  styles.goalButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {ui.saveGoal}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {deepUi.monthPanelTitle}
        </Text>

        <View style={styles.fixedSummaryGrid}>
          <View
            style={[
              styles.fixedSummaryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.fixedSummaryValue, { color: colors.text }]}>
              {maskCurrency(fixedBillsSummary.total, showBalance)}
            </Text>
            <Text style={[styles.fixedSummaryLabel, { color: colors.textMuted }]}>
              {deepUi.fixedSummaryTotal}
            </Text>
          </View>

          <View
            style={[
              styles.fixedSummaryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.fixedSummaryValue, { color: colors.text }]}>
              {maskCurrency(variableExpensesCurrentMonth, showBalance)}
            </Text>
            <Text style={[styles.fixedSummaryLabel, { color: colors.textMuted }]}>
              {deepUi.fixedSummaryVariable}
            </Text>
          </View>

          <View
            style={[
              styles.fixedSummaryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.fixedSummaryValue, { color: colors.text }]}>
              {maskCurrency(fixedBillsSummary.paid, showBalance)}
            </Text>
            <Text style={[styles.fixedSummaryLabel, { color: colors.textMuted }]}>
              {deepUi.fixedSummaryPaid}
            </Text>
          </View>

          <View
            style={[
              styles.fixedSummaryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.fixedSummaryValue, { color: colors.text }]}>
              {maskCurrency(fixedBillsSummary.pending, showBalance)}
            </Text>
            <Text style={[styles.fixedSummaryLabel, { color: colors.textMuted }]}>
              {deepUi.fixedSummaryPending}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.alertsCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.warning,
            },
          ]}
        >
          <Text style={[styles.alertsTitle, { color: colors.warning }]}>
            {deepUi.monthlyAlertsTitle}
          </Text>

          <Text style={[styles.alertsText, { color: colors.textMuted }]}>
            {deepUi.monthlyAlertsText(
              fixedBillsSummary.dueTodayCount,
              fixedBillsSummary.upcomingCount,
              fixedBillsSummary.overdueCount
            )}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {deepUi.fixedBillsTitle}
        </Text>

        {planReady && !isPremium ? (
          <Text style={[styles.freeInfoText, { color: colors.textMuted }]}>
            {deepUi.freeFixedBillsInfo(
              FREE_MAX_FIXED_BILLS,
              remainingFixedBills
            )}
          </Text>
        ) : null}

        <View style={styles.topActionsRow}>
          <Pressable
            style={[
              styles.addButtonHalf,
              {
                backgroundColor: canCreateFixedBill
                  ? colors.accentButtonBackground
                  : colors.surfaceAlt,
                borderColor: canCreateFixedBill
                  ? colors.accentButtonBorder
                  : colors.border,
                opacity: canCreateFixedBill ? 1 : 0.75,
              },
              canCreateFixedBill &&
                colors.isWhiteAccentButton &&
                styles.whiteAccentButton,
            ]}
            onPress={openFixedBillModal}
          >
            <Text
              style={[
                styles.addButtonText,
                {
                  color: canCreateFixedBill
                    ? colors.accentButtonText
                    : colors.textSecondary,
                },
              ]}
            >
              {canCreateFixedBill
                ? deepUi.addFixedBill
                : deepUi.freeLimitReached}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.secondaryTopButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              if (!isPremium) {
                showPremiumAlert(ui.openFinancePremiumFeature);
                return;
              }
              router.push("/dinheiro-conexoes");
            }}
          >
            <Text style={[styles.secondaryTopButtonText, { color: colors.text }]}>
              {isPremium ? ui.connectBank : copy.planPremium}
            </Text>
          </Pressable>
        </View>

        {fixedBillsSorted.length === 0 ? (
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
              {deepUi.emptyFixedBillsTitle}
            </Text>

            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {deepUi.emptyFixedBillsText}
            </Text>
          </View>
        ) : (
          <View style={styles.fixedBillsList}>
            {fixedBillsSorted.map((bill) => {
              const isPaid = isBillPaidInCurrentMonth(bill, currentPeriod);
              const isOverdue = !isPaid && bill.dueDay < getTodayDay();
              const isDueToday = !isPaid && bill.dueDay === getTodayDay();
              const isUpcoming =
                !isPaid &&
                bill.dueDay > getTodayDay() &&
                bill.dueDay - getTodayDay() <= 3;

              return (
                <View
                  key={bill.id}
                  style={[
                    styles.fixedBillCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.fixedBillTop}>
                    <View style={styles.fixedBillLeft}>
                      <Text style={[styles.fixedBillTitle, { color: colors.text }]}>
                        {getCategoryEmoji(bill.category)} {bill.title}
                      </Text>

                      <Text
                        style={[
                          styles.fixedBillMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {getMoneyCategoryLabel(bill.category, language)} •{" "}
                        {deepUi.dueDayText(bill.dueDay)}
                      </Text>
                    </View>

                    <View style={styles.fixedBillRight}>
                      <Text style={[styles.fixedBillAmount, { color: colors.text }]}>
                        {maskCurrency(bill.amount, showBalance)}
                      </Text>

                      <Text
                        style={[
                          styles.fixedBillStatus,
                          isPaid
                            ? { color: colors.success }
                            : isOverdue
                            ? { color: colors.danger }
                            : isDueToday
                            ? { color: colors.accent }
                            : isUpcoming
                            ? { color: "#8b5cf6" }
                            : { color: colors.warning },
                        ]}
                      >
                        {isPaid
                          ? deepUi.statusPaid
                          : isOverdue
                          ? deepUi.statusOverdue
                          : isDueToday
                          ? deepUi.statusDueToday
                          : isUpcoming
                          ? deepUi.statusDueSoon
                          : deepUi.statusPending}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fixedBillActions}>
                    <Pressable
                      style={[
                        styles.fixedBillToggleButton,
                        {
                          backgroundColor: isPaid
                            ? colors.successSoft
                            : colors.accentSoft,
                          borderColor: isPaid
                            ? colors.success
                            : colors.accentBorder,
                        },
                      ]}
                      onPress={() => toggleFixedBillPaid(bill.id)}
                    >
                      <Text
                        style={[
                          styles.fixedBillToggleButtonText,
                          { color: isPaid ? colors.success : colors.accent },
                        ]}
                      >
                        {isPaid ? deepUi.markPending : deepUi.markPaid}
                      </Text>
                    </Pressable>

                    <Pressable onPress={() => editarContaFixa(bill)}>
                      <Text style={[styles.editText, { color: colors.accent }]}>
                        {deepUi.edit}
                      </Text>
                    </Pressable>

                    <Pressable onPress={() => removerContaFixa(bill.id)}>
                      <Text
                        style={[styles.removeText, { color: colors.textSecondary }]}
                      >
                        Remover
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {deepUi.entriesTitle}
        </Text>

        {planReady && !isPremium ? (
          <Text style={[styles.freeInfoText, { color: colors.textMuted }]}>
            {deepUi.freeEntriesInfo(
              FREE_MAX_MANUAL_ENTRIES,
              remainingManualEntries
            )}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.addButton,
            {
              backgroundColor: canCreateManualEntry
                ? colors.accentButtonBackground
                : colors.surfaceAlt,
              borderColor: canCreateManualEntry
                ? colors.accentButtonBorder
                : colors.border,
              opacity: canCreateManualEntry ? 1 : 0.75,
            },
            canCreateManualEntry &&
              colors.isWhiteAccentButton &&
              styles.whiteAccentButton,
          ]}
          onPress={openEntryModal}
        >
          <Text
            style={[
              styles.addButtonText,
              {
                color: canCreateManualEntry
                  ? colors.accentButtonText
                  : colors.textSecondary,
              },
            ]}
          >
              {canCreateManualEntry ? deepUi.addEntry : deepUi.freeLimitReached}
            </Text>
          </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {deepUi.monthlySummaryTitle}
        </Text>

        {monthlyChartData.length === 0 ? (
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
              {deepUi.emptyMonthlyDataTitle}
            </Text>

            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {deepUi.emptyMonthlyDataText}
            </Text>
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
            <View style={styles.chartLegend}>
              <View style={styles.chartLegendItem}>
                <View
                  style={[
                    styles.chartLegendDot,
                    { backgroundColor: colors.success },
                  ]}
                />
                <Text style={[styles.chartLegendText, { color: colors.textMuted }]}>
                  {deepUi.chartIncome}
                </Text>
              </View>

              <View style={styles.chartLegendItem}>
                <View
                  style={[
                    styles.chartLegendDot,
                    { backgroundColor: colors.danger },
                  ]}
                />
                <Text style={[styles.chartLegendText, { color: colors.textMuted }]}>
                  {deepUi.chartExpense}
                </Text>
              </View>
            </View>

            {monthlyChartData.map((item) => (
              <View key={item.monthKey} style={styles.chartRow}>
                <Text
                  style={[styles.chartMonthLabel, { color: colors.textMuted }]}
                >
                  {item.label}
                </Text>

                <View style={styles.chartBarBlock}>
                  <View style={styles.chartBarLine}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          width: `${item.entradaPercent}%`,
                          backgroundColor: colors.success,
                        },
                      ]}
                    />
                    <Text style={[styles.chartBarValue, { color: colors.text }]}>
                      {showBalance ? formatCurrency(item.entradas) : "R$ •••••"}
                    </Text>
                  </View>

                  <View style={styles.chartBarLine}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          width: `${item.saidaPercent}%`,
                          backgroundColor: colors.danger,
                        },
                      ]}
                    />
                    <Text style={[styles.chartBarValue, { color: colors.text }]}>
                      {showBalance ? formatCurrency(item.saidas) : "R$ •••••"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {deepUi.recentTransactionsTitle}
        </Text>

        {filteredEntries.length === 0 ? (
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
              {deepUi.emptyRecentTransactionsTitle}
            </Text>

            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {deepUi.emptyRecentTransactionsText}
            </Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {filteredEntries.slice(0, 5).map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.recentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.recentIconWrap,
                    {
                      backgroundColor:
                        entry.type === "entrada"
                          ? colors.successSoft
                          : colors.accentSoft,
                      borderColor:
                        entry.type === "entrada"
                          ? colors.success
                          : colors.accentBorder,
                    },
                  ]}
                >
                  <Text style={styles.recentIcon}>{getCategoryEmoji(entry.category)}</Text>
                </View>

                <View style={styles.recentMain}>
                  <Text style={[styles.recentTitle, { color: colors.text }]}>
                    {entry.title}
                  </Text>

                  <Text style={[styles.recentMeta, { color: colors.textSecondary }]}>
                    {getMoneyCategoryLabel(entry.category, language)} •{" "}
                    {formatDateTime(entry.createdAt)}
                  </Text>

                  {entry.source === "open_finance" ? (
                    <View style={styles.importedMetaRow}>
                      <View
                        style={[
                          styles.importedBadge,
                          {
                            backgroundColor: colors.accentSoft,
                            borderColor: colors.accentBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.importedBadgeText,
                            { color: colors.accent },
                          ]}
                        >
                          {deepUi.importedSource}
                        </Text>
                      </View>

                      {entry.institutionName ? (
                        <Text
                          style={[
                            styles.importedInstitutionText,
                            { color: colors.textMuted },
                          ]}
                        >
                          {entry.institutionName}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.recentAmount,
                    {
                      color:
                        entry.type === "entrada" ? colors.success : colors.danger,
                    },
                  ]}
                >
                  {entry.type === "entrada" ? "+" : "-"}{" "}
                  {showBalance ? formatCurrency(entry.amount) : "R$ •••••"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {deepUi.categoriesTitle}
        </Text>

        {planReady && !isPremium ? (
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
              {deepUi.categoriesPremiumTitle}
            </Text>

            <Text style={[styles.lockedSectionText, { color: colors.textSecondary }]}>
              {deepUi.categoriesPremiumText}
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
              onPress={goToUpgrade}
            >
              <Text
                style={[
                  styles.upgradeButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {deepUi.unlock}
              </Text>
            </Pressable>
          </View>
        ) : categorySummary.length === 0 ? (
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
              {deepUi.emptyCategoriesTitle}
            </Text>

            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {deepUi.emptyCategoriesText}
            </Text>
          </View>
        ) : (
          <View style={styles.categoryGrid}>
            {categorySummary.map((item) => {
              const isSelected = selectedCategory === item.category;

              return (
                <Pressable
                  key={item.category}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    isSelected && {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                  onPress={() =>
                    setSelectedCategory((prev) =>
                      prev === item.category ? null : item.category
                    )
                  }
                >
                  <Text style={styles.categoryEmoji}>
                    {getCategoryEmoji(item.category)}
                  </Text>

                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    {getMoneyCategoryLabel(item.category, language)}
                  </Text>

                  <Text style={[styles.categoryIncome, { color: colors.success }]}>
                    + {showBalance ? formatCurrency(item.entradas) : "R$ •••••"}
                  </Text>

                  <Text style={[styles.categoryExpense, { color: colors.danger }]}>
                    - {showBalance ? formatCurrency(item.saidas) : "R$ •••••"}
                  </Text>

                  <Text
                    style={[
                      styles.categorySaldo,
                      { color: item.saldo >= 0 ? colors.success : colors.danger },
                    ]}
                  >
                    {deepUi.balanceLabel(
                      showBalance ? formatCurrency(item.saldo) : "R$ •••••"
                    )}
                  </Text>

                  <Text
                    style={[styles.categoryTapHint, { color: colors.textSecondary }]}
                  >
                    {isSelected ? deepUi.tapToHide : deepUi.tapToViewEntries}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {deepUi.distributionTitle}
        </Text>

        {planReady && !isPremium ? (
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
              {deepUi.distributionPremiumTitle}
            </Text>

            <Text style={[styles.lockedSectionText, { color: colors.textSecondary }]}>
              {deepUi.distributionPremiumText}
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
              onPress={goToUpgrade}
            >
              <Text
                style={[
                  styles.upgradeButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {deepUi.distributionPremiumButton}
              </Text>
            </Pressable>
          </View>
        ) : categorySummary.length === 0 ? (
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
              {deepUi.emptyDistributionTitle}
            </Text>

            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {deepUi.emptyDistributionText}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.distributionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {categorySummary
              .filter((item) => item.saidas > 0 || item.entradas > 0)
              .sort(
                (a, b) =>
                  Math.max(b.entradas, b.saidas) - Math.max(a.entradas, a.saidas)
              )
              .slice(0, 5)
              .map((item) => {
                const baseValue = Math.max(
                  ...categorySummary.map((cat) =>
                    Math.max(cat.entradas, cat.saidas)
                  ),
                  1
                );

                const widthPercent = Math.max(
                  12,
                  Math.round((Math.max(item.entradas, item.saidas) / baseValue) * 100)
                );

                return (
                  <View key={item.category} style={styles.distributionRow}>
                    <View style={styles.distributionTop}>
                      <Text style={[styles.distributionLabel, { color: colors.text }]}>
                        {getCategoryEmoji(item.category)}{" "}
                        {getMoneyCategoryLabel(item.category, language)}
                      </Text>

                      <Text
                        style={[
                          styles.distributionValue,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {showBalance
                          ? formatCurrency(Math.max(item.entradas, item.saidas))
                          : "R$ •••••"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.distributionTrack,
                        { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      <View
                        style={[
                          styles.distributionFill,
                          {
                            width: `${widthPercent}%`,
                            backgroundColor: colors.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {isPremium && selectedCategory ? (
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                {getCategoryEmoji(selectedCategory)}{" "}
                {getMoneyCategoryLabel(selectedCategory, language)}
              </Text>

              <Text style={[styles.detailSubtitle, { color: colors.textSecondary }]}>
                {deepUi.entryCount(selectedCategoryEntries.length)}
              </Text>
            </View>

            {selectedCategoryEntries.length === 0 ? (
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
                  {deepUi.emptyDetailTitle}
                </Text>

                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {deepUi.emptyDetailText}
                </Text>
              </View>
            ) : (
              <View style={styles.entryList}>
                {selectedCategoryEntries.map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.entryCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.entryMain}>
                      <Text style={[styles.entryTitle, { color: colors.text }]}>
                        {entry.title}
                      </Text>

                      <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                        {formatDateTime(entry.createdAt)}
                      </Text>

                      {entry.source === "open_finance" ? (
                        <View style={styles.importedMetaRow}>
                          <View
                            style={[
                              styles.importedBadge,
                              {
                                backgroundColor: colors.accentSoft,
                                borderColor: colors.accentBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.importedBadgeText,
                                { color: colors.accent },
                              ]}
                            >
                              {deepUi.importedSource}
                            </Text>
                          </View>

                          {entry.institutionName ? (
                            <Text
                              style={[
                                styles.importedInstitutionText,
                                { color: colors.textMuted },
                              ]}
                            >
                              {entry.institutionName}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.entryRight}>
                      <Text
                        style={[
                          styles.entryAmount,
                          {
                            color:
                              entry.type === "entrada"
                                ? colors.success
                                : colors.danger,
                          },
                        ]}
                      >
                        {entry.type === "entrada" ? "+" : "-"}{" "}
                        {showBalance ? formatCurrency(entry.amount) : "R$ •••••"}
                      </Text>

                      <Pressable onPress={() => removerMovimentacao(entry)}>
                        <Text
                          style={[
                            styles.removeText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {ui.remove}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <View
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: colors.overlay,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: 18 + Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {deepUi.newEntryTitle}
            </Text>

            {planReady && !isPremium ? (
              <View
                style={[
                  styles.modalInfoCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.modalInfoTitle, { color: colors.text }]}>
                  {deepUi.freeLimitRealtimeTitle}
                </Text>
                <Text
                  style={[styles.modalInfoText, { color: colors.textSecondary }]}
                >
                  {deepUi.manualUsageText(
                    manualEntriesCount,
                    FREE_MAX_MANUAL_ENTRIES
                  )}
                </Text>
              </View>
            ) : null}

            {duplicateManualEntry ? (
              <View
                style={[
                  styles.modalWarningCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.warning,
                  },
                ]}
              >
                <Text style={[styles.modalWarningTitle, { color: colors.warning }]}>
                  {deepUi.duplicateWarningTitle}
                </Text>
                <Text
                  style={[styles.modalWarningText, { color: colors.textSecondary }]}
                >
                  {deepUi.duplicateWarningText}
                </Text>
              </View>
            ) : null}

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={deepUi.descriptionPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={deepUi.amountPlaceholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <View style={styles.typeRow}>
              <Pressable
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                  type === "entrada" && {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accentBorder,
                  },
                ]}
                onPress={() => setType("entrada")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: colors.textMuted },
                    type === "entrada" && { color: colors.accent },
                  ]}
                >
                  {deepUi.entryTypeIncome}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                  type === "saida" && {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accentBorder,
                  },
                ]}
                onPress={() => setType("saida")}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: colors.textMuted },
                    type === "saida" && { color: colors.accent },
                  ]}
                >
                  {deepUi.entryTypeExpense}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.categoryPickerLabel, { color: colors.text }]}>
              {deepUi.categoryTitle}
            </Text>

            <View style={styles.categoryPickerGrid}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;

                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryPickerItem,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                      active && {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accentBorder,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={styles.categoryPickerEmoji}>
                      {getCategoryEmoji(cat)}
                    </Text>

                    <Text
                      style={[
                        styles.categoryPickerText,
                        { color: colors.textMuted },
                        active && { color: colors.accent },
                      ]}
                    >
                      {getMoneyCategoryLabel(cat, language)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {planReady && !isPremium ? (
              <Pressable
                style={[styles.modalCtaButton, { backgroundColor: colors.surfaceAlt }]}
                onPress={goToUpgrade}
              >
                <Text style={[styles.modalCtaButtonText, { color: colors.accent }]}>
                  {deepUi.modalUpgradeText}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.modalSaveButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={adicionarMovimentacao}
            >
              <Text
                style={[
                  styles.modalSaveButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {deepUi.saveEntry}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalCancelButton,
                { backgroundColor: colors.surfaceAlt },
              ]}
              onPress={() => setModalOpen(false)}
            >
              <Text
                style={[
                  styles.modalCancelButtonText,
                  { color: colors.textMuted },
                ]}
              >
                {ui.cancel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={fixedBillModalOpen} transparent animationType="slide">
        <View
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: colors.overlay,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: 18 + Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingBill
                ? deepUi.editFixedBillTitle
                : deepUi.newFixedBillTitle}
            </Text>

            {planReady && !isPremium && !editingBill ? (
              <View
                style={[
                  styles.modalInfoCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.modalInfoTitle, { color: colors.text }]}>
                  {deepUi.freeLimitRealtimeTitle}
                </Text>
                <Text
                  style={[styles.modalInfoText, { color: colors.textSecondary }]}
                >
                  {deepUi.fixedBillsUsageText(
                    fixedBills.length,
                    FREE_MAX_FIXED_BILLS
                  )}
                </Text>
              </View>
            ) : null}

            <TextInput
              value={billTitle}
              onChangeText={setBillTitle}
              placeholder={deepUi.billNamePlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={billAmount}
              onChangeText={setBillAmount}
              placeholder={deepUi.amountPlaceholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={billDueDay}
              onChangeText={setBillDueDay}
              placeholder={deepUi.dueDayPlaceholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.categoryPickerLabel, { color: colors.text }]}>
              {deepUi.categoryTitle}
            </Text>

            <View style={styles.categoryPickerGrid}>
              {FIXED_BILL_CATEGORIES.map((cat) => {
                const active = billCategory === cat;

                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryPickerItem,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                      active && {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accentBorder,
                      },
                    ]}
                    onPress={() => setBillCategory(cat)}
                  >
                    <Text style={styles.categoryPickerEmoji}>
                      {getCategoryEmoji(cat)}
                    </Text>

                    <Text
                      style={[
                        styles.categoryPickerText,
                        { color: colors.textMuted },
                        active && { color: colors.accent },
                      ]}
                    >
                      {getMoneyCategoryLabel(cat, language)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.connectBankButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {
                if (!isPremium) {
                  showPremiumAlert(ui.openFinancePremiumFeature);
                  return;
                }
                router.push("/dinheiro-conexoes");
              }}
            >
              <Text style={[styles.connectBankButtonText, { color: colors.text }]}>
                {isPremium ? ui.connectBank : copy.planPremium}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalSaveButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={adicionarContaFixa}
            >
              <Text
                style={[
                  styles.modalSaveButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {editingBill ? deepUi.saveChanges : deepUi.saveBill}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalCancelButton,
                { backgroundColor: colors.surfaceAlt },
              ]}
              onPress={() => {
                setFixedBillModalOpen(false);
                setEditingBill(null);
                setBillTitle("");
                setBillAmount("");
                setBillDueDay("");
                setBillCategory("Moradia");
              }}
            >
              <Text
                style={[
                  styles.modalCancelButtonText,
                  { color: colors.textMuted },
                ]}
              >
                {ui.cancel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showModuleTour && activeMoneyTourStep ? (
        <GuidedTourOverlay
          visible={showModuleTour}
          icon={activeMoneyTourStep.icon}
          title={activeMoneyTourStep.title}
          description={activeMoneyTourStep.description}
          stepLabel={copy.tourStep
            .replace("{{current}}", String(moduleTourStepIndex + 1))
            .replace("{{total}}", String(moneyTourSteps.length))}
          accentColor={colors.accent}
          surfaceColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          textSecondaryColor={colors.textSecondary}
          primaryLabel={activeMoneyTourStep.primaryLabel}
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
    paddingHorizontal: 16,
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
  planBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
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
  limitGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  limitCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  limitCardLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  limitCardValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  limitCardHint: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
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
  heroCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  heroTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 14,
  },
  heroFill: {
    height: "100%",
    borderRadius: 999,
  },
  insightsWrap: {
    marginTop: 12,
    gap: 6,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  ctaStrip: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  ctaStripTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  ctaStripText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  ctaStripButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  ctaStripButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  moduleBridgeCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  moduleBridgeTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  moduleBridgeText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  moduleBridgePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  moduleBridgePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  moduleBridgePillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  openFinanceCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  openFinanceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  openFinanceLeft: {
    flex: 1,
  },
  openFinanceTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  openFinanceSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  openFinanceBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openFinanceBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  openFinanceButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
  },
  openFinanceButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },
  openFinanceDataSection: {
    marginTop: 16,
    gap: 10,
  },
  openFinanceLoadingText: {
    fontSize: 13,
    fontWeight: "700",
  },
  openFinanceLockedCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  openFinanceLockedTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  openFinanceLockedText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  openFinanceMiniGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  openFinanceMiniCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  openFinanceMiniLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  openFinanceMiniValue: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 6,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 2,
  },
  openFinanceList: {
    gap: 8,
  },
  openFinanceDataCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  openFinanceDataTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  openFinanceDataText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  openFinanceDataMeta: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  balanceHeroCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  balanceHeroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  balanceHeroLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  balanceHeroValue: {
    fontSize: 32,
    fontWeight: "900",
    marginTop: 12,
  },
  balanceVisibilityButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  balanceVisibilityButtonText: {
    fontSize: 11,
    fontWeight: "800",
  },
  balanceMiniRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  balanceMiniCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  balanceMiniLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  balanceMiniValue: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 8,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  freeInfoText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: -2,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  goalCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  goalTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },
  goalFill: {
    height: "100%",
    borderRadius: 999,
  },
  goalProgressText: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 12,
  },
  goalInputRow: {
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
  goalButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  goalButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 12,
  },
  fixedSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  fixedSummaryCard: {
    width: "48.5%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  fixedSummaryValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  fixedSummaryLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  alertsCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertsTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  alertsText: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  topActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  addButtonHalf: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryTopButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryTopButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  fixedBillsList: {
    gap: 10,
    marginBottom: 18,
  },
  fixedBillCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  fixedBillTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  fixedBillLeft: {
    flex: 1,
  },
  fixedBillTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  fixedBillMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  fixedBillRight: {
    alignItems: "flex-end",
    maxWidth: 120,
  },
  fixedBillAmount: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  fixedBillStatus: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "right",
  },
  fixedBillActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  fixedBillToggleButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  fixedBillToggleButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  editText: {
    fontSize: 12,
    fontWeight: "700",
  },
  addButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
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
  chartCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartLegend: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 14,
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  chartLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  chartLegendText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chartRow: {
    marginBottom: 18,
  },
  chartMonthLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    textTransform: "capitalize",
  },
  chartBarBlock: {
    gap: 10,
  },
  chartBarLine: {
    gap: 6,
  },
  chartBar: {
    height: 16,
    borderRadius: 999,
    minWidth: 0,
  },
  chartBarValue: {
    fontSize: 12,
    fontWeight: "800",
    alignSelf: "flex-end",
  },
  recentList: {
    gap: 10,
    marginBottom: 18,
  },
  recentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recentIcon: {
    fontSize: 22,
  },
  recentMain: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  recentMeta: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  importedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  importedBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  importedBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  importedInstitutionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  recentAmount: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
    maxWidth: 110,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  categoryCard: {
    width: "48.5%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  categoryIncome: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryExpense: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  categorySaldo: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },
  categoryTapHint: {
    fontSize: 11,
    marginTop: 10,
    fontWeight: "700",
  },
  distributionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    gap: 14,
  },
  distributionRow: {
    gap: 8,
  },
  distributionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  distributionLabel: {
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  distributionValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  distributionTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  distributionFill: {
    height: "100%",
    borderRadius: 999,
  },
  detailSection: {
    marginTop: 18,
  },
  detailHeader: {
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  detailSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  entryList: {
    gap: 10,
  },
  entryCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  entryMain: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  entryDate: {
    fontSize: 12,
    marginTop: 4,
  },
  entryRight: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 12,
    maxWidth: 120,
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  removeText: {
    fontSize: 12,
    fontWeight: "700",
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
  modalInfoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  modalInfoTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalInfoText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  modalWarningCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  modalWarningTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  modalWarningText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  typeButtonText: {
    fontWeight: "800",
  },
  categoryPickerLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },
  categoryPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
  },
  categoryPickerItem: {
    width: "48.5%",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryPickerEmoji: {
    fontSize: 18,
  },
  categoryPickerText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  connectBankButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 10,
  },
  connectBankButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  modalCtaButton: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalCtaButtonText: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  modalSaveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
  },
  modalSaveButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
  modalCancelButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelButtonText: {
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
