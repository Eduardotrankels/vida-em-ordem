import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import JourneyInsightCard from "../components/JourneyInsightCard";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "./utils/appTheme";
import {
  AIJourneyProgress,
  LifeJourneyPlan,
  normalizeJourneyProgress,
} from "./utils/lifeJourney";
import {
  buildModuleJourneyStatusCard,
  loadJourneyState,
} from "./utils/journeyModuleStatus";
import { useAppLanguage } from "./utils/languageContext";
import { formatDateByLanguage } from "./utils/locale";

type SubscriptionPlan = "free" | "premium";

type SpiritualEntry = {
  id: string;
  dateKey: string;
  prayed: boolean;
  gratitude: string;
  reflection: string;
  createdAt: string;
};

const STORAGE_KEY = "@vida_em_ordem_spiritual_v1";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";
const FREE_HISTORY_LIMIT = 7;

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getStreak(entries: SpiritualEntry[]) {
  const sorted = [...entries].sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  let streak = 0;
  let date = new Date();

  while (true) {
    const key = todayKey(date);
    const found = sorted.find((e) => e.dateKey === key);

    if (!found) break;

    streak++;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

export default function EspiritualidadeScreen() {
  const { language } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<SpiritualEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [journeyPlan, setJourneyPlan] = useState<LifeJourneyPlan | null>(null);
  const [journeyProgress, setJourneyProgress] = useState<AIJourneyProgress>(() =>
    normalizeJourneyProgress(null)
  );
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  const [prayed, setPrayed] = useState(false);
  const [gratitude, setGratitude] = useState("");
  const [reflection, setReflection] = useState("");

  const isPremium = plan === "premium";

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const loadEntries = useCallback(async () => {
    try {
      const [rawEntries, rawSettings, planRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
      ]);
      const journeyState = await loadJourneyState(language);

      const parsedEntries = rawEntries ? JSON.parse(rawEntries) : [];
      const parsedSettings = rawSettings
        ? JSON.parse(rawSettings)
        : DEFAULT_SETTINGS;

      const effectivePlan: SubscriptionPlan =
        planRaw === "premium" || parsedSettings?.plan === "premium"
          ? "premium"
          : "free";

      setEntries(Array.isArray(parsedEntries) ? parsedEntries : []);
      setPlan(effectivePlan);
      setJourneyPlan(journeyState.plan);
      setJourneyProgress(journeyState.progress);
      setSettings({
        theme:
          parsedSettings?.theme === "light" ||
          parsedSettings?.theme === "system"
            ? parsedSettings.theme
            : "dark",
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
        regionPreference:
          parsedSettings?.regionPreference || DEFAULT_SETTINGS.regionPreference,
        currencyPreference:
          parsedSettings?.currencyPreference ||
          DEFAULT_SETTINGS.currencyPreference,
      });
    } catch (error) {
      console.log("Erro ao carregar espiritualidade:", error);
      Alert.alert("Erro", "Não foi possível carregar seus dados de espiritualidade.");
      setJourneyPlan(null);
      setJourneyProgress(normalizeJourneyProgress(null));
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const saveEntries = useCallback(async (next: SpiritualEntry[]) => {
    try {
      setEntries(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Erro ao salvar espiritualidade:", error);
      Alert.alert("Erro", "Não foi possível salvar o check-in espiritual.");
    }
  }, []);

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings.theme, settings.accentColor]
  );
  const moduleJourneyStatusCard = useMemo(
    () =>
      buildModuleJourneyStatusCard(
        "espiritualidade",
        journeyPlan,
        journeyProgress,
        language,
        countdownNow
      ),
    [journeyPlan, journeyProgress, language, countdownNow]
  );
  const formatDate = useCallback(
    (dateKey: string) =>
      formatDateByLanguage(dateKey, language, undefined, "--"),
    [language]
  );

  useEffect(() => {
    if (!journeyProgress.nextDayUnlockAt) return;

    setCountdownNow(Date.now());
    const interval = setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [journeyProgress.nextDayUnlockAt]);

  const todayEntry = useMemo(() => {
    const today = todayKey();
    return entries.find((e) => e.dateKey === today) ?? null;
  }, [entries]);

  const streak = useMemo(() => getStreak(entries), [entries]);

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return isPremium ? sorted : sorted.slice(0, FREE_HISTORY_LIMIT);
  }, [entries, isPremium]);

  const saveEntry = useCallback(async () => {
    const today = todayKey();

    const entry: SpiritualEntry = {
      id: todayEntry?.id ?? uid(),
      dateKey: today,
      prayed,
      gratitude: gratitude.trim(),
      reflection: reflection.trim(),
      createdAt: todayEntry?.createdAt ?? new Date().toISOString(),
    };

    const next = [entry, ...entries.filter((e) => e.dateKey !== today)];

    await saveEntries(next);

    setModalOpen(false);

    Alert.alert("Registrado 🙏", "Seu check-in espiritual foi salvo.");
  }, [todayEntry, prayed, gratitude, reflection, entries, saveEntries]);

  const openModal = useCallback(() => {
    if (todayEntry) {
      setPrayed(todayEntry.prayed);
      setGratitude(todayEntry.gratitude);
      setReflection(todayEntry.reflection);
    } else {
      setPrayed(false);
      setGratitude("");
      setReflection("");
    }

    setModalOpen(true);
  }, [todayEntry]);

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
          title="Espiritualidade"
          subtitle="Fortaleça sua mente, sua fé e sua gratidão diariamente."
          icon="sparkles-outline"
          badgeLabel={isPremium ? "Premium" : "Free"}
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={goToPremium}
        />

        {moduleJourneyStatusCard ? (
          <JourneyInsightCard
            eyebrow={moduleJourneyStatusCard.eyebrow}
            title={moduleJourneyStatusCard.title}
            text={moduleJourneyStatusCard.text}
            iconName={moduleJourneyStatusCard.iconName}
            accentColor={colors.accent}
            accentSoft={colors.accentSoft}
            accentBorder={colors.accentBorder}
            surfaceColor={colors.surface}
            borderColor={colors.border}
            textColor={colors.text}
            textSecondaryColor={colors.textSecondary}
            buttonBackground={colors.accentButtonBackground}
            buttonBorder={colors.accentButtonBorder}
            buttonTextColor={colors.accentButtonText}
            isWhiteAccentButton={colors.isWhiteAccentButton}
            timerLabel={moduleJourneyStatusCard.timerLabel}
            timerValue={moduleJourneyStatusCard.timerValue}
            actionLabel={moduleJourneyStatusCard.actionLabel}
            onAction={
              moduleJourneyStatusCard.actionRoute
                ? () => router.push(moduleJourneyStatusCard.actionRoute as never)
                : undefined
            }
          />
        ) : null}

        {!isPremium ? (
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
              Desbloqueie o Premium de Espiritualidade
            </Text>
            <Text style={[styles.upgradeText, { color: colors.textSecondary }]}>
              Libere histórico completo e prepare o módulo para futuras evoluções
              como trilhas, devocionais e insights espirituais.
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
                Ver plano Premium
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {streak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              dias seguidos
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {entries.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              registros
            </Text>
          </View>
        </View>

        <Pressable
          style={[
            styles.addButton,
            {
              backgroundColor: colors.accentButtonBackground,
              borderColor: colors.accentButtonBorder,
            },
            colors.isWhiteAccentButton && styles.whiteAccentButton,
          ]}
          onPress={openModal}
        >
          <Text
            style={[styles.addButtonText, { color: colors.accentButtonText }]}
          >
            {todayEntry ? "Editar check-in de hoje" : "Fazer check-in espiritual"}
          </Text>
        </Pressable>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.section, { color: colors.text }]}>Histórico</Text>
          {!isPremium ? (
            <Text style={[styles.freeHintText, { color: colors.textMuted }]}>
              Free: últimos {FREE_HISTORY_LIMIT}
            </Text>
          ) : null}
        </View>

        {sortedEntries.length === 0 ? (
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
              Nenhum registro ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Faça seu primeiro check-in espiritual para começar seu histórico.
            </Text>
          </View>
        ) : (
          sortedEntries.map((entry) => (
            <View
              key={entry.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.date, { color: colors.text }]}>
                {formatDate(entry.dateKey)}
              </Text>

              <Text style={[styles.text, { color: colors.textSecondary }]}>
                🙏 Orou hoje: {entry.prayed ? "Sim" : "Não"}
              </Text>

              {entry.gratitude ? (
                <Text style={[styles.text, { color: colors.textSecondary }]}>
                  ✍ Gratidão: {entry.gratitude}
                </Text>
              ) : null}

              {entry.reflection ? (
                <Text style={[styles.text, { color: colors.textSecondary }]}>
                  💭 Reflexão: {entry.reflection}
                </Text>
              ) : null}
            </View>
          ))
        )}

        {!isPremium && entries.length > FREE_HISTORY_LIMIT ? (
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
              🔒 Histórico completo no Premium
            </Text>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              No Free você vê os últimos {FREE_HISTORY_LIMIT} registros. O Premium
              libera toda a sua caminhada espiritual.
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
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.modalBg,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <ScrollView
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              contentContainerStyle={[
                styles.modalCardContent,
                {
                  paddingBottom: 18 + Math.max(insets.bottom, 12),
                },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Check-in espiritual
            </Text>

            <Pressable
              style={[
                styles.toggle,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPrayed(!prayed)}
            >
              <Text style={[styles.toggleText, { color: colors.text }]}>
                🙏 Orei hoje: {prayed ? "Sim" : "Não"}
              </Text>
            </Pressable>

            <TextInput
              placeholder="Gratidão do dia"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={gratitude}
              onChangeText={setGratitude}
            />

            <TextInput
              placeholder="Reflexão do dia"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                styles.reflectionInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              multiline
              value={reflection}
              onChangeText={setReflection}
            />

            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={saveEntry}
            >
              <Text style={[styles.saveText, { color: colors.accentButtonText }]}>
                Salvar
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setModalOpen(false)}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>
                Cancelar
              </Text>
            </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 20,
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

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },

  statCard: {
    borderRadius: 16,
    padding: 16,
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "900",
  },

  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  addButton: {
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
  },

  addButtonText: {
    color: "white",
    fontWeight: "900",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },

  section: {
    fontWeight: "800",
    fontSize: 16,
  },

  freeHintText: {
    fontSize: 11,
    fontWeight: "700",
  },

  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },

  date: {
    fontWeight: "900",
    marginBottom: 6,
  },

  text: {
    fontSize: 13,
    marginTop: 4,
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

  lockedCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
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

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },

  modalKeyboardWrap: {
    flex: 1,
  },

  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    maxHeight: "92%",
    overflow: "hidden",
  },

  modalCardContent: {
    padding: 16,
  },

  modalTitle: {
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 10,
  },

  toggle: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },

  toggleText: {
    fontSize: 14,
    fontWeight: "700",
  },

  input: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },

  reflectionInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  saveBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
  },

  saveText: {
    color: "white",
    fontWeight: "900",
  },

  cancelBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },

  cancelText: {
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
