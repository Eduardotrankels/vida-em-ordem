import { router } from "expo-router";
import React from "react";
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
import { useAppLanguage } from "./utils/languageContext";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const copyByLanguage = {
  pt: {
    title: "Premium",
    subtitle:
      "Desbloqueie uma experiência mais forte, automatizada e completa no mesmo padrão do app.",
    heroBadgeActive: "Premium ativo",
    heroBadgeInactive: "Upgrade Premium",
    heroTitle: "Leve sua evolução para outro nível",
    heroSubtitle:
      "O plano Premium transforma o app em uma experiência mais completa, estratégica e poderosa para manter sua consistência viva.",
    priceLabel: "Plano Premium",
    priceValueActive: "ATIVO",
    priceValueInactive: "Desbloqueie agora",
    priceTextActive: "Seu app já está com os recursos premium liberados.",
    priceTextInactive: "Mais poder para seus hábitos, desafios e conquistas.",
    tryPremium: "Testar modo Premium",
    tryFree: "Testar modo Free",
    activeBox: "Você já está com o Premium ativo neste dispositivo.",
    benefitsTitle: "O que muda no Premium",
    benefits: [
      "Desbloqueie a biblioteca completa de hábitos.",
      "Ative até 5 desafios de 21 dias ao mesmo tempo.",
      "Libere conquistas e medalhas premium.",
      "Transforme o app em um sistema de evolução mais poderoso.",
    ],
    compareTitle: "Free vs Premium",
    compareHeaderFeature: "Recurso",
    compareHeaderFree: "Free",
    compareHeaderPremium: "Premium",
    planFeatures: [
      {
        title: "Biblioteca de hábitos",
        free: "Lista limitada",
        premium: "Biblioteca completa",
        highlight: true,
      },
      {
        title: "Desafios de 21 dias",
        free: "1 desafio ativo",
        premium: "Até 5 simultâneos",
        highlight: true,
      },
      {
        title: "Conquistas especiais",
        free: "Básicas",
        premium: "Premium desbloqueadas",
        highlight: true,
      },
      {
        title: "Histórico de progresso",
        free: "Disponível",
        premium: "Disponível",
      },
      {
        title: "Frase do dia",
        free: "Disponível",
        premium: "Disponível",
      },
    ],
    finalTitleActive: "Seu Premium já está liberado",
    finalTitleInactive: "Sua próxima versão começa aqui",
    finalTextActive: "Agora é manter a consistência e usar o máximo do app.",
    finalTextInactive:
      "Se o plano Free já te ajuda, o Premium foi feito para acelerar sua transformação.",
    activateNow: "Ativar Premium agora",
    backToHabits: "Voltar para meus hábitos",
    backToApp: "Voltar ao app",
    enabledTitle: "Premium ativado",
    enabledText: "Seu plano Premium foi liberado neste dispositivo.",
    disabledTitle: "Premium desativado",
    disabledText: "O app voltou para o plano Free neste dispositivo.",
    enableError: "Não foi possível ativar o Premium.",
    disableError: "Não foi possível desativar o Premium.",
  },
  en: {
    title: "Premium",
    subtitle:
      "Unlock a stronger, more automated, and more complete experience in the same app style.",
    heroBadgeActive: "Premium active",
    heroBadgeInactive: "Premium upgrade",
    heroTitle: "Take your growth to the next level",
    heroSubtitle:
      "The Premium plan turns the app into a more complete, strategic, and powerful experience that keeps your consistency alive.",
    priceLabel: "Premium plan",
    priceValueActive: "ACTIVE",
    priceValueInactive: "Unlock now",
    priceTextActive: "Your app already has Premium features enabled.",
    priceTextInactive: "More power for your habits, challenges, and achievements.",
    tryPremium: "Try Premium mode",
    tryFree: "Try Free mode",
    activeBox: "Premium is already active on this device.",
    benefitsTitle: "What changes with Premium",
    benefits: [
      "Unlock the full habits library.",
      "Activate up to 5 simultaneous 21-day challenges.",
      "Unlock premium achievements and medals.",
      "Turn the app into a more powerful growth system.",
    ],
    compareTitle: "Free vs Premium",
    compareHeaderFeature: "Feature",
    compareHeaderFree: "Free",
    compareHeaderPremium: "Premium",
    planFeatures: [
      {
        title: "Habits library",
        free: "Limited list",
        premium: "Full library",
        highlight: true,
      },
      {
        title: "21-day challenges",
        free: "1 active challenge",
        premium: "Up to 5 at once",
        highlight: true,
      },
      {
        title: "Special achievements",
        free: "Basic",
        premium: "Premium unlocked",
        highlight: true,
      },
      {
        title: "Progress history",
        free: "Available",
        premium: "Available",
      },
      {
        title: "Daily quote",
        free: "Available",
        premium: "Available",
      },
    ],
    finalTitleActive: "Your Premium is already enabled",
    finalTitleInactive: "Your next version starts here",
    finalTextActive: "Now it's time to stay consistent and get the most from the app.",
    finalTextInactive:
      "If the Free plan already helps you, Premium was built to accelerate your transformation.",
    activateNow: "Enable Premium now",
    backToHabits: "Back to my habits",
    backToApp: "Back to app",
    enabledTitle: "Premium enabled",
    enabledText: "Your Premium plan has been unlocked on this device.",
    disabledTitle: "Premium disabled",
    disabledText: "The app switched back to the Free plan on this device.",
    enableError: "Could not enable Premium.",
    disableError: "Could not disable Premium.",
  },
  es: {
    title: "Premium",
    subtitle:
      "Desbloquea una experiencia más fuerte, automatizada y completa con el mismo estándar de la app.",
    heroBadgeActive: "Premium activo",
    heroBadgeInactive: "Upgrade Premium",
    heroTitle: "Lleva tu evolución a otro nivel",
    heroSubtitle:
      "El plan Premium transforma la app en una experiencia más completa, estratégica y poderosa para mantener viva tu constancia.",
    priceLabel: "Plan Premium",
    priceValueActive: "ACTIVO",
    priceValueInactive: "Desbloquéalo ahora",
    priceTextActive: "Tu app ya tiene los recursos premium liberados.",
    priceTextInactive: "Más poder para tus hábitos, desafíos y logros.",
    tryPremium: "Probar modo Premium",
    tryFree: "Probar modo Free",
    activeBox: "Ya tienes Premium activo en este dispositivo.",
    benefitsTitle: "Qué cambia con Premium",
    benefits: [
      "Desbloquea la biblioteca completa de hábitos.",
      "Activa hasta 5 desafíos de 21 días al mismo tiempo.",
      "Libera logros y medallas premium.",
      "Convierte la app en un sistema de evolución más poderoso.",
    ],
    compareTitle: "Free vs Premium",
    compareHeaderFeature: "Recurso",
    compareHeaderFree: "Free",
    compareHeaderPremium: "Premium",
    planFeatures: [
      {
        title: "Biblioteca de hábitos",
        free: "Lista limitada",
        premium: "Biblioteca completa",
        highlight: true,
      },
      {
        title: "Desafíos de 21 días",
        free: "1 desafío activo",
        premium: "Hasta 5 simultáneos",
        highlight: true,
      },
      {
        title: "Logros especiales",
        free: "Básicos",
        premium: "Premium desbloqueados",
        highlight: true,
      },
      {
        title: "Historial de progreso",
        free: "Disponible",
        premium: "Disponible",
      },
      {
        title: "Frase del día",
        free: "Disponible",
        premium: "Disponible",
      },
    ],
    finalTitleActive: "Tu Premium ya está liberado",
    finalTitleInactive: "Tu próxima versión empieza aquí",
    finalTextActive: "Ahora es momento de mantener la constancia y aprovechar al máximo la app.",
    finalTextInactive:
      "Si el plan Free ya te ayuda, Premium fue hecho para acelerar tu transformación.",
    activateNow: "Activar Premium ahora",
    backToHabits: "Volver a mis hábitos",
    backToApp: "Volver a la app",
    enabledTitle: "Premium activado",
    enabledText: "Tu plan Premium fue liberado en este dispositivo.",
    disabledTitle: "Premium desactivado",
    disabledText: "La app volvió al plan Free en este dispositivo.",
    enableError: "No fue posible activar Premium.",
    disableError: "No fue posible desactivar Premium.",
  },
  fr: {
    title: "Premium",
    subtitle:
      "Débloquez une expérience plus forte, automatisée et complète dans le même standard de l'app.",
    heroBadgeActive: "Premium actif",
    heroBadgeInactive: "Upgrade Premium",
    heroTitle: "Passez votre évolution au niveau supérieur",
    heroSubtitle:
      "Le plan Premium transforme l'app en une expérience plus complète, stratégique et puissante pour garder votre constance vivante.",
    priceLabel: "Plan Premium",
    priceValueActive: "ACTIF",
    priceValueInactive: "Débloquez maintenant",
    priceTextActive: "Votre app a déjà les ressources Premium activées.",
    priceTextInactive: "Plus de puissance pour vos habitudes, défis et réussites.",
    tryPremium: "Tester le mode Premium",
    tryFree: "Tester le mode Free",
    activeBox: "Vous avez déjà Premium actif sur cet appareil.",
    benefitsTitle: "Ce qui change avec Premium",
    benefits: [
      "Débloquez la bibliothèque complète d'habitudes.",
      "Activez jusqu'à 5 défis de 21 jours en même temps.",
      "Débloquez des réussites et médailles premium.",
      "Transformez l'app en un système d'évolution plus puissant.",
    ],
    compareTitle: "Free vs Premium",
    compareHeaderFeature: "Fonction",
    compareHeaderFree: "Free",
    compareHeaderPremium: "Premium",
    planFeatures: [
      {
        title: "Bibliothèque d'habitudes",
        free: "Liste limitée",
        premium: "Bibliothèque complète",
        highlight: true,
      },
      {
        title: "Défis de 21 jours",
        free: "1 défi actif",
        premium: "Jusqu'à 5 simultanés",
        highlight: true,
      },
      {
        title: "Réussites spéciales",
        free: "Basiques",
        premium: "Premium débloquées",
        highlight: true,
      },
      {
        title: "Historique de progression",
        free: "Disponible",
        premium: "Disponible",
      },
      {
        title: "Phrase du jour",
        free: "Disponible",
        premium: "Disponible",
      },
    ],
    finalTitleActive: "Votre Premium est déjà activé",
    finalTitleInactive: "Votre prochaine version commence ici",
    finalTextActive: "Il est temps maintenant de garder la constance et d'utiliser tout le potentiel de l'app.",
    finalTextInactive:
      "Si le plan Free vous aide déjà, Premium a été conçu pour accélérer votre transformation.",
    activateNow: "Activer Premium maintenant",
    backToHabits: "Retour à mes habitudes",
    backToApp: "Retour à l'app",
    enabledTitle: "Premium activé",
    enabledText: "Votre plan Premium a été débloqué sur cet appareil.",
    disabledTitle: "Premium désactivé",
    disabledText: "L'app est revenue au plan Free sur cet appareil.",
    enableError: "Impossible d'activer Premium.",
    disableError: "Impossible de désactiver Premium.",
  },
  it: {
    title: "Premium",
    subtitle:
      "Sblocca un'esperienza più forte, automatizzata e completa con lo stesso standard dell'app.",
    heroBadgeActive: "Premium attivo",
    heroBadgeInactive: "Upgrade Premium",
    heroTitle: "Porta la tua evoluzione a un altro livello",
    heroSubtitle:
      "Il piano Premium trasforma l'app in un'esperienza più completa, strategica e potente per mantenere viva la tua costanza.",
    priceLabel: "Piano Premium",
    priceValueActive: "ATTIVO",
    priceValueInactive: "Sblocca ora",
    priceTextActive: "La tua app ha già le funzioni premium attive.",
    priceTextInactive: "Più potenza per le tue abitudini, sfide e conquiste.",
    tryPremium: "Prova la modalità Premium",
    tryFree: "Prova la modalità Free",
    activeBox: "Hai già Premium attivo su questo dispositivo.",
    benefitsTitle: "Cosa cambia con Premium",
    benefits: [
      "Sblocca la libreria completa delle abitudini.",
      "Attiva fino a 5 sfide da 21 giorni allo stesso tempo.",
      "Sblocca conquiste e medaglie premium.",
      "Trasforma l'app in un sistema di evoluzione più potente.",
    ],
    compareTitle: "Free vs Premium",
    compareHeaderFeature: "Funzione",
    compareHeaderFree: "Free",
    compareHeaderPremium: "Premium",
    planFeatures: [
      {
        title: "Libreria abitudini",
        free: "Lista limitata",
        premium: "Libreria completa",
        highlight: true,
      },
      {
        title: "Sfide da 21 giorni",
        free: "1 sfida attiva",
        premium: "Fino a 5 simultanee",
        highlight: true,
      },
      {
        title: "Conquiste speciali",
        free: "Base",
        premium: "Premium sbloccate",
        highlight: true,
      },
      {
        title: "Storico dei progressi",
        free: "Disponibile",
        premium: "Disponibile",
      },
      {
        title: "Frase del giorno",
        free: "Disponibile",
        premium: "Disponibile",
      },
    ],
    finalTitleActive: "Il tuo Premium è già attivo",
    finalTitleInactive: "La tua prossima versione inizia qui",
    finalTextActive: "Ora è il momento di mantenere la costanza e usare al massimo l'app.",
    finalTextInactive:
      "Se il piano Free già ti aiuta, Premium è stato pensato per accelerare la tua trasformazione.",
    activateNow: "Attiva Premium ora",
    backToHabits: "Torna alle mie abitudini",
    backToApp: "Torna all'app",
    enabledTitle: "Premium attivato",
    enabledText: "Il tuo piano Premium è stato sbloccato su questo dispositivo.",
    disabledTitle: "Premium disattivato",
    disabledText: "L'app è tornata al piano Free su questo dispositivo.",
    enableError: "Non è stato possibile attivare Premium.",
    disableError: "Non è stato possibile disattivare Premium.",
  },
} as const;

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const { colors, settings, patchAppSettings } = useAppTheme();
  const { language, t } = useAppLanguage();
  const copy = copyByLanguage[language];

  const isPremium = settings.plan === "premium";

  async function ativarPremiumLocal() {
    try {
      await patchAppSettings({ plan: "premium" });

      Alert.alert(copy.enabledTitle, copy.enabledText, [
        {
          text: t("common.continue"),
          onPress: () => router.back(),
        },
      ]);
    } catch (e) {
      console.log("Erro ao ativar premium:", e);
      Alert.alert(t("common.error"), copy.enableError);
    }
  }

  async function desativarPremiumLocal() {
    try {
      await patchAppSettings({ plan: "free" });

      Alert.alert(copy.disabledTitle, copy.disabledText);
    } catch (e) {
      console.log("Erro ao desativar premium:", e);
      Alert.alert(t("common.error"), copy.disableError);
    }
  }

  const isDark = settings.theme === "dark";
  const screenBackground = isDark ? "#090A0C" : colors.background;
  const cardBackground = isDark ? "#0F1115" : colors.surface;
  const cardBackgroundAlt = isDark ? "#141821" : colors.surfaceAlt;
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const textPrimary = isDark ? "#F5F7FB" : colors.text;
  const textSecondary = isDark ? "#A8B0C0" : colors.textSecondary;
  const accentSoft =
    isDark ? "rgba(245, 158, 11, 0.14)" : "rgba(245, 158, 11, 0.10)";
  const accentBorder =
    isDark ? "rgba(245, 158, 11, 0.24)" : "rgba(245, 158, 11, 0.18)";
  const successSoft =
    isDark ? "rgba(34, 197, 94, 0.12)" : "rgba(34, 197, 94, 0.10)";
  const successBorder =
    isDark ? "rgba(34, 197, 94, 0.24)" : "rgba(34, 197, 94, 0.20)";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: screenBackground }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: screenBackground }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenContentBottomPadding(insets.bottom, "compact") },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          title={copy.title}
          subtitle={copy.subtitle}
          icon="diamond-outline"
          badgeLabel={isPremium ? t("common.premium") : t("common.free")}
          badgeTone={isPremium ? "success" : "accent"}
        />

        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {isPremium ? copy.heroBadgeActive : copy.heroBadgeInactive}
            </Text>
          </View>

          <Text style={[styles.title, { color: textPrimary }]}>{copy.heroTitle}</Text>

          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {copy.heroSubtitle}
          </Text>
        </View>

        <View
          style={[
            styles.priceCard,
            { backgroundColor: cardBackground, borderColor: accentBorder },
          ]}
        >
          <Text style={styles.priceLabel}>{copy.priceLabel}</Text>
          <Text style={[styles.priceValue, { color: textPrimary }]}>
            {isPremium ? copy.priceValueActive : copy.priceValueInactive}
          </Text>

          <Text style={[styles.priceText, { color: textSecondary }]}>
            {isPremium ? copy.priceTextActive : copy.priceTextInactive}
          </Text>

          {!isPremium ? (
            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={ativarPremiumLocal}
            >
              <Text style={[styles.primaryButtonText, { color: colors.accentButtonText }]}>
                {copy.tryPremium}
              </Text>
            </Pressable>
          ) : (
            <View
              style={[
                styles.activeBox,
                { backgroundColor: successSoft, borderColor: successBorder },
              ]}
            >
              <Text style={styles.activeBoxText}>{copy.activeBox}</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.secondaryButton,
              { backgroundColor: cardBackgroundAlt, borderColor: cardBorder },
            ]}
            onPress={desativarPremiumLocal}
          >
            <Text style={[styles.secondaryButtonText, { color: textPrimary }]}>
              {copy.tryFree}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
          {copy.benefitsTitle}
        </Text>

        <View
          style={[
            styles.benefitsCard,
            { backgroundColor: cardBackground, borderColor: cardBorder },
          ]}
        >
          {copy.benefits.map((item, index) => (
            <View
              key={item}
              style={[
                styles.benefitRow,
                index < copy.benefits.length - 1 && styles.benefitRowBorder,
              ]}
            >
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={[styles.benefitText, { color: textPrimary }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
          {copy.compareTitle}
        </Text>

        <View
          style={[
            styles.compareCard,
            { backgroundColor: cardBackground, borderColor: cardBorder },
          ]}
        >
          <View style={[styles.compareHeader, { backgroundColor: cardBackgroundAlt }]}>
            <Text style={[styles.compareHeaderText, styles.compareFeatureCol]}>
              {copy.compareHeaderFeature}
            </Text>
            <Text style={[styles.compareHeaderText, styles.comparePlanCol]}>
              {copy.compareHeaderFree}
            </Text>
            <Text style={[styles.compareHeaderText, styles.comparePlanCol]}>
              {copy.compareHeaderPremium}
            </Text>
          </View>

          {copy.planFeatures.map((feature, index) => (
            <View
              key={feature.title}
              style={[
                styles.compareRow,
                feature.highlight && styles.compareRowHighlight,
                index < copy.planFeatures.length - 1 && styles.compareRowBorder,
              ]}
            >
              <Text style={[styles.compareFeatureText, styles.compareFeatureCol]}>
                {feature.title}
              </Text>
              <Text
                style={[
                  styles.comparePlanText,
                  styles.comparePlanCol,
                  { color: textSecondary },
                ]}
              >
                {feature.free}
              </Text>
              <Text
                style={[
                  styles.comparePlanText,
                  styles.comparePlanCol,
                  styles.comparePremiumText,
                ]}
              >
                {feature.premium}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.finalCtaCard,
            { backgroundColor: accentSoft, borderColor: accentBorder },
          ]}
        >
          <Text style={[styles.finalCtaTitle, { color: textPrimary }]}>
            {isPremium ? copy.finalTitleActive : copy.finalTitleInactive}
          </Text>

          <Text style={styles.finalCtaText}>
            {isPremium ? copy.finalTextActive : copy.finalTextInactive}
          </Text>

          {!isPremium ? (
            <Pressable
              style={[
                styles.finalCtaButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={ativarPremiumLocal}
            >
              <Text
                style={[styles.finalCtaButtonText, { color: colors.accentButtonText }]}
              >
                {copy.activateNow}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.finalCtaButtonSecondary,
                { backgroundColor: cardBackgroundAlt, borderColor: cardBorder },
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.finalCtaButtonSecondaryText}>{copy.backToHabits}</Text>
            </Pressable>
          )}
        </View>

        <Pressable style={styles.devResetButton} onPress={() => router.back()}>
          <Text style={[styles.devResetButtonText, { color: textSecondary }]}>
            {copy.backToApp}
          </Text>
        </Pressable>
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
    paddingBottom: 32,
  },

  hero: {
    marginTop: 8,
    marginBottom: 16,
  },

  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.22)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },

  heroBadgeText: {
    color: "#fcd34d",
    fontSize: 12,
    fontWeight: "800",
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },

  priceCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
  },

  priceLabel: {
    color: "#fde68a",
    fontSize: 13,
    fontWeight: "800",
  },

  priceValue: {
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },

  priceText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 16,
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  secondaryButton: {
    marginTop: 10,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  activeBox: {
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.20)",
    borderRadius: 16,
    padding: 14,
  },

  activeBoxText: {
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 4,
  },

  benefitsCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },

  benefitRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.10)",
  },

  benefitIcon: {
    color: "#86efac",
    fontSize: 16,
    fontWeight: "900",
    marginRight: 10,
    marginTop: 1,
  },

  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  compareCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
    overflow: "hidden",
  },

  compareHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  compareHeaderText: {
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: "900",
  },

  compareRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  compareRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.08)",
  },

  compareRowHighlight: {
    backgroundColor: "rgba(34, 197, 94, 0.05)",
  },

  compareFeatureCol: {
    flex: 1.6,
    paddingRight: 8,
  },

  comparePlanCol: {
    flex: 1,
    textAlign: "center",
  },

  compareFeatureText: {
    color: "white",
    fontSize: 13,
    fontWeight: "800",
  },

  comparePlanText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },

  comparePremiumText: {
    color: "#86efac",
  },

  finalCtaCard: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.18)",
  },

  finalCtaTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  finalCtaText: {
    color: "#fde68a",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 16,
  },

  finalCtaButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  finalCtaButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  finalCtaButtonSecondary: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  finalCtaButtonSecondaryText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },

  devResetButton: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },

  devResetButtonText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },

  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
