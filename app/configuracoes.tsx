import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import { LANGUAGE_OPTIONS } from "./utils/i18n";
import { useAppLanguage } from "./utils/languageContext";
import {
  AppTheme,
  CurrencyPreference,
  InactivityLockMinutes,
  RegionPreference,
} from "./utils/appTheme";
import {
  AI_JOURNEY_PROGRESS_KEY,
  AI_ONBOARDING_KEY,
  AI_PLAN_KEY,
} from "./utils/lifeJourney";
import {
  getCurrencyLabel,
  getCurrencyPreferenceOptions,
  getEffectiveCurrencyCode,
  getEffectiveRegionCode,
  getRegionLabel,
  getRegionPreferenceOptions,
} from "./utils/locale";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

const LOCK_OPTIONS: InactivityLockMinutes[] = [0, 1, 3, 5, 10];

export default function ConfiguracoesScreen() {
  const insets = useSafeAreaInsets();
  const { settings, colors, patchAppSettings } = useAppTheme();
  const { language, setLanguage, t } = useAppLanguage();
  const [planHydrated, setPlanHydrated] = useState(false);

  const lockOptions = useMemo(
    () =>
      LOCK_OPTIONS.map((value) => ({
        value,
        label: value === 0 ? t("config.lockDisabled") : `${value} min`,
      })),
    [t]
  );

  const regionOptions = useMemo(
    () => [
      {
        value: "auto" as RegionPreference,
        label: t("common.automatic"),
        description: t("config.regionAutoText"),
      },
      ...getRegionPreferenceOptions(language).map((option) => ({
        value: option.value,
        label: option.label,
        description: option.locale,
      })),
    ],
    [language, t]
  );

  const currencyOptions = useMemo(
    () => [
      {
        value: "auto" as CurrencyPreference,
        label: t("common.automatic"),
        description: t("config.currencyAutoText"),
      },
      ...getCurrencyPreferenceOptions(language).map((option) => ({
        value: option.value,
        label: option.code,
        description: option.label,
      })),
    ],
    [language, t]
  );

  const isPremium = settings.plan === "premium";
  const effectiveRegionCode = getEffectiveRegionCode(
    language,
    settings.regionPreference
  );
  const effectiveCurrencyCode = getEffectiveCurrencyCode(
    language,
    settings.regionPreference,
    settings.currencyPreference
  );
  const effectiveRegionLabel = getRegionLabel(effectiveRegionCode, language);
  const effectiveCurrencyLabel = `${effectiveCurrencyCode} • ${getCurrencyLabel(
    effectiveCurrencyCode,
    language
  )}`;

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const goToTour = useCallback(() => {
    router.push("/tour-app");
  }, []);

  const syncPlanFromStorage = useCallback(async () => {
    try {
      const planRaw = await AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY);
      const effectivePlan = planRaw === "premium" ? "premium" : "free";

      if (settings.plan !== effectivePlan) {
        await patchAppSettings({ plan: effectivePlan });
      }
    } catch (error) {
      console.log("Erro ao sincronizar plano nas configurações:", error);
    } finally {
      setPlanHydrated(true);
    }
  }, [patchAppSettings, settings.plan]);

  useFocusEffect(
    useCallback(() => {
      syncPlanFromStorage();
    }, [syncPlanFromStorage])
  );

  async function updateTheme(theme: AppTheme) {
    await patchAppSettings({ theme });
  }

  async function updateInactivityLock(
    inactivityLockMinutes: InactivityLockMinutes
  ) {
    await patchAppSettings({ inactivityLockMinutes });
  }

  async function updateRegionPreference(regionPreference: RegionPreference) {
    await patchAppSettings({ regionPreference });
  }

  async function updateCurrencyPreference(
    currencyPreference: CurrencyPreference
  ) {
    await patchAppSettings({ currencyPreference });
  }

  const handleRetakeDiagnosis = useCallback(() => {
    Alert.alert(
      t("config.retakeDiagnosisConfirmTitle"),
      t("config.retakeDiagnosisConfirmText"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("config.retakeDiagnosisConfirmAction"),
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                AI_ONBOARDING_KEY,
                AI_PLAN_KEY,
                AI_JOURNEY_PROGRESS_KEY,
              ]);
              router.replace("/onboarding-ia");
            } catch (error) {
              console.log("Erro ao refazer diagnóstico:", error);
            }
          },
        },
      ]
    );
  }, [t]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenContentBottomPadding(insets.bottom, "compact") },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          title={t("config.title")}
          subtitle={t("config.subtitle")}
          icon="settings-outline"
          badgeLabel={
            planHydrated
              ? isPremium
                ? t("common.premium")
                : t("common.free")
              : undefined
          }
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={planHydrated ? goToPremium : undefined}
        />

        {planHydrated && !isPremium ? (
          <View
            style={[
              styles.upgradeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text style={[styles.upgradeTitle, { color: colors.text }]}>
              {t("config.upgradeTitle")}
            </Text>
            <Text style={[styles.upgradeText, { color: colors.textSecondary }]}>
              {t("config.upgradeText")}
            </Text>
            <Pressable
              style={[
                styles.upgradeButton,
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
                  styles.upgradeButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {t("common.seePremiumPlan")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t("config.sectionAppearance")}
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("config.themeTitle")}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.textSecondary }]}
          >
            {t("config.themeDescription")}
          </Text>

          <View style={styles.optionRow}>
            <Pressable
              style={[
                styles.optionButton,
                styles.themeOptionButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
                settings.theme === "dark" && {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
              onPress={() => updateTheme("dark")}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  { color: colors.textMuted },
                  settings.theme === "dark" && { color: colors.accent },
                ]}
              >
                {t("config.themeDark")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.optionButton,
                styles.themeOptionButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
                settings.theme === "light" && {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
              onPress={() => updateTheme("light")}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  { color: colors.textMuted },
                  settings.theme === "light" && { color: colors.accent },
                ]}
              >
                {t("config.themeLight")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.optionButton,
                styles.themeOptionButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
                settings.theme === "system" && {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
              onPress={() => updateTheme("system")}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  { color: colors.textMuted },
                  settings.theme === "system" && { color: colors.accent },
                ]}
              >
                {t("config.themeSystem")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("config.languageTitle")}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.textSecondary }]}
          >
            {t("config.languageDescription")}
          </Text>

          <View style={styles.languageGrid}>
            {LANGUAGE_OPTIONS.map((option) => {
              const active = option.value === language;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.languageCard,
                    {
                      backgroundColor: active
                        ? colors.accentSoft
                        : colors.surfaceAlt,
                      borderColor: active ? colors.accentBorder : colors.border,
                    },
                  ]}
                  onPress={() => {
                    void setLanguage(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.languageCardTitle,
                      { color: active ? colors.accent : colors.text },
                    ]}
                  >
                    {option.nativeLabel}
                  </Text>
                  <Text
                    style={[
                      styles.languageCardText,
                      { color: active ? colors.accent : colors.textMuted },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("config.regionTitle")}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.textSecondary }]}
          >
            {t("config.regionDescription")}
          </Text>

          <View style={styles.languageGrid}>
            {regionOptions.map((option) => {
              const active = option.value === settings.regionPreference;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.languageCard,
                    {
                      backgroundColor: active
                        ? colors.accentSoft
                        : colors.surfaceAlt,
                      borderColor: active ? colors.accentBorder : colors.border,
                    },
                  ]}
                  onPress={() => {
                    void updateRegionPreference(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.languageCardTitle,
                      { color: active ? colors.accent : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.languageCardText,
                      { color: active ? colors.accent : colors.textMuted },
                    ]}
                  >
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("config.currencyTitle")}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.textSecondary }]}
          >
            {t("config.currencyDescription")}
          </Text>

          <View style={styles.languageGrid}>
            {currencyOptions.map((option) => {
              const active = option.value === settings.currencyPreference;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.languageCard,
                    {
                      backgroundColor: active
                        ? colors.accentSoft
                        : colors.surfaceAlt,
                      borderColor: active ? colors.accentBorder : colors.border,
                    },
                  ]}
                  onPress={() => {
                    void updateCurrencyPreference(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.languageCardTitle,
                      { color: active ? colors.accent : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.languageCardText,
                      { color: active ? colors.accent : colors.textMuted },
                    ]}
                  >
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t("config.sectionSecurity")}
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("config.lockTitle")}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.textSecondary }]}
          >
            {t("config.lockDescription")}
          </Text>

          <View style={styles.lockOptionsWrap}>
            {lockOptions.map((item) => {
              const active = settings.inactivityLockMinutes === item.value;

              return (
                <Pressable
                  key={item.value}
                  style={[
                    styles.lockOption,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                    active && {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accentBorder,
                    },
                  ]}
                  onPress={() => updateInactivityLock(item.value)}
                >
                <Text
                  style={[
                    styles.lockOptionText,
                      { color: colors.textMuted },
                      active && { color: colors.accent },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t("config.sectionJourney")}
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("config.journeyTitle")}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.textSecondary }]}
          >
            {t("config.journeyDescription")}
          </Text>

          <View style={styles.actionList}>
            <Pressable
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={goToTour}
            >
              <View
                style={[
                  styles.actionIconWrap,
                  {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <Ionicons
                  name="play-outline"
                  size={18}
                  color={colors.accent}
                />
              </View>

              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  {t("config.viewTourAgain")}
                </Text>
                <Text
                  style={[
                    styles.actionText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("config.viewTourText")}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            <Pressable
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleRetakeDiagnosis}
            >
              <View
                style={[
                  styles.actionIconWrap,
                  {
                    backgroundColor: colors.warningSoft,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={colors.warning}
                />
              </View>

              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  {t("config.retakeDiagnosis")}
                </Text>
                <Text
                  style={[
                    styles.actionText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("config.retakeDiagnosisText")}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t("config.sectionPlan")}
        </Text>

        {planHydrated ? (
          <View
            style={[
              styles.premiumCard,
              {
                backgroundColor: isPremium ? colors.successSoft : colors.surface,
                borderColor: isPremium ? colors.success : colors.accentBorder,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.premiumGlowLarge,
                {
                  backgroundColor: isPremium
                    ? colors.successSoft
                    : colors.accentSoft,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.premiumGlowSmall,
                {
                  backgroundColor: isPremium
                    ? colors.surfaceAlt
                    : colors.accentSoft,
                },
              ]}
            />

            <View style={styles.premiumTopRow}>
              <View style={styles.premiumIdentity}>
                <View
                  style={[
                    styles.premiumIconWrap,
                    {
                      backgroundColor: isPremium
                        ? colors.surface
                        : colors.accentSoft,
                      borderColor: isPremium ? colors.success : colors.accentBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={isPremium ? "sparkles-outline" : "diamond-outline"}
                    size={18}
                    color={isPremium ? colors.success : colors.accent}
                  />
                </View>

                <View style={styles.premiumLeft}>
                <Text style={[styles.premiumTitle, { color: colors.text }]}>
                  {isPremium ? t("common.planPremium") : t("common.planFree")}
                </Text>
                <Text
                  style={[
                    styles.premiumDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {isPremium
                    ? t("config.planPremiumText")
                    : t("config.planFreeText")}
                </Text>
                </View>
              </View>

              <View
                style={[
                  styles.planBadge,
                  {
                    backgroundColor: isPremium
                      ? colors.successSoft
                      : colors.accentSoft,
                    borderColor: isPremium ? colors.success : colors.accentBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.planBadgeText,
                    { color: isPremium ? colors.success : colors.accent },
                  ]}
                >
                  {isPremium ? t("common.premium") : t("common.free")}
                </Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.premiumButton,
                {
                  backgroundColor: isPremium ? colors.surface : colors.accent,
                  borderColor: isPremium ? colors.success : colors.accentButtonBorder,
                  shadowColor: colors.shadow,
                },
                !isPremium &&
                  colors.isWhiteAccentButton &&
                  styles.whiteAccentButton,
              ]}
              onPress={goToPremium}
            >
              <View style={styles.premiumButtonContent}>
                <View style={styles.premiumButtonTextWrap}>
                  <Text
                    style={[
                      styles.premiumButtonEyebrow,
                      {
                        color: isPremium ? colors.textMuted : colors.accentSoft,
                      },
                    ]}
                  >
                    {isPremium ? t("common.premium") : t("common.free")}
                  </Text>
                  <Text
                    style={[
                      styles.premiumButtonText,
                      {
                        color: isPremium ? colors.text : colors.accentButtonText,
                      },
                    ]}
                  >
                    {isPremium ? t("common.managePlan") : t("common.knowPremium")}
                  </Text>
                </View>

                <View
                  style={[
                    styles.premiumButtonArrow,
                    {
                      backgroundColor: isPremium
                        ? colors.successSoft
                        : colors.surface,
                      borderColor: isPremium ? colors.success : colors.accentBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={isPremium ? colors.success : colors.accent}
                  />
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.accent }]}>
            {t("config.summaryTitle")}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t("config.summaryTheme", {
              value:
                settings.theme === "system"
                  ? t("config.themeSystem")
                  : settings.theme === "dark"
                  ? t("config.themeDark")
                  : t("config.themeLight"),
            })}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t("config.summaryRegion", {
              value: effectiveRegionLabel,
            })}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t("config.summaryCurrency", {
              value: effectiveCurrencyLabel,
            })}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t("config.summaryLock", {
              value:
                settings.inactivityLockMinutes === 0
                  ? t("config.lockDisabled")
                  : `${settings.inactivityLockMinutes} min`,
            })}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t("config.summaryPlan", {
              value: isPremium ? t("common.premium") : t("common.free"),
            })}
          </Text>
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
    padding: 16,
    paddingBottom: 40,
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
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },

  planBadgeTopText: {
    fontSize: 12,
    fontWeight: "900",
  },

  title: {
    fontSize: 30,
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

  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 14,
  },

  optionRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },

  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  languageCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  languageCardTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  languageCardText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },

  optionButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },

  themeOptionButton: {
    minWidth: 92,
    flexBasis: "30%",
  },

  optionButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },

  lockOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  lockOption: {
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },

  lockOptionText: {
    fontSize: 13,
    fontWeight: "800",
  },

  actionList: {
    gap: 12,
  },

  actionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTextWrap: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  actionText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  premiumCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  premiumGlowLarge: {
    position: "absolute",
    top: -26,
    right: -8,
    width: 120,
    height: 120,
    borderRadius: 999,
    opacity: 0.85,
  },

  premiumGlowSmall: {
    position: "absolute",
    bottom: -34,
    left: -18,
    width: 96,
    height: 96,
    borderRadius: 999,
    opacity: 0.55,
  },

  premiumTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },

  premiumIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  premiumIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  premiumLeft: {
    flex: 1,
  },

  premiumTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  premiumDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },

  planBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  planBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  premiumButton: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },

  premiumButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  premiumButtonTextWrap: {
    flex: 1,
  },

  premiumButtonEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },

  premiumButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  premiumButtonArrow: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  infoCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },

  infoText: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
