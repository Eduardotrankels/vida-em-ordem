import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { completeAppIntroTour } from "./utils/appIntroTour";
import { useAppLanguage } from "./utils/languageContext";
import { useAppTheme } from "./utils/themeContext";

type TourSlide = {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  bullets: string[];
  type: "home" | "journey" | "modules";
};

function ScaleButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.timing(scale, {
      toValue: 0.985,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  function pressOut() {
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function TourAppScreen() {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const stepAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1 / 3)).current;

  const slides = useMemo<TourSlide[]>(
    () => [
      {
        eyebrow: t("tourApp.slide1.eyebrow"),
        title: t("tourApp.slide1.title"),
        description: t("tourApp.slide1.description"),
        icon: "home-outline",
        bullets: [
          t("tourApp.slide1.bullet1"),
          t("tourApp.slide1.bullet2"),
          t("tourApp.slide1.bullet3"),
        ],
        type: "home",
      },
      {
        eyebrow: t("tourApp.slide2.eyebrow"),
        title: t("tourApp.slide2.title"),
        description: t("tourApp.slide2.description"),
        icon: "sparkles-outline",
        bullets: [
          t("tourApp.slide2.bullet1"),
          t("tourApp.slide2.bullet2"),
          t("tourApp.slide2.bullet3"),
        ],
        type: "journey",
      },
      {
        eyebrow: t("tourApp.slide3.eyebrow"),
        title: t("tourApp.slide3.title"),
        description: t("tourApp.slide3.description"),
        icon: "grid-outline",
        bullets: [
          t("tourApp.slide3.bullet1"),
          t("tourApp.slide3.bullet2"),
          t("tourApp.slide3.bullet3"),
          t("tourApp.slide3.bullet4"),
        ],
        type: "modules",
      },
    ],
    [t]
  );

  const currentSlide = slides[stepIndex];
  const progress = (stepIndex + 1) / slides.length;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [progress, progressAnim, stepAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  function animateStep(nextAction: () => void) {
    Animated.timing(stepAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      nextAction();
      stepAnim.setValue(0);
    });
  }

  async function finishTour() {
    await completeAppIntroTour();
    router.back();
  }

  function handleNext() {
    if (stepIndex >= slides.length - 1) {
      void finishTour();
      return;
    }

    animateStep(() => {
      setStepIndex((current) => current + 1);
    });
  }

  function handleBack() {
    if (stepIndex <= 0) {
      router.back();
      return;
    }

    animateStep(() => {
      setStepIndex((current) => current - 1);
    });
  }

  function renderMockup() {
    if (currentSlide.type === "home") {
      return (
        <View style={[styles.mockupFrame, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={styles.mockupHeaderRow}>
            <View style={[styles.mockupAvatar, { backgroundColor: `${colors.accent}35` }]} />
            <View style={styles.mockupHeaderText}>
              <View style={[styles.mockupLine, styles.mockupLineShort, { backgroundColor: `${colors.accent}66` }]} />
              <View style={[styles.mockupLine, styles.mockupLineMedium, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
            </View>
            <View style={[styles.mockupChip, { backgroundColor: `${colors.accent}14`, borderColor: colors.accentBorder }]} />
          </View>
          <View style={[styles.mockupHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.mockupLine, styles.mockupLineShort, { backgroundColor: `${colors.accent}55` }]} />
            <View style={[styles.mockupLine, styles.mockupLineLong, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
            <View style={styles.mockupMetricRow}>
              <View style={[styles.mockupMetricCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: colors.border }]} />
              <View style={[styles.mockupMetricCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: colors.border }]} />
            </View>
          </View>
        </View>
      );
    }

    if (currentSlide.type === "journey") {
      return (
        <View style={[styles.mockupFrame, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={[styles.mockupJourneyTop, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.mockupLine, styles.mockupLineMedium, { backgroundColor: `${colors.accent}55` }]} />
            <View style={[styles.mockupLine, styles.mockupLineShort, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
          </View>
          {[1, 2, 3].map((day) => (
            <View
              key={day}
              style={[
                styles.mockupJourneyDay,
                {
                  backgroundColor: day === 1 ? `${colors.accent}12` : "rgba(255,255,255,0.04)",
                  borderColor: day === 1 ? colors.accentBorder : colors.border,
                  opacity: day === 3 ? 0.62 : 1,
                },
              ]}
            >
              <View style={[styles.mockupDayBadge, { backgroundColor: day === 1 ? `${colors.accent}16` : "rgba(255,255,255,0.05)", borderColor: day === 1 ? colors.accentBorder : colors.border }]}>
                <Text style={[styles.mockupDayBadgeText, { color: day === 1 ? colors.accent : colors.textMuted }]}>
                  {t("plan.day", { value: day })}
                </Text>
              </View>
              <View style={[styles.mockupLine, styles.mockupLineLong, { backgroundColor: "rgba(255,255,255,0.16)" }]} />
              <View style={[styles.mockupLine, styles.mockupLineMedium, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={[styles.mockupFrame, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={styles.mockupModulesGrid}>
          {[
            { icon: "wallet-outline", label: t("tourApp.slide3.bullet1") },
            { icon: "fitness-outline", label: t("tourApp.slide3.bullet2") },
            { icon: "flame-outline", label: t("tourApp.slide3.bullet3") },
            { icon: "time-outline", label: t("tourApp.slide3.bullet4") },
          ].map((item) => (
            <View
              key={item.label}
              style={[
                styles.mockupModuleCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.mockupModuleIcon,
                  { backgroundColor: `${colors.accent}16`, borderColor: colors.accentBorder },
                ]}
              >
                <Ionicons name={item.icon as React.ComponentProps<typeof Ionicons>["name"]} size={18} color={colors.accent} />
              </View>
              <Text style={[styles.mockupModuleText, { color: colors.text }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 22, 34) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            {t("tourApp.progressLabel")}
          </Text>
          <Text style={[styles.progressValue, { color: colors.text }]}>
            {stepIndex + 1}/{slides.length}
          </Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.accent }]} />
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
              opacity: stepAnim,
              transform: [
                {
                  translateX: stepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder }]}>
            <Ionicons name={currentSlide.icon} size={22} color={colors.accent} />
          </View>

          <Text style={[styles.eyebrow, { color: colors.accent }]}>{currentSlide.eyebrow}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{currentSlide.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{currentSlide.description}</Text>

          <View style={styles.mockupWrap}>{renderMockup()}</View>

          <View style={styles.bulletsWrap}>
            {currentSlide.bullets.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <ScaleButton onPress={handleNext}>
            <View style={[styles.primaryButton, { backgroundColor: colors.accent, borderColor: colors.accentBorder }]}>
              <Text style={[styles.primaryButtonText, { color: colors.accentContrast }]}>
                {stepIndex === slides.length - 1
                  ? t("common.finishTour")
                  : t("common.continue")}
              </Text>
            </View>
          </ScaleButton>

          <ScaleButton onPress={handleBack}>
            <View style={[styles.secondaryButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                {stepIndex === 0 ? t("common.backHome") : t("common.back")}
              </Text>
            </View>
          </ScaleButton>
        </View>
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
    paddingTop: 14,
  },
  progressHeader: {
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
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    marginTop: 18,
  },
  iconBadge: {
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
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  mockupWrap: {
    marginTop: 22,
  },
  mockupFrame: {
    minHeight: 212,
    borderRadius: 26,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
  },
  mockupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  mockupAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
  },
  mockupHeaderText: {
    flex: 1,
    gap: 6,
  },
  mockupLine: {
    height: 10,
    borderRadius: 999,
  },
  mockupLineShort: {
    width: "32%",
  },
  mockupLineMedium: {
    width: "54%",
  },
  mockupLineLong: {
    width: "76%",
  },
  mockupChip: {
    width: 44,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
  },
  mockupHero: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  mockupMetricRow: {
    flexDirection: "row",
    gap: 10,
  },
  mockupMetricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    height: 72,
  },
  mockupJourneyTop: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  mockupJourneyDay: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginTop: 10,
  },
  mockupDayBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mockupDayBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  mockupModulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  mockupModuleCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    gap: 12,
  },
  mockupModuleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mockupModuleText: {
    fontSize: 14,
    fontWeight: "800",
  },
  bulletsWrap: {
    gap: 10,
    marginTop: 20,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    marginTop: 5,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  actions: {
    gap: 12,
    marginTop: 18,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
