import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import JourneyInsightCard from "../components/JourneyInsightCard";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "./utils/appTheme";
import {
  AIJourneyProgress,
  LifeJourneyPlan,
  normalizeJourneyProgress,
} from "./utils/lifeJourney";
import {
  buildModuleJourneyStatusCard,
  loadJourneyState,
} from "./utils/journeyModuleStatus";
import { useAppLanguage } from "./utils/languageContext";
import { formatDateByLanguage } from "./utils/locale";

type SubscriptionPlan = "free" | "premium";

type GoalCategory =
  | "Financeira"
  | "Saúde"
  | "Trabalho"
  | "Estudos"
  | "Espiritual"
  | "Pessoal"
  | "Família"
  | "Outros";

type GoalItem = {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetDate: string;
  progress: number;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

const GOALS_KEY = "@vida_em_ordem_goals_v1";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

const FREE_MAX_ACTIVE_GOALS = 5;
const FREE_SUGGESTIONS_LIMIT = 4;

const GOAL_CATEGORIES: GoalCategory[] = [
  "Financeira",
  "Saúde",
  "Trabalho",
  "Estudos",
  "Espiritual",
  "Pessoal",
  "Família",
  "Outros",
];

const GOAL_SUGGESTIONS: {
  title: string;
  category: GoalCategory;
}[] = [
  { title: "Montar minha reserva de emergência", category: "Financeira" },
  { title: "Perder peso com constância", category: "Saúde" },
  { title: "Fazer atividade física 3 vezes por semana", category: "Saúde" },
  { title: "Conseguir uma promoção no trabalho", category: "Trabalho" },
  { title: "Estudar 30 minutos por dia", category: "Estudos" },
  { title: "Ler 1 livro por mês", category: "Estudos" },
  { title: "Ter um momento diário com Deus", category: "Espiritual" },
  { title: "Organizar melhor minha rotina", category: "Pessoal" },
  { title: "Passar mais tempo com minha família", category: "Família" },
  { title: "Quitar uma dívida importante", category: "Financeira" },
];

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getCategoryEmoji(category: GoalCategory) {
  switch (category) {
    case "Financeira":
      return "💰";
    case "Saúde":
      return "💪";
    case "Trabalho":
      return "💼";
    case "Estudos":
      return "📚";
    case "Espiritual":
      return "✝️";
    case "Pessoal":
      return "✨";
    case "Família":
      return "👨‍👩‍👧‍👦";
    case "Outros":
    default:
      return "🎯";
  }
}

function getDaysRemaining(value: string) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );

  const diffMs = startTarget.getTime() - startNow.getTime();
  return Math.ceil(diffMs / 86400000);
}

export default function MetasScreen() {
  const { language } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [journeyPlan, setJourneyPlan] = useState<LifeJourneyPlan | null>(null);
  const [journeyProgress, setJourneyProgress] = useState<AIJourneyProgress>(() =>
    normalizeJourneyProgress(null)
  );
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GoalCategory>("Pessoal");
  const [targetDate, setTargetDate] = useState("");

  const isPremium = plan === "premium";

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const showPremiumAlert = useCallback(
    (feature: string) => {
      Alert.alert(
        "Recurso Premium ✨",
        `${feature} está disponível no plano Premium.`,
        [
          { text: "Agora não", style: "cancel" },
          { text: "Ver Premium", onPress: goToPremium },
        ]
      );
    },
    [goToPremium]
  );

  const loadGoals = useCallback(async () => {
    try {
      const [rawGoals, rawSettings, planRaw] = await Promise.all([
        AsyncStorage.getItem(GOALS_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
      ]);
      const journeyState = await loadJourneyState(language);

      const parsedGoals = rawGoals ? JSON.parse(rawGoals) : [];
      const parsedSettings = rawSettings
        ? JSON.parse(rawSettings)
        : DEFAULT_SETTINGS;

      const effectivePlan: SubscriptionPlan =
        planRaw === "premium" || parsedSettings?.plan === "premium"
          ? "premium"
          : "free";

      setGoals(Array.isArray(parsedGoals) ? parsedGoals : []);
      setPlan(effectivePlan);
      setJourneyPlan(journeyState.plan);
      setJourneyProgress(journeyState.progress);
      setSettings({
        theme:
          parsedSettings?.theme === "light" ||
          parsedSettings?.theme === "system"
            ? parsedSettings.theme
            : "dark",
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
        regionPreference:
          parsedSettings?.regionPreference || DEFAULT_SETTINGS.regionPreference,
        currencyPreference:
          parsedSettings?.currencyPreference ||
          DEFAULT_SETTINGS.currencyPreference,
      });
    } catch (error) {
      console.log("Erro ao carregar metas:", error);
      setJourneyPlan(null);
      setJourneyProgress(normalizeJourneyProgress(null));
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const saveGoals = useCallback(async (next: GoalItem[]) => {
    try {
      setGoals(next);
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Erro ao salvar metas:", error);
      Alert.alert("Erro", "Não foi possível salvar as metas.");
    }
  }, []);

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings.theme, settings.accentColor]
  );
  const moduleJourneyStatusCard = useMemo(
    () =>
      buildModuleJourneyStatusCard(
        "metas",
        journeyPlan,
        journeyProgress,
        language,
        countdownNow
      ),
    [journeyPlan, journeyProgress, language, countdownNow]
  );
  const noDeadlineLabel = useMemo(
    () =>
      ({
        pt: "Sem prazo",
        en: "No deadline",
        es: "Sin plazo",
        fr: "Sans echeance",
        it: "Senza scadenza",
      })[language],
    [language]
  );
  const formatDate = useCallback(
    (value: string) =>
      formatDateByLanguage(value, language, undefined, noDeadlineLabel),
    [language, noDeadlineLabel]
  );

  useEffect(() => {
    if (!journeyProgress.nextDayUnlockAt) return;

    setCountdownNow(Date.now());
    const interval = setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [journeyProgress.nextDayUnlockAt]);

  const surfaceMuted =
    (colors as any).surfaceMuted || colors.surfaceAlt || colors.surface;

  const activeGoals = useMemo(
    () =>
      goals
        .filter((goal) => !goal.completed)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [goals]
  );

  const completedGoals = useMemo(
    () =>
      goals
        .filter((goal) => goal.completed)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [goals]
  );

  const completionRate = useMemo(() => {
    if (goals.length === 0) return 0;
    return Math.round((completedGoals.length / goals.length) * 100);
  }, [goals.length, completedGoals.length]);

  const availableSuggestions = useMemo(() => {
    return isPremium
      ? GOAL_SUGGESTIONS
      : GOAL_SUGGESTIONS.slice(0, FREE_SUGGESTIONS_LIMIT);
  }, [isPremium]);

  const addGoal = useCallback(async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) {
      Alert.alert("Atenção", "Digite o título da meta.");
      return;
    }

    if (!isPremium && activeGoals.length >= FREE_MAX_ACTIVE_GOALS) {
      showPremiumAlert(`Mais de ${FREE_MAX_ACTIVE_GOALS} metas ativas`);
      return;
    }

    const newGoal: GoalItem = {
      id: uid(),
      title: cleanTitle,
      description: cleanDescription,
      category,
      targetDate,
      progress: 0,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const next = [newGoal, ...goals];
    await saveGoals(next);

    setTitle("");
    setDescription("");
    setCategory("Pessoal");
    setTargetDate("");
    setModalOpen(false);
  }, [
    title,
    description,
    category,
    targetDate,
    goals,
    saveGoals,
    isPremium,
    activeGoals.length,
    showPremiumAlert,
  ]);

  const openNewGoalModal = useCallback(() => {
    if (!isPremium && activeGoals.length >= FREE_MAX_ACTIVE_GOALS) {
      showPremiumAlert(`Mais de ${FREE_MAX_ACTIVE_GOALS} metas ativas`);
      return;
    }

    setTitle("");
    setDescription("");
    setCategory("Pessoal");
    setTargetDate("");
    setModalOpen(true);
  }, [activeGoals.length, isPremium, showPremiumAlert]);

  const increaseProgress = useCallback(
    async (goalId: string, amount: number) => {
      const next = goals.map((goal) => {
        if (goal.id !== goalId || goal.completed) return goal;

        const newProgress = Math.min(100, goal.progress + amount);
        const completed = newProgress >= 100;

        return {
          ...goal,
          progress: newProgress,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      });

      await saveGoals(next);
    },
    [goals, saveGoals]
  );

  const markAsCompleted = useCallback(
    async (goalId: string) => {
      const next = goals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              progress: 100,
              completed: true,
              completedAt: new Date().toISOString(),
            }
          : goal
      );

      await saveGoals(next);
    },
    [goals, saveGoals]
  );

  const removeGoal = useCallback(
    async (goalId: string) => {
      Alert.alert("Remover meta", "Deseja remover esta meta?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const next = goals.filter((goal) => goal.id !== goalId);
            await saveGoals(next);
          },
        },
      ]);
    },
    [goals, saveGoals]
  );

  const usarSugestao = useCallback(
    (item: { title: string; category: GoalCategory }) => {
      setTitle(item.title);
      setCategory(item.category);
    },
    []
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
          title="Metas"
          subtitle="Transforme objetivos em progresso real, etapa por etapa."
          icon="flag-outline"
          badgeLabel={isPremium ? "Premium" : "Free"}
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={goToPremium}
        />

        {moduleJourneyStatusCard ? (
          <JourneyInsightCard
            eyebrow={moduleJourneyStatusCard.eyebrow}
            title={moduleJourneyStatusCard.title}
            text={moduleJourneyStatusCard.text}
            iconName={moduleJourneyStatusCard.iconName}
            accentColor={colors.accent}
            accentSoft={colors.accentSoft}
            accentBorder={colors.accentBorder}
            surfaceColor={colors.surface}
            borderColor={colors.border}
            textColor={colors.text}
            textSecondaryColor={colors.textSecondary}
            buttonBackground={colors.accentButtonBackground}
            buttonBorder={colors.accentButtonBorder}
            buttonTextColor={colors.accentButtonText}
            isWhiteAccentButton={colors.isWhiteAccentButton}
            timerLabel={moduleJourneyStatusCard.timerLabel}
            timerValue={moduleJourneyStatusCard.timerValue}
            actionLabel={moduleJourneyStatusCard.actionLabel}
            onAction={
              moduleJourneyStatusCard.actionRoute
                ? () => router.push(moduleJourneyStatusCard.actionRoute as never)
                : undefined
            }
          />
        ) : null}

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
              {goals.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Total
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
              {activeGoals.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Ativas
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
              {completedGoals.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Concluídas
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
              {completionRate}%
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Sucesso
            </Text>
          </View>
        </View>

        {!isPremium ? (
          <Text style={[styles.freeInfoText, { color: colors.textMuted }]}>
            Free: até {FREE_MAX_ACTIVE_GOALS} metas ativas.
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.addButton,
            {
              backgroundColor: colors.accentButtonBackground,
              borderColor: colors.accentButtonBorder,
            },
            colors.isWhiteAccentButton && styles.whiteAccentButton,
          ]}
          onPress={openNewGoalModal}
        >
          <Text
            style={[styles.addButtonText, { color: colors.accentButtonText }]}
          >
            Adicionar meta
          </Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Metas ativas
        </Text>

        {activeGoals.length === 0 ? (
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
              Nenhuma meta ativa
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Comece criando uma meta clara e acompanhando seu progresso.
            </Text>
          </View>
        ) : (
          <View style={styles.goalList}>
            {activeGoals.map((goal) => {
              const daysRemaining = getDaysRemaining(goal.targetDate);

              return (
                <View
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.goalTop}>
                    <View
                      style={[
                        styles.goalCategoryBadge,
                        {
                          backgroundColor: colors.accentSoft,
                          borderColor: colors.accentBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.goalCategoryBadgeText,
                          { color: colors.accent },
                        ]}
                      >
                        {getCategoryEmoji(goal.category)} {goal.category}
                      </Text>
                    </View>

                    <Text
                      style={[styles.goalDateText, { color: colors.textMuted }]}
                    >
                      {daysRemaining === null
                        ? "Sem prazo"
                        : daysRemaining < 0
                        ? `${Math.abs(daysRemaining)} dia(s) atrasado(s)`
                        : daysRemaining === 0
                        ? "Vence hoje"
                        : `${daysRemaining} dia(s) restantes`}
                    </Text>
                  </View>

                  <Text style={[styles.goalTitle, { color: colors.text }]}>
                    {goal.title}
                  </Text>

                  {goal.description ? (
                    <Text
                      style={[
                        styles.goalDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {goal.description}
                    </Text>
                  ) : null}

                  <Text style={[styles.goalMeta, { color: colors.textMuted }]}>
                    Prazo: {formatDate(goal.targetDate)}
                  </Text>

                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: surfaceMuted },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${goal.progress}%`,
                          backgroundColor: colors.success,
                        },
                      ]}
                    />
                  </View>

                  <Text style={[styles.progressText, { color: colors.success }]}>
                    {goal.progress}% concluído
                  </Text>

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[
                        styles.progressButton,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => increaseProgress(goal.id, 10)}
                    >
                      <Text
                        style={[
                          styles.progressButtonText,
                          { color: colors.text },
                        ]}
                      >
                        +10%
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.progressButton,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => increaseProgress(goal.id, 25)}
                    >
                      <Text
                        style={[
                          styles.progressButtonText,
                          { color: colors.text },
                        ]}
                      >
                        +25%
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.completeButton,
                        {
                          backgroundColor: colors.accentSoft,
                          borderColor: colors.accentBorder,
                        },
                      ]}
                      onPress={() => markAsCompleted(goal.id)}
                    >
                      <Text
                        style={[
                          styles.completeButtonText,
                          { color: colors.accent },
                        ]}
                      >
                        Concluir
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable onPress={() => removeGoal(goal.id)}>
                    <Text
                      style={[styles.removeText, { color: colors.textMuted }]}
                    >
                      Remover meta
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Metas concluídas
        </Text>

        {completedGoals.length === 0 ? (
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
              Nenhuma meta concluída ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Quando você concluir metas, elas aparecerão aqui como vitórias da
              sua evolução.
            </Text>
          </View>
        ) : (
          <View style={styles.goalList}>
            {completedGoals.map((goal) => (
              <View
                key={goal.id}
                style={[
                  styles.goalCardCompleted,
                  {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.goalCompletedTitle, { color: colors.text }]}
                >
                  {getCategoryEmoji(goal.category)} {goal.title}
                </Text>
                <Text
                  style={[
                    styles.goalCompletedMeta,
                    { color: colors.accent },
                  ]}
                >
                  Concluída em {formatDate(goal.completedAt ?? goal.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.modalBackdrop,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <ScrollView
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              contentContainerStyle={[
                styles.modalCardContent,
                {
                  paddingBottom: 18 + Math.max(insets.bottom, 12),
                },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nova meta
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Título da meta"
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
              value={description}
              onChangeText={setDescription}
              placeholder="Descrição"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                styles.multilineInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              multiline
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>
              Categoria
            </Text>
            <View style={styles.categoryGrid}>
              {GOAL_CATEGORIES.map((item) => {
                const active = category === item;

                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.categoryItem,
                      {
                        backgroundColor: active
                          ? colors.accentSoft
                          : colors.surfaceAlt,
                        borderColor: active
                          ? colors.accentBorder
                          : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryItemText,
                        {
                          color: active ? colors.accent : colors.textSecondary,
                        },
                      ]}
                    >
                      {getCategoryEmoji(item)} {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalLabelRow}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Sugestões de metas
              </Text>
              {!isPremium ? (
                <Text style={[styles.modalHintText, { color: colors.textMuted }]}>
                  Free: {FREE_SUGGESTIONS_LIMIT} sugestões
                </Text>
              ) : null}
            </View>

            <View style={styles.suggestionWrap}>
              {availableSuggestions.map((item, index) => (
                <Pressable
                  key={`${item.title}_${index}`}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                  onPress={() => usarSugestao(item)}
                >
                  <Text
                    style={[styles.suggestionChipText, { color: colors.accent }]}
                  >
                    {getCategoryEmoji(item.category)} {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!isPremium ? (
              <Pressable
                style={[
                  styles.inlinePremiumCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
                onPress={goToPremium}
              >
                <Text style={[styles.inlinePremiumTitle, { color: colors.text }]}>
                  🔒 Mais sugestões no Premium
                </Text>
                <Text
                  style={[
                    styles.inlinePremiumText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Desbloqueie todas as sugestões inteligentes para criar metas mais rápido.
                </Text>
              </Pressable>
            ) : null}

            <TextInput
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="Prazo (AAAA-MM-DD)"
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

            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={addGoal}
            >
              <Text
                style={[styles.saveButtonText, { color: colors.accentButtonText }]}
              >
                Salvar meta
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.surfaceAlt,
                },
              ]}
              onPress={() => setModalOpen(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  freeInfoText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: -2,
    marginBottom: 10,
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

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
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

  goalList: {
    gap: 12,
    marginBottom: 16,
  },

  goalCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },

  goalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },

  goalCategoryBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },

  goalCategoryBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  goalDateText: {
    fontSize: 11,
    fontWeight: "700",
  },

  goalTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  goalDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  goalMeta: {
    fontSize: 12,
    marginTop: 8,
  },

  progressTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  progressText: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },

  progressButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },

  progressButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },

  completeButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },

  completeButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },

  removeText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },

  goalCardCompleted: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  goalCompletedTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  goalCompletedMeta: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "700",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },

  modalKeyboardWrap: {
    flex: 1,
  },

  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    maxHeight: "92%",
    overflow: "hidden",
  },

  modalCardContent: {
    padding: 16,
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

  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },

  modalLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  modalHintText: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },

  categoryItem: {
    width: "48.5%",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
  },

  categoryItemText: {
    fontSize: 12,
    fontWeight: "700",
  },

  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  suggestionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  suggestionChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  inlinePremiumCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  inlinePremiumTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  inlinePremiumText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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
