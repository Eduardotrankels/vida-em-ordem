import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import { useAppLanguage } from "./utils/languageContext";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";
import {
  AI_EXPERIENCE_FEEDBACK_KEY,
  AI_JOURNEY_PROGRESS_KEY,
  AI_PLAN_KEY,
  AIExperienceEntry,
  AIJourneyProgress,
  LifeJourneyPlan,
  evaluateJourney,
  getLifeAreaMeta,
  normalizeJourneyProgress,
} from "./utils/lifeJourney";

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function getUi(language: string) {
  switch (language) {
    case "en":
      return {
        title: "Journey evolution",
        subtitle:
          "Track the AI reading, your pace, and what is already being prepared for the next day.",
        hero: "Your progress is taking shape",
        heroText:
          "The AI uses what you complete and what you share to make the next day more coherent with your real life.",
        emptyTitle: "Your evolution has not started yet",
        emptyText:
          "As soon as you complete the diagnosis and the first journey step, the AI reading will appear here.",
        createDiagnosis: "Create diagnosis",
        summary: "AI summary",
        analyzing: "AI analyzing",
        analyzingTitle: "The AI is programming the next day",
        analyzingText:
          "It has finished reading what you filled in and is now organizing the next step.",
        waiting: "Next release",
        waitingTitle: "The next day is already being prepared",
        waitingText:
          "The next tasks stay locked until midnight. This protects the pace of the journey.",
        countdown: "Time left to unlock the next day",
        openPlan: "Open 7-day plan",
        reflection: "Share your experience",
        reflectionTitle: "How did living today feel?",
        reflectionText:
          "Your response enters the AI analysis and helps calibrate the intensity and focus of the next day.",
        placeholder:
          "Briefly share how the day felt, what was heavier, or what worked better.",
        save: "Save today's reflection",
        latest: "Your latest reflection",
        latestEmpty:
          "When you share how your day felt, the AI starts considering that in the next tasks.",
        timeline: "Journey timeline",
        ratingRequiredTitle: "Choose a rating",
        ratingRequiredText:
          "Before saving, mark how your day felt so the AI can understand your experience better.",
        savedTitle: "Reflection saved",
        savedText:
          "The AI will consider this experience in the next journey reading.",
        day: (value: number) => `Day ${value}`,
        rating: (value: number) => `Rating ${value}/5`,
        xp: (value: number) => `${value} XP earned`,
        currentDay: (value: number) => `Current phase: Day ${value}`,
        completedDays: (value: number) => `${value} completed days`,
      };
    default:
      return {
        title: "Evolução da jornada",
        subtitle:
          "Acompanhe a leitura da IA, seu ritmo e o que já está sendo preparado para o próximo dia.",
        hero: "Sua evolução está ganhando forma",
        heroText:
          "A IA usa o que você conclui e o que você compartilha para deixar o próximo dia mais coerente com a sua vida real.",
        emptyTitle: "Sua evolução ainda não começou",
        emptyText:
          "Assim que você concluir o diagnóstico e a primeira etapa da jornada, a leitura da IA aparece aqui.",
        createDiagnosis: "Criar diagnóstico",
        summary: "Resumo da IA",
        analyzing: "IA analisando",
        analyzingTitle: "A IA está programando o próximo dia",
        analyzingText:
          "Ela terminou de ler o que você preencheu hoje e está organizando o próximo passo.",
        waiting: "Próxima liberação",
        waitingTitle: "O próximo dia já está sendo preparado",
        waitingText:
          "As próximas tarefas ficam bloqueadas até meia-noite. Isso protege o ritmo da jornada.",
        countdown: "Tempo restante para liberar o próximo dia",
        openPlan: "Ver plano de 7 dias",
        reflection: "Compartilhe sua experiência",
        reflectionTitle: "Como foi viver o dia de hoje?",
        reflectionText:
          "Sua resposta entra na análise da IA e ajuda a calibrar a intensidade e o foco do próximo dia.",
        placeholder:
          "Conte rapidamente como foi sua experiência hoje, o que pesou mais ou o que funcionou melhor.",
        save: "Salvar percepção do dia",
        latest: "Sua percepção mais recente",
        latestEmpty:
          "Quando você compartilhar como foi seu dia, a IA passa a considerar isso nas próximas tarefas.",
        timeline: "Linha da jornada",
        ratingRequiredTitle: "Escolha uma nota",
        ratingRequiredText:
          "Antes de salvar, marque como foi seu dia para a IA entender melhor sua experiência.",
        savedTitle: "Percepção salva",
        savedText:
          "A IA vai considerar essa experiência na próxima leitura da jornada.",
        day: (value: number) => `Dia ${value}`,
        rating: (value: number) => `Nota ${value}/5`,
        xp: (value: number) => `${value} XP acumulados`,
        currentDay: (value: number) => `Fase atual: Dia ${value}`,
        completedDays: (value: number) => `${value} dias concluídos`,
      };
  }
}

export default function EvolucaoIAScreen() {
  const { colors } = useAppTheme();
  const { language } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const ui = useMemo(() => getUi(language), [language]);
  const lifeAreaMeta = useMemo(() => getLifeAreaMeta(language), [language]);
  const [plan, setPlan] = useState<LifeJourneyPlan | null>(null);
  const [progress, setProgress] = useState<AIJourneyProgress>(
    normalizeJourneyProgress(null)
  );
  const [experienceEntries, setExperienceEntries] = useState<AIExperienceEntry[]>([]);
  const [experienceRating, setExperienceRating] = useState(0);
  const [experienceNote, setExperienceNote] = useState("");
  const [isSavingExperience, setIsSavingExperience] = useState(false);
  const [countdownNow, setCountdownNow] = useState(Date.now());

  const loadEvolution = useCallback(async () => {
    try {
      const [rawPlan, rawProgress, rawExperience] = await Promise.all([
        AsyncStorage.getItem(AI_PLAN_KEY),
        AsyncStorage.getItem(AI_JOURNEY_PROGRESS_KEY),
        AsyncStorage.getItem(AI_EXPERIENCE_FEEDBACK_KEY),
      ]);
      const evaluated = await evaluateJourney(
        rawPlan ? JSON.parse(rawPlan) : null,
        rawProgress ? JSON.parse(rawProgress) : null,
        language as any
      );
      if (evaluated.plan) {
        await Promise.all([
          AsyncStorage.setItem(AI_PLAN_KEY, JSON.stringify(evaluated.plan)),
          AsyncStorage.setItem(
            AI_JOURNEY_PROGRESS_KEY,
            JSON.stringify(evaluated.progress)
          ),
        ]);
      }
      const entries = rawExperience ? JSON.parse(rawExperience) : [];
      const normalizedEntries = Array.isArray(entries)
        ? [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [];
      setPlan(evaluated.plan);
      setProgress(evaluated.progress);
      setExperienceEntries(normalizedEntries);
      const reflectionDay =
        evaluated.progress.lastAnalyzedDay || evaluated.progress.currentDay || 1;
      const existingEntry = normalizedEntries.find(
        (entry) =>
          entry.day === reflectionDay &&
          entry.primaryArea === evaluated.plan?.primaryArea
      );
      setExperienceRating(existingEntry?.rating || 0);
      setExperienceNote(existingEntry?.note || "");
    } catch (error) {
      console.log("Erro ao carregar evolução da IA:", error);
      setPlan(null);
      setProgress(normalizeJourneyProgress(null));
      setExperienceEntries([]);
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      void loadEvolution();
    }, [loadEvolution])
  );

  useEffect(() => {
    if (!progress.nextDayUnlockAt && progress.analysisStatus !== "processing") {
      return;
    }
    const timer = setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [progress.analysisStatus, progress.nextDayUnlockAt]);

  const primaryMeta = useMemo(
    () => (plan ? lifeAreaMeta[plan.primaryArea] : null),
    [lifeAreaMeta, plan]
  );
  const waitingForNextRelease = Boolean(progress.nextDayUnlockAt);
  const isAnalyzingJourney =
    progress.analysisStatus === "processing" &&
    Boolean(progress.analysisCompletedAt) &&
    new Date(progress.analysisCompletedAt || 0).getTime() > countdownNow;
  const countdownLabel = useMemo(() => {
    if (!progress.nextDayUnlockAt) return null;
    return formatCountdown(
      new Date(progress.nextDayUnlockAt).getTime() - countdownNow
    );
  }, [countdownNow, progress.nextDayUnlockAt]);
  const latestExperienceEntry = experienceEntries[0] || null;

  const saveExperience = useCallback(async () => {
    if (!plan) return;
    if (experienceRating <= 0) {
      Alert.alert(ui.ratingRequiredTitle, ui.ratingRequiredText);
      return;
    }
    try {
      setIsSavingExperience(true);
      const reflectionDay =
        progress.lastAnalyzedDay || progress.currentDay || latestExperienceEntry?.day || 1;
      const nextEntry: AIExperienceEntry = {
        id: latestExperienceEntry?.id || `exp_${Date.now()}`,
        createdAt: new Date().toISOString(),
        rating: experienceRating,
        note: experienceNote.trim(),
        day: reflectionDay,
        primaryArea: plan.primaryArea,
      };
      const nextEntries = [
        nextEntry,
        ...experienceEntries.filter((entry) => entry.id !== nextEntry.id),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      await AsyncStorage.setItem(
        AI_EXPERIENCE_FEEDBACK_KEY,
        JSON.stringify(nextEntries)
      );
      Alert.alert(ui.savedTitle, ui.savedText);
      await loadEvolution();
    } catch (error) {
      console.log("Erro ao salvar experiência da jornada:", error);
      Alert.alert("Erro", "Não foi possível salvar sua percepção agora.");
    } finally {
      setIsSavingExperience(false);
    }
  }, [
    experienceEntries,
    experienceNote,
    experienceRating,
    latestExperienceEntry?.day,
    latestExperienceEntry?.id,
    loadEvolution,
    plan,
    progress.currentDay,
    progress.lastAnalyzedDay,
    ui,
  ]);

  if (!plan || !primaryMeta) {
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
            title={ui.title}
            subtitle={ui.subtitle}
            icon="analytics-outline"
          />
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {ui.emptyTitle}
            </Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {ui.emptyText}
            </Text>
            <Pressable
              style={[
                styles.primaryButton,
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
                  styles.primaryButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {ui.createDiagnosis}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          title={ui.title}
          subtitle={ui.subtitle}
          icon="analytics-outline"
          badgeLabel="IA"
          badgeTone="accent"
        />

        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.surface, borderColor: colors.accentBorder },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
                {primaryMeta.label}
              </Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                {ui.hero}
              </Text>
            </View>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Ionicons name={primaryMeta.icon} size={18} color={colors.accent} />
            </View>
          </View>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            {ui.heroText}
          </Text>
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.text }]}>
                {progress.totalXp}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {ui.xp(progress.totalXp)}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.text }]}>
                {progress.currentDay}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {ui.currentDay(progress.currentDay)}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.inlinePill,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.inlinePillText, { color: colors.textMuted }]}>
              {ui.completedDays(progress.completedDays.length)}
            </Text>
          </View>
        </View>

        {progress.latestFeedbackTitle ? (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
              {ui.summary}
            </Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {progress.latestFeedbackTitle}
            </Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {progress.latestFeedbackText}
            </Text>
          </View>
        ) : null}

        {isAnalyzingJourney || waitingForNextRelease ? (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, borderColor: colors.accentBorder },
            ]}
          >
            <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
              {isAnalyzingJourney ? ui.analyzing : ui.waiting}
            </Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {isAnalyzingJourney ? ui.analyzingTitle : ui.waitingTitle}
            </Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {isAnalyzingJourney ? ui.analyzingText : ui.waitingText}
            </Text>
            {countdownLabel ? (
              <Text style={[styles.countdownText, { color: colors.accent }]}>
                {ui.countdown}: {countdownLabel}
              </Text>
            ) : null}
            <Pressable
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              onPress={() => router.push("/plano-ia")}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                {ui.openPlan}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
            {ui.reflection}
          </Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {ui.reflectionTitle}
          </Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            {ui.reflectionText}
          </Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = experienceRating === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.ratingChip,
                    {
                      backgroundColor: active
                        ? colors.accentSoft
                        : colors.surfaceAlt,
                      borderColor: active
                        ? colors.accentBorder
                        : colors.border,
                    },
                  ]}
                  onPress={() => setExperienceRating(value)}
                >
                  <Text
                    style={[
                      styles.ratingChipText,
                      { color: active ? colors.accent : colors.textSecondary },
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={experienceNote}
            onChangeText={setExperienceNote}
            placeholder={ui.placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              styles.noteInput,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
                opacity: isSavingExperience ? 0.78 : 1,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={() => {
              void saveExperience();
            }}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {isSavingExperience ? `${ui.save}...` : ui.save}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
            {ui.latest}
          </Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            {latestExperienceEntry
              ? `${ui.rating(latestExperienceEntry.rating)}${
                  latestExperienceEntry.note ? ` • ${latestExperienceEntry.note}` : ""
                }`
              : ui.latestEmpty}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {ui.timeline}
        </Text>
        <View style={styles.timelineList}>
          {plan.journeyDays.map((day) => {
            const completed = progress.completedDays.includes(day.day);
            const available = progress.unlockedDays.includes(day.day);
            const hidden = !available;
            return (
              <View
                key={day.day}
                style={[
                  styles.timelineCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: completed
                      ? colors.accentBorder
                      : colors.border,
                    opacity: hidden ? 0.7 : 1,
                  },
                ]}
              >
                <View style={styles.timelineTopRow}>
                  <View
                    style={[
                      styles.timelineDayBadge,
                      {
                        backgroundColor: completed
                          ? colors.accentSoft
                          : colors.surfaceAlt,
                        borderColor: completed
                          ? colors.accentBorder
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timelineDayBadgeText,
                        { color: completed ? colors.accent : colors.textMuted },
                      ]}
                    >
                      {ui.day(day.day)}
                    </Text>
                  </View>
                  <Text style={[styles.timelineReward, { color: colors.textMuted }]}>
                    +{day.rewardXp} XP
                  </Text>
                </View>
                <Text style={[styles.timelineTitle, { color: colors.text }]}>
                  {day.title}
                </Text>
                <Text style={[styles.timelineText, { color: colors.textSecondary }]}>
                  {hidden ? ui.waitingText : day.summary}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTextWrap: { flex: 1 },
  heroEyebrow: { fontSize: 12, fontWeight: "800" },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  heroBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  statValue: { fontSize: 24, fontWeight: "900" },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 16,
  },
  inlinePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
  },
  inlinePillText: { fontSize: 11, fontWeight: "800" },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardEyebrow: { fontSize: 12, fontWeight: "800" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 12,
  },
  ratingRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  ratingChip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingChipText: { fontSize: 14, fontWeight: "900" },
  noteInput: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  primaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "900" },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  secondaryButtonText: { fontSize: 13, fontWeight: "800" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 12,
  },
  timelineList: { gap: 12 },
  timelineCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  timelineTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  timelineDayBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timelineDayBadgeText: { fontSize: 11, fontWeight: "900" },
  timelineReward: { fontSize: 11, fontWeight: "800" },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  timelineText: {
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
