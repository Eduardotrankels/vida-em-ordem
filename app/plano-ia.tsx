import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import GuidedTourOverlay from "../components/GuidedTourOverlay";
import { useAppLanguage } from "./utils/languageContext";
import { syncJourneyReminder } from "./utils/journeyNotifications";
import {
  completeJourneyTourPlan,
  readJourneyTourState,
  skipJourneyTour,
  startJourneyTour,
} from "./utils/journeyTour";
import { hasTourRectChanged, measureTourTarget } from "./utils/tourLayout";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";
import {
  AI_JOURNEY_PROGRESS_KEY,
  AI_PLAN_KEY,
  AIJourneyProgress,
  LifeJourneyPlan,
  evaluateJourney,
  getLifeAreaMeta,
  normalizeJourneyProgress,
} from "./utils/lifeJourney";

export default function PlanoIAScreen() {
  const { colors, settings } = useAppTheme();
  const { language, t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const lifeAreaMeta = useMemo(() => getLifeAreaMeta(language), [language]);
  const planTourSteps = useMemo(
    () => [
      {
        icon: "lock-closed-outline" as const,
        title: "Os próximos dias ficam protegidos",
        description:
          "Aqui a jornada anda por etapas. O dia atual fica disponível e os próximos só abrem quando o app reconhece avanço real.",
        primaryLabel: "Entendi",
      },
      {
        icon: "checkmark-circle-outline" as const,
        title: "O app valida por você",
        description:
          "Você não precisa marcar a missão manualmente. Quando as tarefas do dia forem cumpridas dentro do app, o próximo dia será liberado automaticamente.",
        primaryLabel: "Próximo",
      },
      {
        icon: "trending-up-outline" as const,
        title: "Acompanhe sua evolução",
        description:
          "Nesta etapa você já consegue ver XP, dias concluídos e o ritmo da sua jornada tocando em Ver evolução da jornada.",
        primaryLabel: "Finalizar tour",
      },
    ],
    []
  );
  const [plan, setPlan] = useState<LifeJourneyPlan | null>(null);
  const [progress, setProgress] = useState<AIJourneyProgress>(
    normalizeJourneyProgress(null)
  );
  const [showPlanTour, setShowPlanTour] = useState(false);
  const [planTourStepIndex, setPlanTourStepIndex] = useState(0);
  const [tourTargets, setTourTargets] = useState<{
    days: { x: number; y: number; width: number; height: number } | null;
    evolution: { x: number; y: number; width: number; height: number } | null;
  }>({
    days: null,
    evolution: null,
  });
  const daysTourRef = useRef<View | null>(null);
  const evolutionTourRef = useRef<View | null>(null);

  const loadPlan = useCallback(async () => {
    try {
      const [rawPlan, rawProgress] = await Promise.all([
        AsyncStorage.getItem(AI_PLAN_KEY),
        AsyncStorage.getItem(AI_JOURNEY_PROGRESS_KEY),
      ]);

      const evaluated = await evaluateJourney(
        rawPlan ? JSON.parse(rawPlan) : null,
        rawProgress ? JSON.parse(rawProgress) : null,
        language
      );

      setPlan(evaluated.plan);
      setProgress(evaluated.progress);

      if (evaluated.plan) {
        await Promise.all([
          AsyncStorage.setItem(AI_PLAN_KEY, JSON.stringify(evaluated.plan)),
          AsyncStorage.setItem(
            AI_JOURNEY_PROGRESS_KEY,
            JSON.stringify(evaluated.progress)
          ),
        ]);
      }

      await syncJourneyReminder(evaluated.plan, evaluated.progress);

      const tourState = await readJourneyTourState();

      if (
        evaluated.plan &&
        !tourState.completed &&
        tourState.homeCompleted &&
        !tourState.planCompleted
      ) {
        await startJourneyTour();
        setPlanTourStepIndex(0);
        setShowPlanTour(true);
      } else {
        setShowPlanTour(false);
      }
    } catch (error) {
      console.log("Erro ao carregar plano IA:", error);
      setPlan(null);
      setProgress(normalizeJourneyProgress(null));
      setShowPlanTour(false);
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [loadPlan])
  );

  const primaryMeta = useMemo(
    () => (plan ? lifeAreaMeta[plan.primaryArea] : null),
    [lifeAreaMeta, plan]
  );
  const isPremium = settings.plan === "premium";
  const activePlanTourStep = planTourSteps[planTourStepIndex];
  const activePlanTourTarget =
    planTourStepIndex < 2 ? tourTargets.days : tourTargets.evolution;
  const syncPlanTourTarget = useCallback(
    (key: "days" | "evolution", next: { x: number; y: number; width: number; height: number }) => {
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
  const measurePlanTourSpotlight = useCallback(
    (key: "days" | "evolution", target: View | null) => {
      measureTourTarget(target, (next) => {
        syncPlanTourTarget(key, next);
      });
    },
    [syncPlanTourTarget]
  );

  useEffect(() => {
    if (!showPlanTour) return;

    if (planTourStepIndex < 2) {
      measurePlanTourSpotlight("days", daysTourRef.current);
      return;
    }

    measurePlanTourSpotlight("evolution", evolutionTourRef.current);
  }, [measurePlanTourSpotlight, planTourStepIndex, showPlanTour]);

  const handleAdvancePlanTour = useCallback(async () => {
    const lastStep = planTourStepIndex >= planTourSteps.length - 1;

    if (!lastStep) {
      setPlanTourStepIndex((current) => current + 1);
      return;
    }

    await completeJourneyTourPlan();
    setShowPlanTour(false);
  }, [planTourStepIndex, planTourSteps.length]);

  const handleSkipPlanTour = useCallback(async () => {
    await skipJourneyTour();
    setShowPlanTour(false);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenContentBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          title={t("plan.title")}
          subtitle={t("plan.subtitle")}
          icon="map-outline"
          badgeLabel="IA"
          badgeTone="accent"
        />

        {!plan || !primaryMeta ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("plan.emptyTitle")}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("plan.emptyText")}
            </Text>
            <Pressable
              style={[
                styles.emptyButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={() => router.replace("/onboarding-ia")}
              >
                <Text
                  style={[
                    styles.emptyButtonText,
                    { color: colors.accentButtonText },
                  ]}
                >
                  {t("plan.createDiagnosis")}
                </Text>
              </Pressable>
          </View>
        ) : (
          <>
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
                <View style={styles.heroTextWrap}>
                  <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
                    {t("plan.primaryArea")}
                  </Text>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>
                    {primaryMeta.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroIconBadge,
                    {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={primaryMeta.icon}
                    size={20}
                    color={colors.accent}
                  />
                </View>
              </View>

              <Text style={[styles.heroText, { color: colors.textSecondary }]}>
                {plan.summaryText}
              </Text>

              <View
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.goalLabel, { color: colors.textMuted }]}>
                  {t("plan.weeklyGoal")}
                </Text>
                <Text style={[styles.goalText, { color: colors.text }]}>
                  {plan.weeklyGoal}
                </Text>
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.accentButtonBackground,
                    borderColor: colors.accentButtonBorder,
                  },
                  colors.isWhiteAccentButton && styles.whiteAccentButton,
                ]}
                onPress={() => router.push(plan.recommendedRoute)}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: colors.accentButtonText },
                  ]}
                >
                  {t("plan.goToArea", { value: primaryMeta.label })}
                </Text>
              </Pressable>

              <Pressable
                ref={evolutionTourRef}
                collapsable={false}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
                onLayout={() => {
                  measurePlanTourSpotlight("evolution", evolutionTourRef.current);
                }}
                onPress={() => router.push("/evolucao-ia")}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("plan.viewEvolution")}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("plan.sectionTitle")}
            </Text>

            <View
              ref={daysTourRef}
              collapsable={false}
              style={styles.dayList}
              onLayout={() => {
                measurePlanTourSpotlight("days", daysTourRef.current);
              }}
            >
              {plan.journeyDays.map((item) => {
                const unlocked = progress.unlockedDays.includes(item.day);
                const completed = progress.completedDays.includes(item.day);

                return (
                <View
                  key={item.day}
                  style={[
                    styles.dayCard,
                    {
                      backgroundColor: completed
                        ? colors.accentSoft
                        : colors.surface,
                      borderColor: completed
                        ? colors.accentBorder
                        : colors.border,
                      opacity: unlocked ? 1 : 0.72,
                    },
                  ]}
                >
                  <View style={styles.dayTopRow}>
                    <View
                      style={[
                        styles.dayBadge,
                        {
                          backgroundColor: completed
                            ? colors.successSoft
                            : colors.accentSoft,
                          borderColor: completed
                            ? colors.success
                            : colors.accentBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayBadgeText,
                          { color: completed ? colors.success : colors.accent },
                        ]}
                      >
                        {t("plan.day", { value: item.day })}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.dayStatusPill,
                        {
                          backgroundColor: completed
                            ? colors.successSoft
                            : unlocked
                              ? colors.surfaceAlt
                              : colors.surfaceAlt,
                          borderColor: completed
                            ? colors.success
                            : unlocked
                              ? colors.border
                              : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayStatusText,
                          {
                            color: completed
                              ? colors.success
                              : unlocked
                                ? colors.textMuted
                                : colors.textMuted,
                          },
                        ]}
                      >
                        {completed
                          ? t("plan.status.completed")
                          : unlocked
                            ? t("plan.status.available")
                            : t("plan.status.locked")}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.dayTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.dayText, { color: colors.textSecondary }]}>
                    {item.summary}
                  </Text>

                  <View style={styles.taskList}>
                    {item.tasks.map((task) => (
                      <View key={task.id} style={styles.taskRow}>
                        <Ionicons
                          name={
                            task.completed
                              ? "checkmark-circle"
                              : unlocked
                                ? "ellipse-outline"
                                : "lock-closed-outline"
                          }
                          size={16}
                          color={
                            task.completed
                              ? colors.success
                              : unlocked
                                ? colors.textMuted
                                : colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.taskText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {task.title}
                        </Text>
                        <Text
                          style={[
                            styles.taskValue,
                            {
                              color: task.completed
                                ? colors.success
                                : colors.textMuted,
                            },
                          ]}
                        >
                          {Math.min(task.currentValue, task.targetValue)}/{task.targetValue}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View
                    style={[
                      styles.rewardPill,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.rewardPillText, { color: colors.textMuted }]}
                    >
                      {t("plan.reward", { value: item.rewardXp })}
                    </Text>
                  </View>
                </View>
                );
              })}
            </View>

            {!isPremium ? (
              <View
                style={[
                  styles.premiumCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.premiumTitle, { color: colors.text }]}>
                  {t("plan.premiumTitle")}
                </Text>
                <Text
                  style={[styles.premiumText, { color: colors.textSecondary }]}
                >
                  {t("plan.premiumText")}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {showPlanTour && activePlanTourStep ? (
        <GuidedTourOverlay
          visible={showPlanTour}
          icon={activePlanTourStep.icon}
          title={activePlanTourStep.title}
          description={activePlanTourStep.description}
          stepLabel={`Tour guiado • ${planTourStepIndex + 1}/${planTourSteps.length}`}
          accentColor={colors.accent}
          surfaceColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          textSecondaryColor={colors.textSecondary}
          targetRect={activePlanTourTarget}
          primaryLabel={activePlanTourStep.primaryLabel}
          onPrimary={() => {
            void handleAdvancePlanTour();
          }}
          secondaryLabel="Pular tour"
          onSecondary={() => {
            void handleSkipPlanTour();
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
    paddingBottom: 40,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  emptyButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  heroIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  goalText: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 6,
  },
  primaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  dayList: {
    gap: 12,
  },
  dayCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  dayTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  dayBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  dayStatusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dayStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  dayText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  taskList: {
    gap: 10,
    marginTop: 14,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  taskText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  taskValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  rewardPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 14,
  },
  rewardPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  premiumCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  premiumText: {
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
