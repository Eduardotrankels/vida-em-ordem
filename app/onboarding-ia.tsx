import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import VidaEmOrdemLogo from "../components/VidaEmOrdemLogo";
import { useAppLanguage } from "./utils/languageContext";
import { useAppTheme } from "./utils/themeContext";
import {
  AI_ONBOARDING_KEY,
  AI_PLAN_KEY,
  buildLifeJourneyPlan,
  getLifeAreaMeta,
  JourneyStyle,
  LifeArea,
} from "./utils/lifeJourney";

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

function getAreaQuestions(
  t: (key: string, params?: Record<string, string | number>) => string
): {
  key: LifeArea;
  title: string;
  subtitle: string;
}[] {
  return [
    {
      key: "financeiro",
      title: t("onboarding.question.finance.title"),
      subtitle: t("onboarding.question.finance.subtitle"),
    },
    {
      key: "saude",
      title: t("onboarding.question.health.title"),
      subtitle: t("onboarding.question.health.subtitle"),
    },
    {
      key: "tempo",
      title: t("onboarding.question.time.title"),
      subtitle: t("onboarding.question.time.subtitle"),
    },
    {
      key: "trabalho",
      title: t("onboarding.question.work.title"),
      subtitle: t("onboarding.question.work.subtitle"),
    },
    {
      key: "aprendizado",
      title: t("onboarding.question.learning.title"),
      subtitle: t("onboarding.question.learning.subtitle"),
    },
    {
      key: "habitos",
      title: t("onboarding.question.habits.title"),
      subtitle: t("onboarding.question.habits.subtitle"),
    },
    {
      key: "lazer",
      title: t("onboarding.question.leisure.title"),
      subtitle: t("onboarding.question.leisure.subtitle"),
    },
    {
      key: "espiritualidade",
      title: t("onboarding.question.spirituality.title"),
      subtitle: t("onboarding.question.spirituality.subtitle"),
    },
  ];
}

type OnboardingStep =
  | {
      type: "intro";
      title: string;
      subtitle: string;
      eyebrow: string;
      icon?: React.ComponentProps<typeof Ionicons>["name"];
      highlights?: string[];
    }
  | {
      type: "feature";
      title: string;
      subtitle: string;
      eyebrow: string;
      icon: React.ComponentProps<typeof Ionicons>["name"];
      highlights: string[];
      primaryLabel: string;
    }
  | {
      type: "score";
      area: LifeArea;
      title: string;
      subtitle: string;
      eyebrow: string;
    }
  | {
      type: "area";
      key: "concernArea" | "reliefArea";
      title: string;
      subtitle: string;
      eyebrow: string;
    }
  | {
      type: "style";
      title: string;
      subtitle: string;
      eyebrow: string;
    };

function getOnboardingSteps(
  t: (key: string, params?: Record<string, string | number>) => string,
  areaQuestions: ReturnType<typeof getAreaQuestions>
): OnboardingStep[] {
  return [
    {
      type: "intro",
      eyebrow: t("onboarding.intro.eyebrow"),
      title: t("onboarding.intro.title"),
      subtitle: t("onboarding.intro.subtitle"),
      icon: "sparkles-outline",
      highlights: [
        t("onboarding.intro.highlight1"),
        t("onboarding.intro.highlight2"),
        t("onboarding.intro.highlight3"),
      ],
    },
    ...areaQuestions.map(
    (question): OnboardingStep => ({
      type: "score",
      area: question.key,
      eyebrow: t("onboarding.diagnosis.eyebrow"),
      title: question.title,
      subtitle: question.subtitle,
    })
    ),
    {
      type: "area",
      key: "concernArea",
      eyebrow: t("onboarding.concern.eyebrow"),
      title: t("onboarding.concern.title"),
      subtitle: t("onboarding.concern.subtitle"),
    },
    {
      type: "area",
      key: "reliefArea",
      eyebrow: t("onboarding.relief.eyebrow"),
      title: t("onboarding.relief.title"),
      subtitle: t("onboarding.relief.subtitle"),
    },
    {
      type: "style",
      eyebrow: t("onboarding.style.eyebrow"),
      title: t("onboarding.style.title"),
      subtitle: t("onboarding.style.subtitle"),
    },
  ];
}

export default function OnboardingIAScreen() {
  const { language, t } = useAppLanguage();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const lifeAreaMeta = useMemo(() => getLifeAreaMeta(language), [language]);
  const areaQuestions = useMemo(() => getAreaQuestions(t), [t]);
  const steps = useMemo(() => getOnboardingSteps(t, areaQuestions), [areaQuestions, t]);
  const [scores, setScores] = useState<Record<LifeArea, number | null>>({
    financeiro: null,
    saude: null,
    tempo: null,
    trabalho: null,
    aprendizado: null,
    habitos: null,
    lazer: null,
    espiritualidade: null,
  });
  const [concernArea, setConcernArea] = useState<LifeArea | null>(null);
  const [reliefArea, setReliefArea] = useState<LifeArea | null>(null);
  const [startStyle, setStartStyle] = useState<JourneyStyle | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const stepAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const logoRevealAnim = useRef(new Animated.Value(0)).current;
  const logoGlowAnim = useRef(new Animated.Value(0)).current;
  const analyzingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = steps[stepIndex];
  const totalSteps = steps.length;
  const visualProgress = (stepIndex + 1) / totalSteps;
  const canGoBack = stepIndex > 0 && !isAnalyzing;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: visualProgress,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [progressAnim, stepAnim, visualProgress]);

  useEffect(() => {
    if (!isAnalyzing) return;

    logoRevealAnim.setValue(0);
    logoGlowAnim.setValue(0);

    Animated.parallel([
      Animated.timing(logoRevealAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoGlowAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(logoGlowAnim, {
            toValue: 0.35,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    analyzingTimerRef.current = setTimeout(() => {
      void persistAssessment();
    }, 1900);

    return () => {
      if (analyzingTimerRef.current) {
        clearTimeout(analyzingTimerRef.current);
      }
      logoGlowAnim.stopAnimation();
    };
  }, [isAnalyzing, logoGlowAnim, logoRevealAnim, persistAssessment]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const revealHeight = logoRevealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 164],
  });

  const glowScale = logoGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  function animateToNext(nextAction: () => void) {
    Animated.timing(stepAnim, {
      toValue: 0,
      duration: 190,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      nextAction();
      stepAnim.setValue(0);
    });
  }

  const persistAssessment = useCallback(async () => {
    const answers = {
      financeiro: scores.financeiro || 1,
      saude: scores.saude || 1,
      tempo: scores.tempo || 1,
      trabalho: scores.trabalho || 1,
      habitos: scores.habitos || 1,
      lazer: scores.lazer || 1,
      espiritualidade: scores.espiritualidade || 1,
      concernArea: concernArea || "financeiro",
      reliefArea: reliefArea || "tempo",
      startStyle: startStyle || "urgente",
      createdAt: new Date().toISOString(),
    };

    const plan = buildLifeJourneyPlan(answers, language);

    try {
      await AsyncStorage.multiSet([
        [AI_ONBOARDING_KEY, JSON.stringify(answers)],
        [AI_PLAN_KEY, JSON.stringify(plan)],
      ]);

      router.replace("/");
    } catch (error) {
      console.log("Erro ao salvar onboarding IA:", error);
      setIsAnalyzing(false);
      Alert.alert(t("common.error"), t("cadastro.saveError"));
    }
  }, [concernArea, language, reliefArea, scores, startStyle, t]);

  function goNext() {
    if (stepIndex >= totalSteps - 1) {
      setIsAnalyzing(true);
      return;
    }

    animateToNext(() => {
      setStepIndex((current) => current + 1);
    });
  }

  function goBack() {
    if (!canGoBack) return;

    animateToNext(() => {
      setStepIndex((current) => Math.max(0, current - 1));
    });
  }

  function handleScoreSelect(area: LifeArea, value: number) {
    setScores((current) => ({ ...current, [area]: value }));
    setTimeout(goNext, 140);
  }

  function handleAreaSelect(key: "concernArea" | "reliefArea", area: LifeArea) {
    if (key === "concernArea") {
      setConcernArea(area);
    } else {
      setReliefArea(area);
    }

    setTimeout(goNext, 140);
  }

  function handleStyleSelect(value: JourneyStyle) {
    setStartStyle(value);
    setTimeout(goNext, 140);
  }

  function renderFeaturePreview(icon: React.ComponentProps<typeof Ionicons>["name"]) {
    if (icon === "home-outline") {
      return (
        <View
          style={[
            styles.previewPhone,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.previewHeaderRow}>
            <View style={styles.previewAvatarBubble} />
            <View style={styles.previewHeaderTextWrap}>
              <View
                style={[
                  styles.previewLine,
                  styles.previewLineShort,
                  { backgroundColor: `${colors.accent}55` },
                ]}
              />
              <View
                style={[
                  styles.previewLine,
                  styles.previewLineMedium,
                  { backgroundColor: "rgba(255,255,255,0.12)" },
                ]}
              />
            </View>
            <View
              style={[
                styles.previewBadge,
                { backgroundColor: `${colors.accent}16`, borderColor: colors.accentBorder },
              ]}
            />
          </View>

          <View
            style={[
              styles.previewHeroCard,
              {
                backgroundColor: "rgba(255,255,255,0.04)",
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.previewLine,
                styles.previewLineShort,
                { backgroundColor: `${colors.accent}5A` },
              ]}
            />
            <View
              style={[
                styles.previewLine,
                styles.previewLineLong,
                { backgroundColor: "rgba(255,255,255,0.18)" },
              ]}
            />
            <View
              style={[
                styles.previewPillsRow,
              ]}
            >
              {[1, 2, 3].map((item) => (
                <View
                  key={item}
                  style={[
                    styles.previewPill,
                    {
                      backgroundColor: "rgba(255,255,255,0.05)",
                      borderColor: colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <View
              style={[
                styles.previewButton,
                { backgroundColor: colors.accent },
              ]}
            />
          </View>
        </View>
      );
    }

    if (icon === "map-outline") {
      return (
        <View
          style={[
            styles.previewPhone,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.previewJourneyTop,
              {
                backgroundColor: "rgba(255,255,255,0.04)",
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.previewLine,
                styles.previewLineMedium,
                { backgroundColor: `${colors.accent}50` },
              ]}
            />
            <View
              style={[
                styles.previewLine,
                styles.previewLineShort,
                { backgroundColor: "rgba(255,255,255,0.16)" },
              ]}
            />
          </View>

          {[1, 2, 3].map((item) => (
            <View
              key={item}
              style={[
                styles.previewJourneyDay,
                {
                  backgroundColor: item === 1 ? "rgba(37,99,235,0.12)" : "rgba(255,255,255,0.04)",
                  borderColor: item === 1 ? colors.accentBorder : colors.border,
                  opacity: item === 3 ? 0.62 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.previewDayBadge,
                  {
                    backgroundColor: item === 1 ? `${colors.accent}20` : "rgba(255,255,255,0.06)",
                    borderColor: item === 1 ? colors.accentBorder : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.previewDayBadgeText,
                    { color: item === 1 ? colors.accent : colors.textMuted },
                  ]}
                >
                  Dia {item}
                </Text>
              </View>
              <View
                style={[
                  styles.previewLine,
                  styles.previewLineLong,
                  { backgroundColor: "rgba(255,255,255,0.16)" },
                ]}
              />
              <View
                style={[
                  styles.previewLine,
                  styles.previewLineMedium,
                  { backgroundColor: "rgba(255,255,255,0.1)" },
                ]}
              />
            </View>
          ))}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.previewPhone,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.previewModuleGrid}>
          {[
            { iconName: "wallet-outline", label: lifeAreaMeta.financeiro.label },
            { iconName: "fitness-outline", label: lifeAreaMeta.saude.label },
            { iconName: "flame-outline", label: lifeAreaMeta.habitos.label },
            { iconName: "time-outline", label: lifeAreaMeta.tempo.label },
          ].map((item) => (
            <View
              key={item.label}
              style={[
                styles.previewModuleCard,
                {
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.previewModuleIconWrap,
                  {
                    backgroundColor: `${colors.accent}16`,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <Ionicons
                  name={item.iconName as React.ComponentProps<typeof Ionicons>["name"]}
                  size={16}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.previewModuleText, { color: colors.text }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderStepContent() {
    if (currentStep.type === "intro") {
      return (
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
            },
          ]}
        >
          <View
            style={[
              styles.heroOrb,
              { backgroundColor: `${colors.accent}22` },
            ]}
          />
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Ionicons
              name={currentStep.icon || "sparkles-outline"}
              size={22}
              color={colors.accent}
            />
          </View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {currentStep.eyebrow}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {currentStep.title}
          </Text>
          <Text style={[styles.heroText, { color: colors.textSecondary }]}>
            {currentStep.subtitle}
          </Text>

          <View style={styles.featurePreviewWrap}>
            {renderFeaturePreview(currentStep.icon || "sparkles-outline")}
          </View>

          {currentStep.highlights?.length ? (
            <View style={styles.highlightRow}>
              {currentStep.highlights.map((item) => (
                <View
                  key={item}
                  style={[
                    styles.highlightPill,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.highlightPillText, { color: colors.textSecondary }]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.heroMiniRow}>
            <View
              style={[
                styles.heroMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
                <Text style={[styles.heroMiniLabel, { color: colors.textMuted }]}>
                  {t("onboarding.intro.journeyLabel")}
                </Text>
                <Text style={[styles.heroMiniValue, { color: colors.text }]}>
                  {t("onboarding.intro.journeyValue")}
                </Text>
              </View>
            <View
              style={[
                styles.heroMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
                <Text style={[styles.heroMiniLabel, { color: colors.textMuted }]}>
                  {t("onboarding.intro.resultLabel")}
                </Text>
                <Text style={[styles.heroMiniValue, { color: colors.text }]}>
                  {t("onboarding.intro.resultValue")}
                </Text>
              </View>
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
            onPress={goNext}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {t("onboarding.startDiagnosis")}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (currentStep.type === "feature") {
      return (
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
            },
          ]}
        >
          <View
            style={[
              styles.heroOrb,
              { backgroundColor: `${colors.accent}20` },
            ]}
          />
          <View
            style={[
              styles.heroBadge,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Ionicons name={currentStep.icon} size={22} color={colors.accent} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {currentStep.eyebrow}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {currentStep.title}
          </Text>
          <Text style={[styles.heroText, { color: colors.textSecondary }]}>
            {currentStep.subtitle}
          </Text>

          <View style={styles.featurePreviewWrap}>
            {renderFeaturePreview(currentStep.icon)}
          </View>

          <View style={styles.featureList}>
            {currentStep.highlights.map((item) => (
              <View
                key={item}
                style={[
                  styles.featureRow,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureDot,
                    { backgroundColor: `${colors.accent}18`, borderColor: colors.accentBorder },
                  ]}
                >
                  <Ionicons
                    name="checkmark-outline"
                    size={14}
                    color={colors.accent}
                  />
                </View>
                <Text style={[styles.featureRowText, { color: colors.text }]}>
                  {item}
                </Text>
              </View>
            ))}
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
            onPress={goNext}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {currentStep.primaryLabel}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (currentStep.type === "score") {
      return (
        <View
          style={[
            styles.questionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {currentStep.eyebrow}
          </Text>
          <Text style={[styles.questionTitle, { color: colors.text }]}>
            {currentStep.title}
          </Text>
          <Text style={[styles.questionSubtitle, { color: colors.textSecondary }]}>
            {currentStep.subtitle}
          </Text>

          <View style={styles.scoreList}>
            {SCORE_OPTIONS.map((option) => {
              const selected = scores[currentStep.area] === option;

              return (
                <Pressable
                  key={option}
                  style={[
                    styles.scoreCard,
                    {
                      backgroundColor: selected
                        ? colors.accentSoft
                        : colors.surfaceAlt,
                      borderColor: selected
                        ? colors.accentBorder
                        : colors.border,
                    },
                  ]}
                  onPress={() => handleScoreSelect(currentStep.area, option)}
                >
                  <View
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor: selected
                          ? `${colors.accent}18`
                          : colors.background,
                        borderColor: selected
                          ? colors.accentBorder
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoreBadgeText,
                        { color: selected ? colors.accent : colors.text },
                      ]}
                    >
                      {option}
                    </Text>
                  </View>
                  <Text style={[styles.scoreLabel, { color: colors.text }]}>
                    {t(`onboarding.score.${option}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (currentStep.type === "area") {
      const selectedValue =
        currentStep.key === "concernArea" ? concernArea : reliefArea;

      return (
        <View
          style={[
            styles.questionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {currentStep.eyebrow}
          </Text>
          <Text style={[styles.questionTitle, { color: colors.text }]}>
            {currentStep.title}
          </Text>
          <Text style={[styles.questionSubtitle, { color: colors.textSecondary }]}>
            {currentStep.subtitle}
          </Text>

          <View style={styles.areaList}>
            {(Object.keys(lifeAreaMeta) as LifeArea[]).map((area) => {
              const selected = selectedValue === area;
              const meta = lifeAreaMeta[area];

              return (
                <Pressable
                  key={area}
                  style={[
                    styles.areaCard,
                    {
                      backgroundColor: selected
                        ? colors.accentSoft
                        : colors.surfaceAlt,
                      borderColor: selected
                        ? colors.accentBorder
                        : colors.border,
                    },
                  ]}
                  onPress={() => handleAreaSelect(currentStep.key, area)}
                >
                  <View
                    style={[
                      styles.areaIconWrap,
                      {
                        backgroundColor: selected
                          ? `${colors.accent}18`
                          : colors.background,
                        borderColor: selected
                          ? colors.accentBorder
                          : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={meta.icon}
                      size={18}
                      color={selected ? colors.accent : colors.textMuted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.areaCardText,
                      { color: selected ? colors.accent : colors.text },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.questionCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.accent }]}>
          {currentStep.eyebrow}
        </Text>
        <Text style={[styles.questionTitle, { color: colors.text }]}>
          {currentStep.title}
        </Text>
        <Text style={[styles.questionSubtitle, { color: colors.textSecondary }]}>
          {currentStep.subtitle}
        </Text>

        <View style={styles.styleList}>
          <Pressable
            style={[
              styles.styleCard,
              {
                backgroundColor:
                  startStyle === "facil" ? colors.accentSoft : colors.surfaceAlt,
                borderColor:
                  startStyle === "facil" ? colors.accentBorder : colors.border,
              },
            ]}
            onPress={() => handleStyleSelect("facil")}
          >
            <Ionicons
              name="leaf-outline"
              size={20}
              color={startStyle === "facil" ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.styleTitle, { color: colors.text }]}>
              {t("onboarding.style.easyTitle")}
            </Text>
            <Text style={[styles.styleText, { color: colors.textSecondary }]}>
              {t("onboarding.style.easyText")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.styleCard,
              {
                backgroundColor:
                  startStyle === "urgente"
                    ? colors.accentSoft
                    : colors.surfaceAlt,
                borderColor:
                  startStyle === "urgente"
                    ? colors.accentBorder
                    : colors.border,
              },
            ]}
            onPress={() => handleStyleSelect("urgente")}
          >
            <Ionicons
              name="flash-outline"
              size={20}
              color={startStyle === "urgente" ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.styleTitle, { color: colors.text }]}>
              {t("onboarding.style.urgentTitle")}
            </Text>
            <Text style={[styles.styleText, { color: colors.textSecondary }]}>
              {t("onboarding.style.urgentText")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isAnalyzing) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.analysisWrap}>
          <Animated.View
            style={[
              styles.analysisGlow,
              {
                backgroundColor: `${colors.accent}18`,
                borderColor: `${colors.accent}30`,
                transform: [{ scale: glowScale }],
                opacity: logoGlowAnim,
              },
            ]}
          />

          <View
            style={[
              styles.analysisLogoFrame,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.analysisLogoReveal,
                {
                  height: revealHeight,
                },
              ]}
            >
              <VidaEmOrdemLogo size={164} />
            </Animated.View>
          </View>

          <Text style={[styles.analysisTitle, { color: colors.text }]}>
            {t("onboarding.analyzingTitle")}
          </Text>
          <Text style={[styles.analysisText, { color: colors.textSecondary }]}>
            {t("onboarding.analyzingText")}
          </Text>

          <View
            style={[
              styles.analysisTrack,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.analysisFill,
                {
                  width: progressWidth,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 18, 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressSection}>
          <View style={styles.progressTopRow}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
              {stepIndex === 0
                ? t("onboarding.progress.welcome")
                : t("onboarding.progress.question", {
                    current: stepIndex,
                    total: totalSteps - 1,
                  })}
            </Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {Math.round(visualProgress * 100)}%
            </Text>
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
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressWidth,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        </View>

        <Animated.View
          style={[
            styles.stepWrap,
            {
              opacity: stepAnim,
              transform: [
                {
                  translateX: stepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [26, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {renderStepContent()}
        </Animated.View>

        {canGoBack ? (
          <Pressable
            style={[
              styles.backButton,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
            onPress={goBack}
          >
            <Ionicons
              name="arrow-back-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.backButtonText, { color: colors.textSecondary }]}
            >
              {t("common.back")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  progressSection: {
    marginBottom: 18,
  },
  progressTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "900",
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  stepWrap: {
    minHeight: 1,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    overflow: "hidden",
  },
  heroOrb: {
    position: "absolute",
    top: -48,
    right: -28,
    width: 180,
    height: 180,
    borderRadius: 999,
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 12,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  heroMiniRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  featurePreviewWrap: {
    marginTop: 20,
    marginBottom: 2,
  },
  previewPhone: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 14,
    minHeight: 176,
    overflow: "hidden",
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  previewAvatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.4)",
  },
  previewHeaderTextWrap: {
    flex: 1,
    gap: 6,
  },
  previewLine: {
    borderRadius: 999,
    height: 10,
  },
  previewLineShort: {
    width: "32%",
  },
  previewLineMedium: {
    width: "52%",
  },
  previewLineLong: {
    width: "78%",
  },
  previewBadge: {
    width: 44,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
  },
  previewHeroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  previewPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  previewPill: {
    flex: 1,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
  },
  previewButton: {
    height: 44,
    borderRadius: 16,
    marginTop: 6,
  },
  previewJourneyTop: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  previewJourneyDay: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginTop: 10,
  },
  previewDayBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewDayBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  previewModuleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  previewModuleCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "flex-start",
    gap: 10,
  },
  previewModuleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewModuleText: {
    fontSize: 13,
    fontWeight: "800",
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
  highlightPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  highlightPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  heroMiniCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  heroMiniLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroMiniValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 8,
  },
  questionCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
  },
  featureList: {
    gap: 10,
    marginTop: 18,
  },
  featureRow: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  featureRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 12,
  },
  questionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  scoreList: {
    gap: 12,
    marginTop: 22,
  },
  scoreCard: {
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  scoreBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeText: {
    fontSize: 18,
    fontWeight: "900",
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  areaList: {
    gap: 12,
    marginTop: 22,
  },
  areaCard: {
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  areaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  areaCardText: {
    fontSize: 15,
    fontWeight: "800",
  },
  styleList: {
    gap: 12,
    marginTop: 22,
  },
  styleCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  styleTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
  },
  styleText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },
  backButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  analysisWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  analysisGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 999,
    borderWidth: 1,
  },
  analysisLogoFrame: {
    width: 164,
    height: 164,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    marginBottom: 26,
  },
  analysisLogoReveal: {
    width: 164,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  analysisTitle: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 30,
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 12,
  },
  analysisTrack: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 22,
  },
  analysisFill: {
    height: "100%",
    borderRadius: 999,
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
