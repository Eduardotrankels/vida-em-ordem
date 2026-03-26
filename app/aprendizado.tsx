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
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "./utils/appTheme";
import { useAppLanguage } from "./utils/languageContext";
import { formatDateByLanguage } from "./utils/locale";

type SubscriptionPlan = "free" | "premium";

type LearningTaskItem = {
  id: string;
  text: string;
  done: boolean;
};

type LearningDayData = {
  dateKey: string;
  objective: string;
  tasks: LearningTaskItem[];
};

const STORAGE_KEY = "@vida_em_ordem_aprendizado_v1";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

const FREE_OBJECTIVE_SUGGESTIONS = 3;
const FREE_TASK_SUGGESTIONS = 4;
const FREE_HISTORY_DAYS = 3;

const OBJECTIVE_SUGGESTIONS = [
  "Aprender algo útil e aplicar hoje mesmo",
  "Estudar com foco por pelo menos 30 minutos",
  "Avançar em um tema importante para meu crescimento",
  "Ler e absorver uma ideia valiosa",
  "Desenvolver uma habilidade com consistência",
  "Aprender menos coisas, mas com mais profundidade",
  "Transformar estudo em progresso real",
  "Fechar o dia sabendo mais do que ontem",
];

const TASK_SUGGESTIONS = [
  "Ler 10 páginas de um livro",
  "Assistir uma aula ou vídeo educativo",
  "Fazer anotações do que aprendi",
  "Revisar um conteúdo estudado",
  "Praticar uma habilidade por 20 minutos",
  "Estudar um tema importante sem interrupções",
  "Anotar uma ideia útil para aplicar",
  "Pesquisar uma dúvida específica",
  "Ouvir um conteúdo educativo",
  "Separar 30 minutos para aprendizado focado",
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

export default function AprendizadoScreen() {
  const { language } = useAppLanguage();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<SubscriptionPlan>("free");

  const [objective, setObjective] = useState("");
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [task3, setTask3] = useState("");
  const [tasks, setTasks] = useState<LearningTaskItem[]>([]);
  const [history, setHistory] = useState<LearningDayData[]>([]);
  const [objectiveSuggestions, setObjectiveSuggestions] = useState<string[]>(
    []
  );
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);

  const today = useMemo(() => todayKey(), []);
  const isPremium = plan === "premium";
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

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings.theme, settings.accentColor]
  );

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const refreshSuggestions = useCallback(
    () => {
      setObjectiveSuggestions(
        getUniqueRandomItems(
          OBJECTIVE_SUGGESTIONS,
          isPremium ? 3 : FREE_OBJECTIVE_SUGGESTIONS
        )
      );
      setTaskSuggestions(
        getUniqueRandomItems(
          TASK_SUGGESTIONS,
          isPremium ? 6 : FREE_TASK_SUGGESTIONS
        )
      );
    },
    [isPremium]
  );

  const loadData = useCallback(async () => {
    try {
      const [raw, settingsRaw, planRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
      ]);

      const parsedSettings = settingsRaw
        ? JSON.parse(settingsRaw)
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

      if (!raw) {
        setObjective("");
        setTasks([]);
        setHistory([]);
        return;
      }

      const parsed: LearningDayData[] = JSON.parse(raw);
      const safeList = Array.isArray(parsed) ? parsed : [];

      const todayData = safeList.find((item) => item.dateKey === today);

      if (!todayData) {
        setObjective("");
        setTasks([]);
      } else {
        setObjective(todayData.objective ?? "");
        setTasks(Array.isArray(todayData.tasks) ? todayData.tasks : []);
      }

      const recentHistory = safeList
        .filter((item) => item.dateKey !== today)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .slice(0, effectivePlan === "premium" ? 7 : FREE_HISTORY_DAYS);

      setHistory(recentHistory);
    } catch (error) {
      console.log("Erro ao carregar módulo aprendizado:", error);
      Alert.alert("Erro", "Não foi possível carregar seus dados de aprendizado.");
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
    async (nextObjective: string, nextTasks: LearningTaskItem[]) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: LearningDayData[] = raw ? JSON.parse(raw) : [];

        const safeList = Array.isArray(parsed) ? parsed : [];
        const index = safeList.findIndex((item) => item.dateKey === today);

        const nextDay: LearningDayData = {
          dateKey: today,
          objective: nextObjective,
          tasks: nextTasks,
        };

        let nextList: LearningDayData[] = [];

        if (index >= 0) {
          nextList = [...safeList];
          nextList[index] = nextDay;
        } else {
          nextList = [nextDay, ...safeList];
        }

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
        setObjective(nextObjective);
        setTasks(nextTasks);

        const recentHistory = nextList
          .filter((item) => item.dateKey !== today)
          .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
          .slice(0, isPremium ? 7 : FREE_HISTORY_DAYS);

        setHistory(recentHistory);
      } catch (error) {
        console.log("Erro ao salvar módulo aprendizado:", error);
        Alert.alert("Erro", "Não foi possível salvar seus dados.");
      }
    },
    [today, isPremium]
  );

  const salvarPlanejamento = useCallback(async () => {
    const cleanObjective = objective.trim();

    const newTasks = [task1, task2, task3]
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text) => ({
        id: uid(),
        text,
        done: false,
      }));

    if (!cleanObjective) {
      Alert.alert("Atenção", "Defina o objetivo de aprendizado do dia.");
      return;
    }

    if (newTasks.length === 0 && tasks.length === 0) {
      Alert.alert("Atenção", "Adicione pelo menos um item de aprendizado.");
      return;
    }

    const nextTasks = tasks.length > 0 ? tasks : newTasks;

    await saveData(cleanObjective, nextTasks);

    if (tasks.length === 0) {
      setTask1("");
      setTask2("");
      setTask3("");
    }

    Alert.alert("Salvo ✅", "Seu planejamento de aprendizado foi registrado.");
  }, [objective, task1, task2, task3, tasks, saveData]);

  const toggleTask = useCallback(
    async (taskId: string) => {
      const nextTasks = tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      );

      await saveData(objective, nextTasks);
    },
    [tasks, objective, saveData]
  );

  const resetarDia = useCallback(() => {
    Alert.alert(
      "Limpar planejamento",
      "Deseja apagar o objetivo e os itens de aprendizado de hoje?",
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

  const aplicarObjetivoSugerido = useCallback((suggestion: string) => {
    setObjective(suggestion);
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
        "Os 3 itens já estão preenchidos. Apague um para usar outra sugestão."
      );
    },
    [task1, task2, task3]
  );

  const preencherExemploRapido = useCallback(() => {
    const randomObjective = getUniqueRandomItems(OBJECTIVE_SUGGESTIONS, 1)[0];
    const randomTasks = getUniqueRandomItems(TASK_SUGGESTIONS, 3);

    setObjective(randomObjective);
    setTask1(randomTasks[0] ?? "");
    setTask2(randomTasks[1] ?? "");
    setTask3(randomTasks[2] ?? "");
  }, []);

  const doneCount = tasks.filter((task) => task.done).length;
  const totalCount = tasks.length;
  const progress =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const learningMessage = useMemo(() => {
    if (totalCount === 0)
      return "Aprender um pouco por dia muda rotas inteiras.";
    if (progress === 100)
      return "Excelente. Hoje você investiu bem no seu crescimento. 📚";
    if (progress >= 67)
      return "Você está construindo aprendizado com consistência.";
    if (progress >= 34)
      return "Bom avanço. Continue absorvendo e aplicando.";
    return "Comece por um conteúdo simples e gere movimento.";
  }, [progress, totalCount]);

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
          title="Aprendizado"
          subtitle="Organize seu crescimento intelectual com intenção e consistência."
          icon="school-outline"
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
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.heroLabel, { color: colors.accent }]}>
            Objetivo de aprendizado do dia
          </Text>

          <TextInput
            value={objective}
            onChangeText={setObjective}
            placeholder="Ex.: ler 10 páginas, estudar um tema, revisar conteúdo..."
            placeholderTextColor={colors.textSecondary}
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
            <Text style={[styles.suggestionTitle, { color: colors.textMuted }]}>
              Sugestões de objetivo
            </Text>
            {!isPremium ? (
              <Text style={[styles.freeHintText, { color: colors.textMuted }]}>
                Free: {FREE_OBJECTIVE_SUGGESTIONS}
              </Text>
            ) : null}
          </View>

          <View style={styles.suggestionWrap}>
            {objectiveSuggestions.map((item, index) => (
              <Pressable
                key={`${item}_${index}`}
                style={[
                  styles.suggestionChip,
                  {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accentBorder,
                  },
                ]}
                onPress={() => aplicarObjetivoSugerido(item)}
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
                Desbloqueie mais ideias para manter seu crescimento sempre em movimento.
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
                style={[
                  styles.quickButtonGhostText,
                  { color: colors.textMuted },
                ]}
              >
                Trocar sugestões
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          3 itens de aprendizado
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
          >
            <TextInput
              value={task1}
              onChangeText={setTask1}
              placeholder="Item 1"
              placeholderTextColor={colors.textSecondary}
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
              placeholder="Item 2"
              placeholderTextColor={colors.textSecondary}
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
              placeholder="Item 3"
              placeholderTextColor={colors.textSecondary}
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
              <Text style={[styles.suggestionTitle, { color: colors.textMuted }]}>
                Sugestões de estudo
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
                  🔒 Mais sugestões de estudo no Premium
                </Text>
                <Text
                  style={[styles.inlinePremiumText, { color: colors.textSecondary }]}
                >
                  Libere mais ideias e monte seu aprendizado diário com mais variedade.
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
                    borderColor: colors.success,
                    backgroundColor: (colors as any).successSoft || colors.accentSoft,
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
                      backgroundColor:
                        (colors as any).successSoft || colors.accentSoft,
                      borderColor: colors.success,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.checkCircleText,
                      { color: colors.textSecondary },
                      task.done && { color: colors.success },
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
              borderColor: colors.success,
            },
          ]}
        >
          <Text style={[styles.summaryLabel, { color: colors.success }]}>
            Execução do aprendizado
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {doneCount}/{totalCount} itens
          </Text>

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
                  width: `${progress}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>

          <Text style={[styles.progressText, { color: colors.success }]}>
            {progress}% concluído
          </Text>
          <Text style={[styles.summaryHint, { color: colors.textMuted }]}>
            {learningMessage}
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
              Conforme você usar o módulo Aprendizado, os últimos dias aparecerão aqui.
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
                      style={[
                        styles.historyFocus,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {day.objective || "Sem objetivo registrado"}
                    </Text>
                  </View>

                  <View style={styles.historyRight}>
                    <Text
                      style={[styles.historyMeta, { color: colors.textMuted }]}
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
              No Free você vê os últimos {FREE_HISTORY_DAYS} dias. O Premium amplia sua visão de consistência no aprendizado.
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
              style={[styles.secondaryButtonText, { color: colors.textMuted }]}
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
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
