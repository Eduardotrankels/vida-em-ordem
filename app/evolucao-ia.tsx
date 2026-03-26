import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import { useAppLanguage } from "./utils/languageContext";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";
import {
  AI_JOURNEY_PROGRESS_KEY,
  AI_PLAN_KEY,
  AIJourneyProgress,
  evaluateJourney,
  LifeJourneyPlan,
  getLifeAreaMeta,
  normalizeJourneyProgress,
} from "./utils/lifeJourney";

export default function EvolucaoIAScreen() {
  const { colors, settings } = useAppTheme();
  const { language, t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const lifeAreaMeta = useMemo(() => getLifeAreaMeta(language), [language]);
  const [plan, setPlan] = useState<LifeJourneyPlan | null>(null);
  const [progress, setProgress] = useState<AIJourneyProgress>(
    normalizeJourneyProgress(null)
  );

  const loadEvolution = useCallback(async () => {
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
    } catch (error) {
      console.log("Erro ao carregar evolução IA:", error);
      setPlan(null);
      setProgress(normalizeJourneyProgress(null));
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadEvolution();
    }, [loadEvolution])
  );

  const isPremium = settings.plan === "premium";
  const completedDays = progress.completedDays.length;
  const totalDays = plan?.journeyDays.length || 7;
  const progressPercent = Math.round((completedDays / Math.max(totalDays, 1)) * 100);
  const primaryMeta = useMemo(
    () => (plan ? lifeAreaMeta[plan.primaryArea] : null),
    [lifeAreaMeta, plan]
  );

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
          title={t("evolution.title")}
          subtitle={t("evolution.subtitle")}
          icon="trending-up-outline"
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
              {t("evolution.emptyTitle")}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("evolution.emptyText")}
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
                  {t("evolution.createRoute")}
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
                    {t("evolution.area")}
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

              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {completedDays}/{totalDays}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                    {t("evolution.daysCompleted")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {progress.totalXp}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                    {t("evolution.xpGained")}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(progressPercent, 4)}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.progressText, { color: colors.accent }]}>
                {t("evolution.progress", { value: progressPercent })}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("evolution.sectionTitle")}
            </Text>

            <View style={styles.timelineList}>
              {plan.journeyDays.map((day) => {
                const completed = progress.completedDays.includes(day.day);
                const unlocked = progress.unlockedDays.includes(day.day);

                return (
                  <View
                    key={day.day}
                    style={[
                      styles.timelineCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: completed
                          ? colors.success
                          : colors.border,
                        opacity: unlocked ? 1 : 0.72,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.timelineBadge,
                        {
                          backgroundColor: completed
                            ? colors.successSoft
                            : colors.surfaceAlt,
                          borderColor: completed
                            ? colors.success
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timelineBadgeText,
                          {
                            color: completed
                              ? colors.success
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {t("plan.day", { value: day.day })}
                      </Text>
                    </View>

                    <View style={styles.timelineTextWrap}>
                      <Text style={[styles.timelineTitle, { color: colors.text }]}>
                        {day.title}
                      </Text>
                      <Text
                        style={[
                          styles.timelineText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {completed
                          ? t("evolution.timeline.completed")
                          : unlocked
                            ? t("evolution.timeline.available")
                            : t("evolution.timeline.locked")}
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
                  {t("evolution.premiumTitle")}
                </Text>
                <Text
                  style={[styles.premiumText, { color: colors.textSecondary }]}
                >
                  {t("evolution.premiumText")}
                </Text>
              </View>
            ) : null}
          </>
        )}
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  progressTrack: {
    marginTop: 16,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  timelineList: {
    gap: 12,
  },
  timelineCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  timelineBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  timelineBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  timelineText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
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
