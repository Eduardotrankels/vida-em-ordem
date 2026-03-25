import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
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
import { hasTourRectChanged } from "./utils/tourLayout";

type SubscriptionPlan = "free" | "premium";

type TaskItem = {
  id: string;
  text: string;
  done: boolean;
};

type TimeDayData = {
  dateKey: string;
  focus: string;
  tasks: TaskItem[];
};

const STORAGE_KEY = "@vida_em_ordem_tempo_v1";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

const FREE_FOCUS_SUGGESTIONS = 3;
const FREE_TASK_SUGGESTIONS = 4;
const FREE_HISTORY_DAYS = 3;

const FOCUS_SUGGESTIONS = [
  "Concluir a tarefa mais importante do dia",
  "Organizar meu dia com clareza e prioridade",
  "Finalizar uma pendência que venho adiando",
  "Manter o foco sem distrações por pelo menos 1 hora",
  "Cuidar da minha rotina e evitar procrastinação",
  "Avançar no meu objetivo principal de hoje",
  "Resolver o que mais está travando meu progresso",
  "Fazer um dia mais leve, porém produtivo",
];

const TASK_SUGGESTIONS = [
  "Responder mensagens e pendências importantes",
  "Organizar ambiente de trabalho",
  "Separar 30 minutos para foco total",
  "Concluir uma tarefa que está atrasada",
  "Planejar o restante do dia",
  "Revisar meta principal da semana",
  "Eliminar uma distração do dia",
  "Finalizar algo antes de começar outra coisa",
  "Beber água e fazer uma pausa consciente",
  "Anotar prioridades de amanhã",
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

function getUniqueRandomItems(list: string[], count: number) {
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function TempoScreen() {
  const { language } = useAppLanguage();
  const timeTourSteps = useMemo(
    () => [
      {
        icon: "flag-outline" as const,
        title: "Defina um foco do dia",
        description:
          "O primeiro passo aqui é escolher um foco principal. Isso reduz dispersão e devolve direção para a sua rotina.",
        primaryLabel: "Próximo",
      },
      {
        icon: "list-outline" as const,
        title: "Use só 3 tarefas essenciais",
        description:
          "Preencha apenas as 3 tarefas mais importantes do dia. Essa limitação ajuda você a agir com clareza.",
        primaryLabel: "Próximo",
      },
      {
        icon: "checkmark-done-outline" as const,
        title: "Acompanhe sua execução",
        description:
          "Conforme concluir as tarefas, toque nelas. O app mede seu progresso e fortalece a sua constância.",
        primaryLabel: "Finalizar tour",
      },
    ],
    []
  );
  const [focus, setFocus] = useState("");
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [task3, setTask3] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [history, setHistory] = useState<TimeDayData[]>([]);
  const [focusSuggestions, setFocusSuggestions] = useState<string[]>([]);
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [showModuleTour, setShowModuleTour] = useState(false);
  const [moduleTourStepIndex, setModuleTourStepIndex] = useState(0);
  const [tourTargets, setTourTargets] = useState<{
    focus: { x: number; y: number; width: number; height: number } | null;
    tasks: { x: number; y: number; width: number; height: number } | null;
    summary: { x: number; y: number; width: number; height: number } | null;
  }>({
    focus: null,
    tasks: null,
    summary: null,
  });

  const today = useMemo(() => todayKey(), []);
  const isPremium = plan === "premium";

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings.theme, settings.accentColor]
  );
  const formatDateLabel = useCallback(
    (dateKey: string) =>
      formatDateByLanguage(
        dateKey,
        language,
        {
          day: "2-digit",
          month: "2-digit",
        },
        "--"
      ),
    [language]
  );
  const activeTimeTourStep = timeTourSteps[moduleTourStepIndex];
  const activeTimeTourTarget =
    moduleTourStepIndex === 0
      ? tourTargets.focus
      : moduleTourStepIndex === 1
        ? tourTargets.tasks
        : tourTargets.summary;

  const refreshSuggestions = useCallback(() => {
    setFocusSuggestions(
      getUniqueRandomItems(
        FOCUS_SUGGESTIONS,
        isPremium ? 3 : FREE_FOCUS_SUGGESTIONS
      )
    );
    setTaskSuggestions(
      getUniqueRandomItems(
        TASK_SUGGESTIONS,
        isPremium ? 6 : FREE_TASK_SUGGESTIONS
      )
    );
  }, [isPremium]);

  const loadData = useCallback(async () => {
    try {
      const [rawData, rawSettings, planRaw, aiPlanRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
        AsyncStorage.getItem(AI_PLAN_KEY),
      ]);

      const parsedSettings = rawSettings
        ? JSON.parse(rawSettings)
        : DEFAULT_SETTINGS;

      const effectivePlan: SubscriptionPlan =
        planRaw === "premium" || parsedSettings?.plan === "premium"
          ? "premium"
          : "free";

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

      if (!rawData) {
        setFocus("");
        setTasks([]);
        setHistory([]);
        return;
      }

      const parsed: TimeDayData[] = JSON.parse(rawData);
      const safeList = Array.isArray(parsed) ? parsed : [];

      const todayData = safeList.find((item) => item.dateKey === today);

      if (!todayData) {
        setFocus("");
        setTasks([]);
      } else {
        setFocus(todayData.focus ?? "");
        setTasks(Array.isArray(todayData.tasks) ? todayData.tasks : []);
      }

      const recentHistory = safeList
        .filter((item) => item.dateKey !== today)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .slice(0, effectivePlan === "premium" ? 7 : FREE_HISTORY_DAYS);

      setHistory(recentHistory);

      const normalizedPlan = aiPlanRaw
        ? normalizeLifeJourneyPlan(JSON.parse(aiPlanRaw))
        : null;
      const moduleTourState = await readJourneyModuleTourState();

      if (normalizedPlan?.primaryArea === "tempo" && !moduleTourState.tempo) {
        setModuleTourStepIndex(0);
        setShowModuleTour(true);
      } else {
        setShowModuleTour(false);
      }
    } catch (error) {
      console.log("Erro ao carregar módulo tempo:", error);
      Alert.alert("Erro", "Não foi possível carregar seus dados de tempo.");
      setShowModuleTour(false);
    }
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useFocusEffect(
    useCallback(() => {
      refreshSuggestions();
    }, [refreshSuggestions])
  );

  const saveData = useCallback(
    async (nextFocus: string, nextTasks: TaskItem[]) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: TimeDayData[] = raw ? JSON.parse(raw) : [];

        const safeList = Array.isArray(parsed) ? parsed : [];
        const index = safeList.findIndex((item) => item.dateKey === today);

        const nextDay: TimeDayData = {
          dateKey: today,
          focus: nextFocus,
          tasks: nextTasks,
        };

        let nextList: TimeDayData[] = [];

        if (index >= 0) {
          nextList = [...safeList];
          nextList[index] = nextDay;
        } else {
          nextList = [nextDay, ...safeList];
        }

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
        setFocus(nextFocus);
        setTasks(nextTasks);

        const recentHistory = nextList
          .filter((item) => item.dateKey !== today)
          .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
          .slice(0, isPremium ? 7 : FREE_HISTORY_DAYS);

        setHistory(recentHistory);
      } catch (error) {
        console.log("Erro ao salvar módulo tempo:", error);
        Alert.alert("Erro", "Não foi possível salvar seus dados.");
      }
    },
    [today, isPremium]
  );

  const surfaceMuted =
    (colors as any).surfaceMuted || colors.surfaceAlt || colors.surface;

  const salvarPlanejamento = useCallback(async () => {
    const cleanFocus = focus.trim();

    const newTasks = [task1, task2, task3]
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text) => ({
        id: uid(),
        text,
        done: false,
      }));

    if (!cleanFocus) {
      Alert.alert("Atenção", "Defina o foco principal do dia.");
      return;
    }

    if (newTasks.length === 0 && tasks.length === 0) {
      Alert.alert("Atenção", "Adicione pelo menos uma tarefa essencial.");
      return;
    }

    const nextTasks = tasks.length > 0 ? tasks : newTasks;

    await saveData(cleanFocus, nextTasks);

    if (tasks.length === 0) {
      setTask1("");
      setTask2("");
      setTask3("");
    }

    Alert.alert("Salvo ✅", "Seu planejamento do dia foi registrado.");
  }, [focus, task1, task2, task3, tasks, saveData]);

  const toggleTask = useCallback(
    async (taskId: string) => {
      const nextTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );

      await saveData(focus, nextTasks);
    },
    [tasks, focus, saveData]
  );

  const resetarDia = useCallback(() => {
    Alert.alert(
      "Limpar planejamento",
      "Deseja apagar o foco do dia e as tarefas de hoje?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: async () => {
            await saveData("", []);
            setTask1("");
            setTask2("");
            setTask3("");
            refreshSuggestions();
          },
        },
      ]
    );
  }, [saveData, refreshSuggestions]);

  const aplicarFocoSugerido = useCallback((suggestion: string) => {
    setFocus(suggestion);
  }, []);

  const aplicarTarefaSugerida = useCallback(
    (suggestion: string) => {
      if (!task1.trim()) {
        setTask1(suggestion);
        return;
      }
      if (!task2.trim()) {
        setTask2(suggestion);
        return;
      }
      if (!task3.trim()) {
        setTask3(suggestion);
        return;
      }

      Alert.alert(
        "Lista preenchida",
        "As 3 tarefas já estão preenchidas. Apague uma para usar outra sugestão."
      );
    },
    [task1, task2, task3]
  );

  const preencherExemploRapido = useCallback(() => {
    const randomFocus = getUniqueRandomItems(FOCUS_SUGGESTIONS, 1)[0];
    const randomTasks = getUniqueRandomItems(TASK_SUGGESTIONS, 3);

    setFocus(randomFocus);
    setTask1(randomTasks[0] ?? "");
    setTask2(randomTasks[1] ?? "");
    setTask3(randomTasks[2] ?? "");
  }, []);

  const doneCount = tasks.filter((task) => task.done).length;
  const totalCount = tasks.length;
  const progress =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const productivityMessage = useMemo(() => {
    if (totalCount === 0) return "Planeje seu dia para ganhar clareza.";
    if (progress === 100) return "Dia muito bem executado. Missão cumprida. 🚀";
    if (progress >= 67) return "Você está avançando muito bem hoje.";
    if (progress >= 34) return "Bom progresso. Continue no ritmo.";
    return "Comece pela tarefa mais importante e ganhe tração.";
  }, [progress, totalCount]);

  const handleAdvanceModuleTour = useCallback(async () => {
    const lastStep = moduleTourStepIndex >= timeTourSteps.length - 1;

    if (!lastStep) {
      setModuleTourStepIndex((current) => current + 1);
      return;
    }

    await completeJourneyModuleTour("tempo");
    setShowModuleTour(false);
  }, [moduleTourStepIndex, timeTourSteps.length]);

  const handleSkipModuleTour = useCallback(async () => {
    await skipJourneyModuleTour("tempo");
    setShowModuleTour(false);
  }, []);

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
          title="Tempo"
          subtitle="Organize seu dia com foco, prioridade e execução."
          icon="time-outline"
          badgeLabel={isPremium ? "Premium" : "Free"}
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={goToPremium}
        />

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
            },
          ]}
          onLayout={(event) => {
            const next = event.nativeEvent.layout;
            setTourTargets((current) =>
              hasTourRectChanged(current.focus, next)
                ? {
                    ...current,
                    focus: next,
                  }
                : current
            );
          }}
        >
          <Text style={[styles.heroLabel, { color: colors.accent }]}>
            Foco principal do dia
          </Text>
          <TextInput
            value={focus}
            onChangeText={setFocus}
            placeholder="Ex.: concluir proposta, estudar 1h, treinar..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.focusInput,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            multiline
          />

          <View style={styles.suggestionHeaderRow}>
            <Text style={[styles.suggestionTitle, { color: colors.textSecondary }]}>
              Sugestões de foco
            </Text>
            {!isPremium ? (
              <Text style={[styles.freeHintText, { color: colors.textMuted }]}>
                Free: {FREE_FOCUS_SUGGESTIONS}
              </Text>
            ) : null}
          </View>

          <View style={styles.suggestionWrap}>
            {focusSuggestions.map((item, index) => (
              <Pressable
                key={`${item}_${index}`}
                style={[
                  styles.suggestionChip,
                  {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accentBorder,
                  },
                ]}
                onPress={() => aplicarFocoSugerido(item)}
              >
                <Text
                  style={[styles.suggestionChipText, { color: colors.accent }]}
                >
                  {item}
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
                style={[styles.inlinePremiumText, { color: colors.textSecondary }]}
              >
                Desbloqueie mais ideias para planejar seus dias com ainda mais clareza.
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.quickActionsRow}>
            <Pressable
              style={[
                styles.quickButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={preencherExemploRapido}
            >
              <Text
                style={[
                  styles.quickButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                Preencher exemplo
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.quickButtonGhost,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={refreshSuggestions}
            >
              <Text
                style={[styles.quickButtonGhostText, { color: colors.text }]}
              >
                Trocar sugestões
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          3 tarefas essenciais
        </Text>

        {tasks.length === 0 ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onLayout={(event) => {
              const next = event.nativeEvent.layout;
              setTourTargets((current) =>
                hasTourRectChanged(current.tasks, next)
                  ? {
                      ...current,
                      tasks: next,
                    }
                  : current
              );
            }}
          >
            <TextInput
              value={task1}
              onChangeText={setTask1}
              placeholder="Tarefa 1"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.taskInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={task2}
              onChangeText={setTask2}
              placeholder="Tarefa 2"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.taskInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <TextInput
              value={task3}
              onChangeText={setTask3}
              placeholder="Tarefa 3"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.taskInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <View style={styles.suggestionHeaderRow}>
              <Text style={[styles.suggestionTitle, { color: colors.textSecondary }]}>
                Sugestões de tarefas
              </Text>
              {!isPremium ? (
                <Text style={[styles.freeHintText, { color: colors.textMuted }]}>
                  Free: {FREE_TASK_SUGGESTIONS}
                </Text>
              ) : null}
            </View>

            <View style={styles.suggestionWrap}>
              {taskSuggestions.map((item, index) => (
                <Pressable
                  key={`${item}_${index}`}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                  onPress={() => aplicarTarefaSugerida(item)}
                >
                  <Text
                    style={[styles.suggestionChipText, { color: colors.accent }]}
                  >
                    {item}
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
                  🔒 Mais sugestões de tarefas no Premium
                </Text>
                <Text
                  style={[styles.inlinePremiumText, { color: colors.textSecondary }]}
                >
                  Libere mais ideias e monte seu dia com mais rapidez e inteligência.
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={salvarPlanejamento}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                Salvar planejamento
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {tasks.map((task) => (
              <Pressable
                key={task.id}
                style={[
                  styles.taskRow,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                  task.done && {
                    borderColor: colors.accentBorder,
                    backgroundColor: colors.accentSoft,
                  },
                ]}
                onPress={() => toggleTask(task.id)}
              >
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    task.done && {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.checkCircleText,
                      { color: colors.textMuted },
                      task.done && { color: colors.accent },
                    ]}
                  >
                    {task.done ? "✓" : "○"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.taskText,
                    { color: colors.text },
                    task.done && {
                      color: colors.textSecondary,
                      textDecorationLine: "line-through",
                    },
                  ]}
                >
                  {task.text}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Resumo do dia
        </Text>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
            },
          ]}
          onLayout={(event) => {
            const next = event.nativeEvent.layout;
            setTourTargets((current) =>
              hasTourRectChanged(current.summary, next)
                ? {
                    ...current,
                    summary: next,
                  }
                : current
            );
          }}
        >
          <Text style={[styles.summaryLabel, { color: colors.accent }]}>
            Execução
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {doneCount}/{totalCount} tarefas
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
                  width: `${progress}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>

          <Text style={[styles.progressText, { color: colors.success }]}>
            {progress}% concluído
          </Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>
            {productivityMessage}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Últimos dias
        </Text>

        {history.length === 0 ? (
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
              Ainda sem histórico
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Conforme você usar o módulo Tempo, os últimos dias aparecerão
              aqui.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.historyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {history.map((day, index) => {
              const total = day.tasks.length;
              const done = day.tasks.filter((task) => task.done).length;
              const percent = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <View
                  key={day.dateKey}
                  style={[
                    styles.historyRow,
                    index < history.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <Text style={[styles.historyDate, { color: colors.text }]}>
                      {formatDateLabel(day.dateKey)}
                    </Text>
                    <Text
                      style={[styles.historyFocus, { color: colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {day.focus || "Sem foco registrado"}
                    </Text>
                  </View>

                  <View style={styles.historyRight}>
                    <Text
                      style={[styles.historyMeta, { color: colors.text }]}
                    >
                      {done}/{total}
                    </Text>
                    <Text
                      style={[styles.historyPercent, { color: colors.success }]}
                    >
                      {percent}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!isPremium ? (
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
              🔒 Histórico ampliado no Premium
            </Text>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              No Free você vê os últimos {FREE_HISTORY_DAYS} dias. O Premium amplia sua visão de consistência.
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
                Desbloquear
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.secondaryButton,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
            onPress={resetarDia}
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.text }]}
            >
              Limpar dia
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButtonSmall,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={salvarPlanejamento}
          >
            <Text
              style={[styles.primaryButtonText, { color: colors.accentButtonText }]}
            >
              Salvar
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {showModuleTour && activeTimeTourStep ? (
        <GuidedTourOverlay
          visible={showModuleTour}
          icon={activeTimeTourStep.icon}
          title={activeTimeTourStep.title}
          description={activeTimeTourStep.description}
          stepLabel={`Tour do módulo • ${moduleTourStepIndex + 1}/${timeTourSteps.length}`}
          accentColor={colors.accent}
          surfaceColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          textSecondaryColor={colors.textSecondary}
          targetRect={activeTimeTourTarget}
          primaryLabel={activeTimeTourStep.primaryLabel}
          onPrimary={() => {
            void handleAdvanceModuleTour();
          }}
          secondaryLabel="Pular tour"
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

  heroCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },

  heroLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },

  focusInput: {
    minHeight: 80,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: "top",
    borderWidth: 1,
  },

  suggestionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    marginBottom: 10,
  },

  suggestionTitle: {
    fontSize: 12,
    fontWeight: "800",
  },

  freeHintText: {
    fontSize: 11,
    fontWeight: "700",
  },

  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    marginTop: 12,
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

  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  quickButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },

  quickButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 12,
  },

  quickButtonGhost: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },

  quickButtonGhostText: {
    fontWeight: "800",
    fontSize: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },

  taskInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 10,
  },

  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },

  primaryButtonSmall: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },

  primaryButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },

  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },

  checkCircleText: {
    fontSize: 18,
    fontWeight: "900",
  },

  taskText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },

  summaryCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
  },

  summaryValue: {
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },

  progressTrack: {
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 14,
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

  summaryHint: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  historyCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },

  historyLeft: {
    flex: 1,
  },

  historyDate: {
    fontSize: 13,
    fontWeight: "800",
  },

  historyFocus: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  historyRight: {
    alignItems: "flex-end",
  },

  historyMeta: {
    fontSize: 12,
    fontWeight: "800",
  },

  historyPercent: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },

  emptyBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
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

  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },

  secondaryButtonText: {
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
