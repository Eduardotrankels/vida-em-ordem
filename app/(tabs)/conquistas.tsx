import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useMemo, useState } from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppScreenHeader from "../../components/AppScreenHeader";
import {
  ACHIEVEMENTS,
  getAchievementIconName,
  localizeAchievement,
} from "../constants/achievements";
import { useAppLanguage } from "../utils/languageContext";
import {
  Challenge21,
  getUnlockedAchievementIds,
  Habit,
} from "../utils/progress";
import { useAppTheme } from "../utils/themeContext";

const STORAGE_KEY = "@vida_em_ordem_habitos_v1";
const CHALLENGE_KEY = "@vida_em_ordem_desafio_21d_v1";

const copyByLanguage = {
  pt: {
    progressComplete: "Coleção completa",
    progressStrong: "Fase forte",
    progressGood: "Boa evolução",
    progressBuilding: "Em construção",
    progressStarting: "Começando",
    headerTitle: "Conquistas",
    headerSubtitle: "Cada medalha representa disciplina construída dia após dia.",
    executiveBadge: "Visão rápida da sua evolução",
    unlockedLabel: "Desbloqueadas",
    availableLabel: "Disponíveis",
    visibleGalleryProgress: "{{value}}% da galeria visível concluída",
    planPremium: "Plano Premium",
    planFree: "Plano Free",
    planPremiumText:
      "Sua galeria agora conta com conquistas extras e uma leitura mais completa da sua evolução.",
    planFreeText:
      "No plano Free você acompanha sua evolução e vê parte das medalhas. Se quiser aprofundar a jornada, o Premium amplia essa leitura.",
    activeHabits: "Hábitos ativos",
    completedChallenges: "Desafios concluídos",
    summaryUnlocked: "{{unlocked}}/{{available}} desbloqueadas",
    summaryPremium:
      "Todas as conquistas disponíveis para seu plano estão sendo avaliadas.",
    summaryFreeExtra: "{{count}} conquista(s) extra disponíveis no Premium.",
    summaryTracking: "Seu progresso já está sendo acompanhado.",
    statusPremium: "Premium",
    statusUnlocked: "Desbloqueada",
    statusInProgress: "Em progresso",
    lockedDescription: "Disponível no plano Premium",
    lockedStatus: "Essa medalha passa a fazer parte da sua galeria no Premium.",
    unlockedStatus: "Você já cravou esta medalha no seu histórico.",
    progressStatus: "Continue avançando para acender esta conquista.",
    lockedTitle: "Conquistas extras no Premium",
    lockedText:
      "Se quiser ampliar sua galeria, o Premium adiciona medalhas exclusivas e uma leitura mais completa da sua evolução pessoal.",
    buttonPremium: "Conhecer Premium",
    summaryEmpty:
      "Sua galeria de conquistas ainda está silenciosa, mas o sistema já está observando cada passo. As primeiras medalhas chegam rápido quando a repetição entra em cena.",
    summaryHigh:
      "Seu painel já mostra constância real. Agora as conquistas deixam de ser só recompensa e viram prova visível da sua disciplina.",
    summaryMid:
      "Você já saiu do zero e construiu tração. Continue alimentando o ritmo para transformar progresso em identidade.",
    summaryLow:
      "Você já começou a acender suas primeiras medalhas. O segredo agora é seguir acumulando pequenos dias bem feitos.",
  },
  en: {
    progressComplete: "Full collection",
    progressStrong: "Strong phase",
    progressGood: "Good progress",
    progressBuilding: "Building up",
    progressStarting: "Getting started",
    headerTitle: "Achievements",
    headerSubtitle: "Each medal represents discipline built one day at a time.",
    executiveBadge: "Quick view of your progress",
    unlockedLabel: "Unlocked",
    availableLabel: "Available",
    visibleGalleryProgress: "{{value}}% of the visible gallery completed",
    planPremium: "Premium Plan",
    planFree: "Free Plan",
    planPremiumText:
      "Your gallery now includes extra achievements and a more complete view of your progress.",
    planFreeText:
      "On the Free plan you follow your progress and see part of the medals. If you want to go deeper, Premium expands that view.",
    activeHabits: "Active habits",
    completedChallenges: "Completed challenges",
    summaryUnlocked: "{{unlocked}}/{{available}} unlocked",
    summaryPremium: "All achievements available for your plan are being tracked.",
    summaryFreeExtra: "{{count}} extra achievement(s) available in Premium.",
    summaryTracking: "Your progress is already being tracked.",
    statusPremium: "Premium",
    statusUnlocked: "Unlocked",
    statusInProgress: "In progress",
    lockedDescription: "Available on the Premium plan",
    lockedStatus: "This medal becomes part of your gallery on Premium.",
    unlockedStatus: "You already secured this medal in your history.",
    progressStatus: "Keep moving to light up this achievement.",
    lockedTitle: "Extra achievements on Premium",
    lockedText:
      "If you want to expand your gallery, Premium adds exclusive medals and a deeper read of your personal growth.",
    buttonPremium: "Explore Premium",
    summaryEmpty:
      "Your achievements gallery is still quiet, but the system is already watching every step. The first medals come quickly when repetition kicks in.",
    summaryHigh:
      "Your dashboard already shows real consistency. Now achievements stop being only rewards and become visible proof of your discipline.",
    summaryMid:
      "You are already past zero and building traction. Keep feeding the rhythm to turn progress into identity.",
    summaryLow:
      "You already started lighting up your first medals. The secret now is to keep stacking small well-done days.",
  },
  es: {
    progressComplete: "Colección completa",
    progressStrong: "Fase fuerte",
    progressGood: "Buena evolución",
    progressBuilding: "En construcción",
    progressStarting: "Empezando",
    headerTitle: "Logros",
    headerSubtitle: "Cada medalla representa disciplina construida día tras día.",
    executiveBadge: "Vista rápida de tu evolución",
    unlockedLabel: "Desbloqueadas",
    availableLabel: "Disponibles",
    visibleGalleryProgress: "{{value}}% de la galería visible completada",
    planPremium: "Plan Premium",
    planFree: "Plan Free",
    planPremiumText:
      "Tu galería ahora cuenta con logros extra y una lectura más completa de tu evolución.",
    planFreeText:
      "En el plan Free sigues tu evolución y ves parte de las medallas. Si quieres profundizar, Premium amplía esa lectura.",
    activeHabits: "Hábitos activos",
    completedChallenges: "Desafíos completados",
    summaryUnlocked: "{{unlocked}}/{{available}} desbloqueadas",
    summaryPremium: "Todos los logros disponibles para tu plan están siendo evaluados.",
    summaryFreeExtra: "{{count}} logro(s) extra disponibles en Premium.",
    summaryTracking: "Tu progreso ya está siendo acompañado.",
    statusPremium: "Premium",
    statusUnlocked: "Desbloqueada",
    statusInProgress: "En progreso",
    lockedDescription: "Disponible en el plan Premium",
    lockedStatus: "Esta medalla pasa a formar parte de tu galería en Premium.",
    unlockedStatus: "Ya dejaste esta medalla registrada en tu historial.",
    progressStatus: "Sigue avanzando para encender este logro.",
    lockedTitle: "Logros extra en Premium",
    lockedText:
      "Si quieres ampliar tu galería, Premium añade medallas exclusivas y una lectura más completa de tu evolución personal.",
    buttonPremium: "Conocer Premium",
    summaryEmpty:
      "Tu galería de logros todavía está en silencio, pero el sistema ya está observando cada paso. Las primeras medallas llegan rápido cuando aparece la repetición.",
    summaryHigh:
      "Tu panel ya muestra constancia real. Ahora los logros dejan de ser solo recompensa y se vuelven prueba visible de tu disciplina.",
    summaryMid:
      "Ya saliste de cero y construiste tracción. Sigue alimentando el ritmo para transformar progreso en identidad.",
    summaryLow:
      "Ya empezaste a encender tus primeras medallas. El secreto ahora es seguir acumulando pequeños días bien hechos.",
  },
  fr: {
    progressComplete: "Collection complète",
    progressStrong: "Phase forte",
    progressGood: "Bonne évolution",
    progressBuilding: "En construction",
    progressStarting: "Commencer",
    headerTitle: "Réussites",
    headerSubtitle: "Chaque médaille représente une discipline construite jour après jour.",
    executiveBadge: "Vue rapide de votre évolution",
    unlockedLabel: "Débloquées",
    availableLabel: "Disponibles",
    visibleGalleryProgress: "{{value}}% de la galerie visible complétée",
    planPremium: "Plan Premium",
    planFree: "Plan Free",
    planPremiumText:
      "Votre galerie compte maintenant des réussites supplémentaires et une lecture plus complète de votre évolution.",
    planFreeText:
      "Avec le plan Free, vous suivez votre évolution et voyez une partie des médailles. Si vous voulez aller plus loin, Premium élargit cette lecture.",
    activeHabits: "Habitudes actives",
    completedChallenges: "Défis terminés",
    summaryUnlocked: "{{unlocked}}/{{available}} débloquées",
    summaryPremium:
      "Toutes les réussites disponibles pour votre plan sont en cours d'évaluation.",
    summaryFreeExtra: "{{count}} réussite(s) extra disponibles en Premium.",
    summaryTracking: "Votre progression est déjà suivie.",
    statusPremium: "Premium",
    statusUnlocked: "Débloquée",
    statusInProgress: "En cours",
    lockedDescription: "Disponible avec le plan Premium",
    lockedStatus: "Cette médaille rejoint votre galerie avec Premium.",
    unlockedStatus: "Vous avez déjà gravé cette médaille dans votre historique.",
    progressStatus: "Continuez à avancer pour allumer cette réussite.",
    lockedTitle: "Réussites supplémentaires en Premium",
    lockedText:
      "Si vous voulez agrandir votre galerie, Premium ajoute des médailles exclusives et une lecture plus profonde de votre évolution personnelle.",
    buttonPremium: "Découvrir Premium",
    summaryEmpty:
      "Votre galerie de réussites est encore silencieuse, mais le système observe déjà chaque pas. Les premières médailles arrivent vite quand la répétition s'installe.",
    summaryHigh:
      "Votre tableau montre déjà une vraie constance. Les réussites cessent d'être seulement des récompenses et deviennent une preuve visible de votre discipline.",
    summaryMid:
      "Vous avez déjà quitté le zéro et construit de l'élan. Continuez à nourrir le rythme pour transformer le progrès en identité.",
    summaryLow:
      "Vous avez déjà commencé à allumer vos premières médailles. Le secret maintenant est d'accumuler de petits jours bien exécutés.",
  },
  it: {
    progressComplete: "Collezione completa",
    progressStrong: "Fase forte",
    progressGood: "Buona evoluzione",
    progressBuilding: "In costruzione",
    progressStarting: "Inizio",
    headerTitle: "Conquiste",
    headerSubtitle: "Ogni medaglia rappresenta disciplina costruita giorno dopo giorno.",
    executiveBadge: "Vista rapida della tua evoluzione",
    unlockedLabel: "Sbloccate",
    availableLabel: "Disponibili",
    visibleGalleryProgress: "{{value}}% della galleria visibile completata",
    planPremium: "Piano Premium",
    planFree: "Piano Free",
    planPremiumText:
      "La tua galleria ora include conquiste extra e una lettura più completa della tua evoluzione.",
    planFreeText:
      "Nel piano Free segui la tua evoluzione e vedi parte delle medaglie. Se vuoi approfondire, Premium amplia questa lettura.",
    activeHabits: "Abitudini attive",
    completedChallenges: "Sfide completate",
    summaryUnlocked: "{{unlocked}}/{{available}} sbloccate",
    summaryPremium: "Tutte le conquiste disponibili per il tuo piano sono in valutazione.",
    summaryFreeExtra: "{{count}} conquista/e extra disponibili in Premium.",
    summaryTracking: "I tuoi progressi sono già monitorati.",
    statusPremium: "Premium",
    statusUnlocked: "Sbloccata",
    statusInProgress: "In corso",
    lockedDescription: "Disponibile nel piano Premium",
    lockedStatus: "Questa medaglia entra nella tua galleria con Premium.",
    unlockedStatus: "Hai già inciso questa medaglia nella tua storia.",
    progressStatus: "Continua ad avanzare per accendere questa conquista.",
    lockedTitle: "Conquiste extra nel Premium",
    lockedText:
      "Se vuoi ampliare la tua galleria, Premium aggiunge medaglie esclusive e una lettura più profonda della tua evoluzione personale.",
    buttonPremium: "Scopri Premium",
    summaryEmpty:
      "La tua galleria delle conquiste è ancora silenziosa, ma il sistema sta già osservando ogni passo. Le prime medaglie arrivano presto quando entra la ripetizione.",
    summaryHigh:
      "Il tuo pannello mostra già una costanza reale. Ora le conquiste smettono di essere solo ricompense e diventano prova visibile della tua disciplina.",
    summaryMid:
      "Sei già uscito dallo zero e hai costruito trazione. Continua ad alimentare il ritmo per trasformare il progresso in identità.",
    summaryLow:
      "Hai già iniziato ad accendere le tue prime medaglie. Il segreto ora è continuare ad accumulare piccoli giorni ben fatti.",
  },
} as const;

function getProgressLabel(
  percent: number
): keyof typeof copyByLanguage.pt {
  if (percent >= 100) return "progressComplete";
  if (percent >= 75) return "progressStrong";
  if (percent >= 40) return "progressGood";
  if (percent >= 10) return "progressBuilding";
  return "progressStarting";
}

export default function Conquistas() {
  const { settings, colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const copy = copyByLanguage[language];
  const [habits, setHabits] = useState<Habit[]>([]);
  const [challenges, setChallenges] = useState<Challenge21[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [habitsRaw, challengesRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(CHALLENGE_KEY),
      ]);

      const parsedHabits = habitsRaw ? JSON.parse(habitsRaw) : [];
      const parsedChallenges = challengesRaw ? JSON.parse(challengesRaw) : [];

      setHabits(Array.isArray(parsedHabits) ? parsedHabits : []);
      setChallenges(Array.isArray(parsedChallenges) ? parsedChallenges : []);
    } catch (error) {
      console.log("Erro ao carregar conquistas:", error);
      setHabits([]);
      setChallenges([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();

      const onBackPress = () => {
        router.replace("/");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => {
        subscription.remove();
      };
    }, [loadData])
  );

  const isPremium = settings.plan === "premium";

  const achievements = useMemo(() => {
    return getUnlockedAchievementIds(habits, challenges).map((achievement) =>
      localizeAchievement(achievement, language)
    );
  }, [habits, challenges, language]);

  const visibleAchievements = useMemo(() => {
    return achievements.filter(() => true);
  }, [achievements]);

  const unlocked = useMemo(() => {
    return achievements.filter((achievement) => {
      if (achievement.isPremium && !isPremium) return false;
      return achievement.unlocked;
    });
  }, [achievements, isPremium]);

  const availableAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter((achievement) => {
      if (achievement.isPremium && !isPremium) return false;
      return true;
    });
  }, [isPremium]);

  const premiumLockedCount = useMemo(() => {
    return ACHIEVEMENTS.filter(
      (achievement) => achievement.isPremium && !isPremium
    ).length;
  }, [isPremium]);

  const unlockedPercent = useMemo(() => {
    if (availableAchievements.length === 0) return 0;
    return Math.min(
      Math.round((unlocked.length / availableAchievements.length) * 100),
      100
    );
  }, [unlocked.length, availableAchievements.length]);

  const completedChallengesCount = useMemo(() => {
    return challenges.filter((challenge) => !!challenge.finishedAt).length;
  }, [challenges]);

  const activeHabitsCount = useMemo(() => habits.length, [habits.length]);

  const smartSummary = useMemo(() => {
    if (unlocked.length === 0) {
      return copy.summaryEmpty;
    }

    if (unlockedPercent >= 75) {
      return copy.summaryHigh;
    }

    if (unlockedPercent >= 40) {
      return copy.summaryMid;
    }

    return copy.summaryLow;
  }, [copy, unlocked.length, unlockedPercent]);

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
          title={copy.headerTitle}
          subtitle={copy.headerSubtitle}
          icon="medal-outline"
          showBack={false}
          badgeLabel={isPremium ? t("common.premium") : t("common.free")}
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={() => router.push("/assinatura")}
        />

        <View
          style={[
            styles.executiveCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.executiveBadge,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text style={[styles.executiveBadgeText, { color: colors.accent }]}>
              {copy.executiveBadge}
            </Text>
          </View>

          <Text style={[styles.executiveTitle, { color: colors.text }]}>
            {copy[getProgressLabel(unlockedPercent)]}
          </Text>

          <Text
            style={[styles.executiveDescription, { color: colors.textSecondary }]}
          >
            {smartSummary}
          </Text>

          <View style={styles.executiveMetricsRow}>
            <View
              style={[
                styles.executiveMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.executiveMiniValue, { color: colors.text }]}>
                {unlocked.length}
              </Text>
              <Text
                style={[styles.executiveMiniLabel, { color: colors.textMuted }]}
              >
                {copy.unlockedLabel}
              </Text>
            </View>

            <View
              style={[
                styles.executiveMiniCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.executiveMiniValue, { color: colors.text }]}>
                {availableAchievements.length}
              </Text>
              <Text
                style={[styles.executiveMiniLabel, { color: colors.textMuted }]}
              >
                {copy.availableLabel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.heroProgressTrack,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${unlockedPercent}%`,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>

          <Text style={[styles.heroProgressLabel, { color: colors.accent }]}>
            {copy.visibleGalleryProgress.replace("{{value}}", String(unlockedPercent))}
          </Text>
        </View>

        <View
          style={[
            styles.planCard,
            {
              backgroundColor: colors.surface,
              borderColor: isPremium ? colors.success : colors.warning,
            },
          ]}
        >
          <View style={styles.planTopRow}>
            <Text style={[styles.planTitle, { color: colors.text }]}>
              {isPremium ? copy.planPremium : copy.planFree}
            </Text>

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

          <Text style={[styles.planText, { color: colors.textSecondary }]}>
            {isPremium ? copy.planPremiumText : copy.planFreeText}
          </Text>
        </View>

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
            <Text style={[styles.statValue, { color: colors.text }]}>
              {activeHabitsCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.activeHabits}
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
            <Text style={[styles.statValue, { color: colors.text }]}>
              {completedChallengesCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {copy.completedChallenges}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.summary,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.summaryText, { color: colors.accent }]}>
            {copy.summaryUnlocked
              .replace("{{unlocked}}", String(unlocked.length))
              .replace("{{available}}", String(availableAchievements.length))}
          </Text>

          <Text style={[styles.summarySubtext, { color: colors.textSecondary }]}>
            {isPremium
              ? copy.summaryPremium
              : premiumLockedCount > 0
                ? copy.summaryFreeExtra.replace("{{count}}", String(premiumLockedCount))
                : copy.summaryTracking}
          </Text>
        </View>

        {visibleAchievements.map((achievement) => {
          const lockedByPlan = achievement.isPremium && !isPremium;
          const isUnlocked = !lockedByPlan && achievement.unlocked;

          return (
            <View
              key={achievement.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                isUnlocked && {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
                lockedByPlan && {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.warning,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isUnlocked
                      ? colors.successSoft
                      : lockedByPlan
                        ? colors.warningSoft
                        : colors.surfaceAlt,
                    borderColor: isUnlocked
                      ? colors.success
                      : lockedByPlan
                        ? colors.warning
                        : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={getAchievementIconName(achievement.id)}
                  size={20}
                  color={
                    lockedByPlan
                      ? colors.warning
                      : isUnlocked
                        ? colors.success
                        : colors.accent
                  }
                />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.titleCard, { color: colors.text }]}>
                    {achievement.title}
                  </Text>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: lockedByPlan
                          ? colors.surface
                          : isUnlocked
                            ? colors.successSoft
                            : colors.surfaceAlt,
                        borderColor: lockedByPlan
                          ? colors.warning
                          : isUnlocked
                            ? colors.success
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: lockedByPlan
                            ? colors.warning
                            : isUnlocked
                              ? colors.success
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {lockedByPlan
                        ? copy.statusPremium
                        : isUnlocked
                          ? copy.statusUnlocked
                          : copy.statusInProgress}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.description, { color: colors.textSecondary }]}
                >
                  {lockedByPlan
                    ? copy.lockedDescription
                    : achievement.description}
                </Text>

                <Text
                  style={[
                    styles.status,
                    {
                      color: lockedByPlan
                        ? colors.warning
                        : isUnlocked
                          ? colors.success
                          : colors.textMuted,
                    },
                  ]}
                >
                  {lockedByPlan
                    ? copy.lockedStatus
                    : isUnlocked
                      ? copy.unlockedStatus
                      : copy.progressStatus}
                </Text>
              </View>
            </View>
          );
        })}

        {!isPremium ? (
          <View
            style={[
              styles.lockedBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.warning,
              },
            ]}
          >
            <Text style={[styles.lockedTitle, { color: colors.text }]}>
              {copy.lockedTitle}
            </Text>

            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              {copy.lockedText}
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
              onPress={() => router.push("/assinatura")}
            >
              <Text
                style={[
                  styles.lockedButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {copy.buttonPremium}
              </Text>
            </Pressable>
          </View>
        ) : null}
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
    paddingBottom: 120,
  },

  executiveCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  executiveBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },

  executiveBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  executiveTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  executiveDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  executiveMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  executiveMiniCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  executiveMiniValue: {
    fontSize: 24,
    fontWeight: "900",
  },

  executiveMiniLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  heroProgressTrack: {
    marginTop: 14,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
  },

  heroProgressFill: {
    height: "100%",
    borderRadius: 999,
  },

  heroProgressLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
  },

  planCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },

  planTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  planTitle: {
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },

  planBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  planBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  planText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },

  planButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
  },

  planButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },

  statValue: {
    fontWeight: "900",
    fontSize: 28,
  },

  statLabel: {
    marginTop: 4,
    fontSize: 12,
  },

  summary: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },

  summaryText: {
    fontWeight: "900",
    fontSize: 15,
  },

  summarySubtext: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },

  card: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },

  cardContent: {
    flex: 1,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  titleCard: {
    fontWeight: "800",
    fontSize: 15,
    flex: 1,
  },

  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  description: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  status: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },

  lockedBox: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
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
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },

  lockedButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },

  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
