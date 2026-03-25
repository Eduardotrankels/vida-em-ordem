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

type LeisureItem = {
  id: string;
  title: string;
  type: "familia" | "sozinho" | "amigos" | "casal" | "outros";
  date: string;
  done: boolean;
  createdAt: string;
};

const STORAGE_KEY = "@vida_em_ordem_lazer_v1";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

const FREE_MAX_LEISURE_ITEMS = 5;
const FREE_SUGGESTIONS_LIMIT = 4;

const TYPE_OPTIONS: {
  key: LeisureItem["type"];
  label: string;
  emoji: string;
}[] = [
  { key: "familia", label: "Família", emoji: "👨‍👩‍👧‍👦" },
  { key: "sozinho", label: "Sozinho", emoji: "🧘" },
  { key: "amigos", label: "Amigos", emoji: "🎉" },
  { key: "casal", label: "Casal", emoji: "❤️" },
  { key: "outros", label: "Outros", emoji: "✨" },
];

const SUGGESTIONS = [
  "Assistir um filme com a família",
  "Sair para jantar",
  "Passear ao ar livre",
  "Ler algo por prazer",
  "Ouvir música e relaxar",
  "Tomar um café especial",
  "Brincar com os filhos",
  "Fazer uma caminhada leve",
  "Ir a um parque",
  "Ter um tempo de descanso sem celular",
];

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function todayInputValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTypeMeta(type: LeisureItem["type"]) {
  return (
    TYPE_OPTIONS.find((item) => item.key === type) ??
    TYPE_OPTIONS[TYPE_OPTIONS.length - 1]
  );
}

export default function LazerScreen() {
  const { language } = useAppLanguage();
  const leisureTourSteps = useMemo(
    () => [
      {
        icon: "add-circle-outline" as const,
        title: "Planeje momentos leves",
        description:
          "Aqui você registra atividades de lazer que recarregam sua energia e ajudam a equilibrar a rotina.",
        primaryLabel: "Próximo",
      },
      {
        icon: "calendar-outline" as const,
        title: "Dê data ao descanso",
        description:
          "Ao escolher tipo e data, você transforma o lazer em compromisso real, e não só em uma intenção solta.",
        primaryLabel: "Próximo",
      },
      {
        icon: "sparkles-outline" as const,
        title: "Marque o que conseguiu viver",
        description:
          "Quando a atividade acontecer, marque como concluída para acompanhar se a sua rotina está mais leve de verdade.",
        primaryLabel: "Finalizar tour",
      },
    ],
    []
  );
  const [items, setItems] = useState<LeisureItem[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [type, setType] = useState<LeisureItem["type"]>("familia");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [showModuleTour, setShowModuleTour] = useState(false);
  const [moduleTourStepIndex, setModuleTourStepIndex] = useState(0);
  const [tourTargets, setTourTargets] = useState<{
    add: { x: number; y: number; width: number; height: number } | null;
    create: { x: number; y: number; width: number; height: number } | null;
    summary: { x: number; y: number; width: number; height: number } | null;
  }>({
    add: null,
    create: null,
    summary: null,
  });

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

  const loadData = useCallback(async () => {
    try {
      const [rawItems, rawSettings, planRaw, aiPlanRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
        AsyncStorage.getItem(AI_PLAN_KEY),
      ]);

      const parsedItems = rawItems ? JSON.parse(rawItems) : [];
      const parsedSettings = rawSettings
        ? JSON.parse(rawSettings)
        : DEFAULT_SETTINGS;

      const effectivePlan: SubscriptionPlan =
        planRaw === "premium" || parsedSettings?.plan === "premium"
          ? "premium"
          : "free";

      setItems(Array.isArray(parsedItems) ? parsedItems : []);
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

      if (normalizedPlan?.primaryArea === "lazer" && !moduleTourState.lazer) {
        setModuleTourStepIndex(0);
        setShowModuleTour(true);
      } else {
        setShowModuleTour(false);
      }
    } catch (error) {
      console.log("Erro ao carregar módulo lazer:", error);
      Alert.alert("Erro", "Não foi possível carregar seu planejamento de lazer.");
      setShowModuleTour(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const saveItems = useCallback(async (next: LeisureItem[]) => {
    try {
      setItems(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Erro ao salvar módulo lazer:", error);
      Alert.alert("Erro", "Não foi possível salvar seus dados.");
    }
  }, []);

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings.theme, settings.accentColor]
  );
  const activeLeisureTourStep = leisureTourSteps[moduleTourStepIndex];
  const activeLeisureTourTarget =
    moduleTourStepIndex === 0
      ? tourTargets.add
      : moduleTourStepIndex === 1
        ? tourTargets.create
        : tourTargets.summary;

  const surfaceMuted =
    (colors as any).surfaceMuted || colors.surfaceAlt || colors.surface;
  const noDateLabel = useMemo(
    () =>
      ({
        pt: "Sem data",
        en: "No date",
        es: "Sin fecha",
        fr: "Sans date",
        it: "Senza data",
      })[language],
    [language]
  );
  const formatDateLabel = useCallback(
    (value: string) =>
      formatDateByLanguage(
        value,
        language,
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
        noDateLabel
      ),
    [language, noDateLabel]
  );

  const availableSuggestions = useMemo(() => {
    return isPremium ? SUGGESTIONS : SUGGESTIONS.slice(0, FREE_SUGGESTIONS_LIMIT);
  }, [isPremium]);

  const abrirCriacao = useCallback(() => {
    if (!isPremium && items.length >= FREE_MAX_LEISURE_ITEMS) {
      showPremiumAlert(`Mais de ${FREE_MAX_LEISURE_ITEMS} planejamentos de lazer`);
      return;
    }

    setShowCreateBox((prev) => !prev);
  }, [isPremium, items.length, showPremiumAlert]);

  const adicionarItem = useCallback(async () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      Alert.alert("Atenção", "Digite uma atividade de lazer.");
      return;
    }

    if (!date.trim()) {
      Alert.alert("Atenção", "Informe uma data.");
      return;
    }

    if (!isPremium && items.length >= FREE_MAX_LEISURE_ITEMS) {
      showPremiumAlert(`Mais de ${FREE_MAX_LEISURE_ITEMS} planejamentos de lazer`);
      return;
    }

    const newItem: LeisureItem = {
      id: uid(),
      title: cleanTitle,
      type,
      date,
      done: false,
      createdAt: new Date().toISOString(),
    };

    await saveItems([newItem, ...items]);

    setTitle("");
    setDate(todayInputValue());
    setType("familia");
    setShowCreateBox(false);
  }, [title, date, type, items, saveItems, isPremium, showPremiumAlert]);

  const toggleDone = useCallback(
    async (id: string) => {
      const next = items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      );
      await saveItems(next);
    },
    [items, saveItems]
  );

  const removerItem = useCallback(
    async (id: string) => {
      Alert.alert("Remover lazer", "Deseja remover esta atividade?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const next = items.filter((item) => item.id !== id);
            await saveItems(next);
          },
        },
      ]);
    },
    [items, saveItems]
  );

  const usarSugestao = useCallback((suggestion: string) => {
    setTitle(suggestion);
  }, []);

  const doneCount = useMemo(() => items.filter((item) => item.done).length, [items]);
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleAdvanceModuleTour = useCallback(async () => {
    const lastStep = moduleTourStepIndex >= leisureTourSteps.length - 1;

    if (!lastStep) {
      setModuleTourStepIndex((current) => current + 1);
      return;
    }

    await completeJourneyModuleTour("lazer");
    setShowModuleTour(false);
  }, [moduleTourStepIndex, leisureTourSteps.length]);

  const handleSkipModuleTour = useCallback(async () => {
    await skipJourneyModuleTour("lazer");
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
          title="Lazer"
          subtitle="Planeje momentos leves para recarregar as energias e manter a vida em equilíbrio."
          icon="game-controller-outline"
          badgeLabel={isPremium ? "Premium" : "Free"}
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={goToPremium}
        />

        {!isPremium ? (
          <Text style={[styles.freeInfoText, { color: colors.textMuted }]}>
            Free: até {FREE_MAX_LEISURE_ITEMS} planejamentos de lazer.
          </Text>
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
        onLayout={(event) => {
          const next = event.nativeEvent.layout;
          setTourTargets((current) =>
            hasTourRectChanged(current.add, next)
              ? {
                  ...current,
                  add: next,
                }
              : current
          );
        }}
          onPress={abrirCriacao}
        >
          <Text
            style={[
              styles.primaryButtonText,
              { color: colors.accentButtonText },
            ]}
          >
            {showCreateBox ? "Fechar criação de lazer" : "Adicionar lazer"}
          </Text>
        </Pressable>

        {showCreateBox && (
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
                hasTourRectChanged(current.create, next)
                  ? {
                      ...current,
                      create: next,
                    }
                  : current
              );
            }}
          >
            <Text style={[styles.heroLabel, { color: colors.accent }]}>
              Nova atividade de lazer
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: jantar em família, caminhar no parque..."
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
              value={date}
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
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

            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
              Tipo de lazer
            </Text>
            <View style={styles.typeWrap}>
              {TYPE_OPTIONS.map((option) => {
                const active = type === option.key;

                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active
                          ? colors.accentSoft
                          : colors.surfaceAlt,
                        borderColor: active
                          ? colors.accentBorder
                          : colors.border,
                      },
                    ]}
                    onPress={() => setType(option.key)}
                  >
                    <Text style={styles.typeChipEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.typeChipText,
                        {
                          color: active ? colors.accent : colors.textSecondary,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.suggestionHeaderRow}>
              <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
                Sugestões
              </Text>
              {!isPremium ? (
                <Text style={[styles.freeHintText, { color: colors.textMuted }]}>
                  Free: {FREE_SUGGESTIONS_LIMIT}
                </Text>
              ) : null}
            </View>

            <View style={styles.suggestionWrap}>
              {availableSuggestions.map((item, index) => (
                <Pressable
                  key={`${item}_${index}`}
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
                  Desbloqueie todas as ideias de lazer para montar momentos leves com mais variedade.
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={adicionarItem}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                Salvar lazer
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumo</Text>
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
            Momentos planejados
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {doneCount}/{totalCount}
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
            {progress}% realizados
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Seu planejamento
        </Text>

        {items.length === 0 ? (
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
              Nada planejado ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Adicione momentos de lazer. Descanso também é parte da vida em
              ordem.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const meta = getTypeMeta(item.type);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
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
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                      item.done && {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accentBorder,
                      },
                    ]}
                    onPress={() => toggleDone(item.id)}
                  >
                    <Text
                      style={[
                        styles.checkText,
                        { color: colors.textMuted },
                        item.done && { color: colors.accent },
                      ]}
                    >
                      {item.done ? "✓" : "○"}
                    </Text>
                  </Pressable>

                  <View style={styles.itemMain}>
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: colors.text },
                        item.done && {
                          color: colors.textSecondary,
                          textDecorationLine: "line-through",
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {meta.emoji} {meta.label} • {formatDateLabel(item.date)}
                    </Text>
                  </View>

                  <Pressable onPress={() => removerItem(item.id)}>
                    <Text style={[styles.removeText, { color: colors.textMuted }]}>
                      Remover
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {showModuleTour && activeLeisureTourStep ? (
        <GuidedTourOverlay
          visible={showModuleTour}
          icon={activeLeisureTourStep.icon}
          title={activeLeisureTourStep.title}
          description={activeLeisureTourStep.description}
          stepLabel={`Tour do módulo • ${moduleTourStepIndex + 1}/${leisureTourSteps.length}`}
          accentColor={colors.accent}
          surfaceColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          textSecondaryColor={colors.textSecondary}
          targetRect={activeLeisureTourTarget}
          primaryLabel={activeLeisureTourStep.primaryLabel}
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

  freeInfoText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: -2,
    marginBottom: 10,
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

  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 10,
  },

  pickerLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 10,
  },

  suggestionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  freeHintText: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
  },

  typeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },

  typeChipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },

  typeChipText: {
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

  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
  },

  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
  },

  primaryButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
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

  emptyBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
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

  list: {
    gap: 10,
  },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  check: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },

  checkText: {
    fontSize: 18,
    fontWeight: "900",
  },

  itemMain: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  itemMeta: {
    fontSize: 12,
    marginTop: 4,
  },

  removeText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 10,
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
