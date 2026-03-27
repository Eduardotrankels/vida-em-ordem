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

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
    2,
    "0"
  );
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

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
  const [countdownNow, setCountdownNow] = useState(Date.now());
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
  const highestCompletedDay = useMemo(
    () =>
      progress.completedDays.length > 0
        ? progress.completedDays[progress.completedDays.length - 1]
        : 0,
    [progress.completedDays]
  );
  const pendingDayNumber = useMemo(() => {
    if (!plan || highestCompletedDay <= 0 || highestCompletedDay >= plan.journeyDays.length) {
      return null;
    }

    return highestCompletedDay + 1;
  }, [highestCompletedDay, plan]);
  const waitingForNextRelease = Boolean(
    progress.nextDayUnlockAt && pendingDayNumber
  );
  const isAnalyzingJourney =
    progress.analysisStatus === "processing" &&
    Boolean(progress.analysisCompletedAt) &&
    new Date(progress.analysisCompletedAt || 0).getTime() > countdownNow;
  const nextDayUnlockLabel = useMemo(() => {
    if (!progress.nextDayUnlockAt) {
      return null;
    }

    try {
      return new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(progress.nextDayUnlockAt));
    } catch {
      return progress.nextDayUnlockAt;
    }
  }, [language, progress.nextDayUnlockAt]);
  const countdownLabel = useMemo(() => {
    if (!progress.nextDayUnlockAt) {
      return null;
    }

    const remaining = new Date(progress.nextDayUnlockAt).getTime() - countdownNow;
    return formatCountdown(remaining);
  }, [countdownNow, progress.nextDayUnlockAt]);
  const releaseCopy = useMemo(
    () =>
      ({
        pt: {
          analyzingEyebrow: "IA analisando seu dia",
          analyzingTitle: "A IA está lendo o que você preencheu",
          analyzingText:
            "Sua base acabou de ser concluída. Agora a IA está cruzando as informações de todos os módulos para montar o próximo dia com mais coerência.",
          feedbackEyebrow: "Leitura da IA",
          unlockEyebrow: "Próximo dia em preparação",
          unlockTitle: (day: number) => `O Dia ${day} será liberado na próxima virada`,
          unlockText: (label: string) =>
            `Você já concluiu o dia atual. Agora a IA está analisando o que você preencheu e vai liberar o próximo passo a partir de ${label}.`,
          countdownLabel: (value: string) =>
            `Contagem para liberar o próximo dia: ${value}`,
          hiddenDayTitle: (day: number) => `Dia ${day} ainda protegido`,
          hiddenDayText:
            "As tarefas deste dia continuam ocultas. Elas só aparecem depois que o dia anterior for concluído e a meia-noite chegar.",
        },
        en: {
          analyzingEyebrow: "AI analyzing your day",
          analyzingTitle: "The AI is reading what you filled in",
          analyzingText:
            "Your base has just been completed. The AI is now crossing information from every module to build the next day with more coherence.",
          feedbackEyebrow: "AI reading",
          unlockEyebrow: "Next day in preparation",
          unlockTitle: (day: number) => `Day ${day} will unlock on the next rollover`,
          unlockText: (label: string) =>
            `You have already completed the current day. The AI is now analyzing what you filled in and will release the next step starting at ${label}.`,
          countdownLabel: (value: string) =>
            `Countdown to unlock the next day: ${value}`,
          hiddenDayTitle: (day: number) => `Day ${day} is still protected`,
          hiddenDayText:
            "The tasks for this day remain hidden. They only appear after the previous day is completed and midnight arrives.",
        },
        es: {
          analyzingEyebrow: "La IA analiza tu día",
          analyzingTitle: "La IA está leyendo lo que completaste",
          analyzingText:
            "Tu base acaba de ser concluida. Ahora la IA está cruzando la información de todos los módulos para montar el siguiente día con más coherencia.",
          feedbackEyebrow: "Lectura de la IA",
          unlockEyebrow: "Próximo día en preparación",
          unlockTitle: (day: number) => `El Día ${day} se liberará en el próximo cambio de día`,
          unlockText: (label: string) =>
            `Ya completaste el día actual. Ahora la IA está analizando lo que registraste y liberará el siguiente paso a partir de ${label}.`,
          countdownLabel: (value: string) =>
            `Cuenta regresiva para liberar el siguiente día: ${value}`,
          hiddenDayTitle: (day: number) => `El Día ${day} sigue protegido`,
          hiddenDayText:
            "Las tareas de este día siguen ocultas. Solo aparecen después de completar el día anterior y cuando llegue la medianoche.",
        },
        fr: {
          analyzingEyebrow: "L'IA analyse votre journée",
          analyzingTitle: "L'IA lit ce que vous avez rempli",
          analyzingText:
            "Votre base vient d'être complétée. L'IA croise maintenant les informations de tous les modules pour construire le jour suivant avec plus de cohérence.",
          feedbackEyebrow: "Lecture de l'IA",
          unlockEyebrow: "Jour suivant en préparation",
          unlockTitle: (day: number) => `Le Jour ${day} sera libéré au prochain passage à minuit`,
          unlockText: (label: string) =>
            `Vous avez déjà terminé le jour actuel. L'IA analyse maintenant ce que vous avez rempli et libérera l'étape suivante à partir de ${label}.`,
          countdownLabel: (value: string) =>
            `Compte à rebours avant le prochain jour : ${value}`,
          hiddenDayTitle: (day: number) => `Le Jour ${day} reste protégé`,
          hiddenDayText:
            "Les tâches de ce jour restent cachées. Elles n'apparaissent qu'après la fin du jour précédent et le passage de minuit.",
        },
        it: {
          analyzingEyebrow: "L'IA analizza la tua giornata",
          analyzingTitle: "L'IA sta leggendo ciò che hai compilato",
          analyzingText:
            "La tua base è appena stata completata. Ora l'IA sta incrociando le informazioni di tutti i moduli per costruire il giorno successivo con più coerenza.",
          feedbackEyebrow: "Lettura dell'IA",
          unlockEyebrow: "Prossimo giorno in preparazione",
          unlockTitle: (day: number) => `Il Giorno ${day} verrà sbloccato al prossimo cambio di giorno`,
          unlockText: (label: string) =>
            `Hai già completato il giorno attuale. Ora l'IA sta analizzando ciò che hai compilato e rilascerà il passo successivo a partire da ${label}.`,
          countdownLabel: (value: string) =>
            `Conto alla rovescia per sbloccare il prossimo giorno: ${value}`,
          hiddenDayTitle: (day: number) => `Il Giorno ${day} è ancora protetto`,
          hiddenDayText:
            "Le attività di questo giorno restano nascoste. Appaiono solo dopo aver concluso il giorno precedente e dopo la mezzanotte.",
        },
      })[language],
    [language]
  );
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

  useEffect(() => {
    if (!progress.nextDayUnlockAt && !isAnalyzingJourney) {
      return;
    }

    const intervalId = setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isAnalyzingJourney, progress.nextDayUnlockAt]);

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

            {progress.pendingFeedbackTitle || waitingForNextRelease || isAnalyzingJourney ? (
              <View
                style={[
                  styles.releaseCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <Text style={[styles.releaseEyebrow, { color: colors.accent }]}>
                  {isAnalyzingJourney
                    ? releaseCopy.analyzingEyebrow
                    : progress.pendingFeedbackTitle
                    ? releaseCopy.feedbackEyebrow
                    : releaseCopy.unlockEyebrow}
                </Text>
                <Text style={[styles.releaseTitle, { color: colors.text }]}>
                  {isAnalyzingJourney
                    ? releaseCopy.analyzingTitle
                    : progress.pendingFeedbackTitle ||
                    (pendingDayNumber
                      ? releaseCopy.unlockTitle(pendingDayNumber)
                      : "")}
                </Text>
                <Text
                  style={[styles.releaseText, { color: colors.textSecondary }]}
                >
                  {isAnalyzingJourney
                    ? releaseCopy.analyzingText
                    : progress.pendingFeedbackText ||
                    (pendingDayNumber && nextDayUnlockLabel
                      ? releaseCopy.unlockText(nextDayUnlockLabel)
                      : "")}
                </Text>
                {waitingForNextRelease && countdownLabel ? (
                  <Text style={[styles.releaseCountdown, { color: colors.accent }]}>
                    {releaseCopy.countdownLabel(countdownLabel)}
                  </Text>
                ) : null}
              </View>
            ) : null}

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
                const isLockedFutureDay = !unlocked;
                const shouldHideTasks = isLockedFutureDay;
                const lockedTitle =
                  pendingDayNumber === item.day
                    ? releaseCopy.unlockTitle(item.day)
                    : releaseCopy.hiddenDayTitle(item.day);
                const lockedText =
                  pendingDayNumber === item.day && nextDayUnlockLabel
                    ? releaseCopy.unlockText(nextDayUnlockLabel)
                    : releaseCopy.hiddenDayText;

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
                    {shouldHideTasks ? lockedTitle : item.title}
                  </Text>
                  <Text style={[styles.dayText, { color: colors.textSecondary }]}>
                    {shouldHideTasks ? lockedText : item.summary}
                  </Text>

                  {!shouldHideTasks ? (
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
                  ) : null}

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
  releaseCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  releaseEyebrow: {
    fontSize: 12,
    fontWeight: "800",
  },
  releaseTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },
  releaseText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  releaseCountdown: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 12,
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
