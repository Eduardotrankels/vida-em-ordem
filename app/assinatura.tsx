import { router, useFocusEffect } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import { getBillingStatus, openManagePlan, openPremiumCheckout } from "./services/billing";
import { useAppLanguage } from "./utils/languageContext";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const copyByLanguage = {
  pt: {
    title: "Assinatura",
    subtitle:
      "Escolha o plano que destrava a experiência mais completa do Vida em Ordem.",
    eyebrow: "VIDA EM ORDEM PREMIUM",
    heroTitle: "Escolha seu plano",
    heroSubtitle:
      "Transforme o app em um painel completo de organização, evolução e clareza pessoal.",
    pillIntelligence: "Mais inteligência",
    pillDepth: "Mais profundidade",
    monthlyLabel: "Plano mensal",
    monthlyPeriod: "por mês",
    yearlyLabel: "Plano anual",
    yearlyPeriod: "economia no ano",
    mostPopular: "Mais popular",
    freeBadge: "FREE",
    freeTitle: "Começar com o essencial",
    freeDescription:
      "Para organizar a base da rotina e testar o app no seu ritmo.",
    freeItems: [
      "Recursos essenciais para começar",
      "Limites por módulo",
      "Uso inicial do ecossistema",
      "Base de organização pessoal",
    ],
    premiumBadge: "PREMIUM",
    premiumTitle: "Evoluir com mais poder",
    premiumDescription:
      "Para quem quer uma experiência mais completa, inteligente e refinada.",
    premiumItems: [
      "Acesso expandido aos módulos",
      "Análises mais profundas",
      "Menos bloqueios e mais inteligência",
      "Mais personalização e upgrades futuros",
    ],
    benefitsTitle: "O que desbloqueia no Premium",
    benefits: [
      "Open Finance com conexão bancária",
      "Relatórios completos e visão avançada",
      "Filtros inteligentes e análise detalhada",
      "Mais limites e desbloqueios por módulo",
      "Cores premium e upgrades visuais futuros",
      "Experiência mais refinada e inteligente",
    ],
    highlightTitle: "Feito para quem quer mais que organização",
    highlightText:
      "O Premium transforma o Vida em Ordem em um centro pessoal de direção, constância e evolução, com uma experiência mais elegante e estratégica.",
    subscribeButton: "Assinar Premium",
    testPremium: "Testar modo Premium",
    testPremiumActive: "Modo Premium ativo",
    testFree: "Testar modo Free",
    testFreeActive: "Modo Free ativo",
    footerNote:
      "Pagamentos e gerenciamento do plano são processados com segurança pela Stripe.",
    premiumOnTitle: "Modo Premium ativado",
    premiumOnText: "O Premium foi ativado em modo teste neste dispositivo.",
    premiumOnError: "Não foi possível ativar o modo Premium.",
    freeOnTitle: "Modo Free ativado",
    freeOnText: "O app voltou para o plano Free neste dispositivo.",
    freeOnError: "Não foi possível ativar o modo Free.",
    checkoutTitle: "Checkout em breve",
    checkoutText:
      "A tela já está pronta para receber o checkout real. No próximo passo, vamos conectar a assinatura.",
  },
  en: {
    title: "Subscription",
    subtitle: "Choose the plan that unlocks the fullest Vida em Ordem experience.",
    eyebrow: "VIDA EM ORDEM PREMIUM",
    heroTitle: "Choose your plan",
    heroSubtitle:
      "Turn the app into a complete dashboard for organization, growth, and personal clarity.",
    pillIntelligence: "More intelligence",
    pillDepth: "More depth",
    monthlyLabel: "Monthly plan",
    monthlyPeriod: "per month",
    yearlyLabel: "Yearly plan",
    yearlyPeriod: "save over the year",
    mostPopular: "Most popular",
    freeBadge: "FREE",
    freeTitle: "Start with the essentials",
    freeDescription: "To organize your routine foundation and try the app at your pace.",
    freeItems: [
      "Essential features to begin",
      "Per-module limits",
      "Initial access to the ecosystem",
      "Personal organization foundation",
    ],
    premiumBadge: "PREMIUM",
    premiumTitle: "Grow with more power",
    premiumDescription:
      "For anyone who wants a more complete, intelligent, and refined experience.",
    premiumItems: [
      "Expanded access across modules",
      "Deeper analysis",
      "Fewer locks and more intelligence",
      "More personalization and future upgrades",
    ],
    benefitsTitle: "What Premium unlocks",
    benefits: [
      "Open Finance with bank connection",
      "Complete reports and advanced insights",
      "Smart filters and detailed analysis",
      "More limits and unlocks per module",
      "Premium colors and future visual upgrades",
      "A more refined and intelligent experience",
    ],
    highlightTitle: "Built for people who want more than organization",
    highlightText:
      "Premium turns Vida em Ordem into a personal center for direction, consistency, and growth with a more elegant and strategic experience.",
    subscribeButton: "Subscribe to Premium",
    testPremium: "Try Premium mode",
    testPremiumActive: "Premium mode active",
    testFree: "Try Free mode",
    testFreeActive: "Free mode active",
    footerNote:
      "Payments and plan management are securely handled by Stripe.",
    premiumOnTitle: "Premium mode enabled",
    premiumOnText: "Premium has been enabled in test mode on this device.",
    premiumOnError: "Could not enable Premium mode.",
    freeOnTitle: "Free mode enabled",
    freeOnText: "The app switched back to the Free plan on this device.",
    freeOnError: "Could not enable Free mode.",
    checkoutTitle: "Checkout coming soon",
    checkoutText:
      "This screen is ready for the real checkout. In the next step, we'll connect the subscription flow.",
  },
  es: {
    title: "Suscripción",
    subtitle:
      "Elige el plan que desbloquea la experiencia más completa de Vida em Ordem.",
    eyebrow: "VIDA EM ORDEM PREMIUM",
    heroTitle: "Elige tu plan",
    heroSubtitle:
      "Convierte la app en un panel completo de organización, evolución y claridad personal.",
    pillIntelligence: "Más inteligencia",
    pillDepth: "Más profundidad",
    monthlyLabel: "Plan mensual",
    monthlyPeriod: "por mes",
    yearlyLabel: "Plan anual",
    yearlyPeriod: "ahorro en el año",
    mostPopular: "Más popular",
    freeBadge: "FREE",
    freeTitle: "Empezar con lo esencial",
    freeDescription: "Para organizar la base de tu rutina y probar la app a tu ritmo.",
    freeItems: [
      "Recursos esenciales para empezar",
      "Límites por módulo",
      "Uso inicial del ecosistema",
      "Base de organización personal",
    ],
    premiumBadge: "PREMIUM",
    premiumTitle: "Evolucionar con más poder",
    premiumDescription:
      "Para quien quiere una experiencia más completa, inteligente y refinada.",
    premiumItems: [
      "Acceso ampliado a los módulos",
      "Análisis más profundos",
      "Menos bloqueos y más inteligencia",
      "Más personalización y futuras mejoras",
    ],
    benefitsTitle: "Lo que desbloquea Premium",
    benefits: [
      "Open Finance con conexión bancaria",
      "Informes completos y visión avanzada",
      "Filtros inteligentes y análisis detallado",
      "Más límites y desbloqueos por módulo",
      "Colores premium y futuras mejoras visuales",
      "Una experiencia más refinada e inteligente",
    ],
    highlightTitle: "Hecho para quien quiere más que organización",
    highlightText:
      "Premium transforma Vida em Ordem en un centro personal de dirección, constancia y evolución, con una experiencia más elegante y estratégica.",
    subscribeButton: "Suscribirse a Premium",
    testPremium: "Probar modo Premium",
    testPremiumActive: "Modo Premium activo",
    testFree: "Probar modo Free",
    testFreeActive: "Modo Free activo",
    footerNote:
      "Los pagos y la gestión del plan se procesan de forma segura con Stripe.",
    premiumOnTitle: "Modo Premium activado",
    premiumOnText: "Premium fue activado en modo de prueba en este dispositivo.",
    premiumOnError: "No se pudo activar el modo Premium.",
    freeOnTitle: "Modo Free activado",
    freeOnText: "La app volvió al plan Free en este dispositivo.",
    freeOnError: "No se pudo activar el modo Free.",
    checkoutTitle: "Checkout pronto",
    checkoutText:
      "La pantalla ya está lista para recibir el checkout real. En el siguiente paso conectaremos la suscripción.",
  },
  fr: {
    title: "Abonnement",
    subtitle:
      "Choisissez le plan qui débloque l'expérience la plus complète de Vida em Ordem.",
    eyebrow: "VIDA EM ORDEM PREMIUM",
    heroTitle: "Choisissez votre plan",
    heroSubtitle:
      "Transformez l'app en un tableau complet d'organisation, d'évolution et de clarté personnelle.",
    pillIntelligence: "Plus d'intelligence",
    pillDepth: "Plus de profondeur",
    monthlyLabel: "Plan mensuel",
    monthlyPeriod: "par mois",
    yearlyLabel: "Plan annuel",
    yearlyPeriod: "économie sur l'année",
    mostPopular: "Le plus populaire",
    freeBadge: "FREE",
    freeTitle: "Commencer avec l'essentiel",
    freeDescription:
      "Pour organiser la base de votre routine et tester l'app à votre rythme.",
    freeItems: [
      "Fonctions essentielles pour commencer",
      "Limites par module",
      "Usage initial de l'écosystème",
      "Base d'organisation personnelle",
    ],
    premiumBadge: "PREMIUM",
    premiumTitle: "Évoluer avec plus de puissance",
    premiumDescription:
      "Pour ceux qui veulent une expérience plus complète, intelligente et raffinée.",
    premiumItems: [
      "Accès étendu aux modules",
      "Analyses plus approfondies",
      "Moins de blocages et plus d'intelligence",
      "Plus de personnalisation et d'évolutions futures",
    ],
    benefitsTitle: "Ce que débloque Premium",
    benefits: [
      "Open Finance avec connexion bancaire",
      "Rapports complets et vue avancée",
      "Filtres intelligents et analyse détaillée",
      "Plus de limites et de déverrouillages par module",
      "Couleurs premium et futures améliorations visuelles",
      "Une expérience plus raffinée et intelligente",
    ],
    highlightTitle: "Pensé pour celles et ceux qui veulent plus qu'organisation",
    highlightText:
      "Premium transforme Vida em Ordem en un centre personnel de direction, de constance et d'évolution, avec une expérience plus élégante et stratégique.",
    subscribeButton: "S'abonner à Premium",
    testPremium: "Tester le mode Premium",
    testPremiumActive: "Mode Premium actif",
    testFree: "Tester le mode Free",
    testFreeActive: "Mode Free actif",
    footerNote:
      "Les paiements et la gestion du plan sont traités de manière sécurisée par Stripe.",
    premiumOnTitle: "Mode Premium activé",
    premiumOnText: "Premium a été activé en mode test sur cet appareil.",
    premiumOnError: "Impossible d'activer le mode Premium.",
    freeOnTitle: "Mode Free activé",
    freeOnText: "L'app est revenue au plan Free sur cet appareil.",
    freeOnError: "Impossible d'activer le mode Free.",
    checkoutTitle: "Checkout bientôt disponible",
    checkoutText:
      "Cet écran est déjà prêt pour le vrai checkout. À la prochaine étape, nous connecterons l'abonnement.",
  },
  it: {
    title: "Abbonamento",
    subtitle:
      "Scegli il piano che sblocca l'esperienza più completa di Vida em Ordem.",
    eyebrow: "VIDA EM ORDEM PREMIUM",
    heroTitle: "Scegli il tuo piano",
    heroSubtitle:
      "Trasforma l'app in un pannello completo di organizzazione, evoluzione e chiarezza personale.",
    pillIntelligence: "Più intelligenza",
    pillDepth: "Più profondità",
    monthlyLabel: "Piano mensile",
    monthlyPeriod: "al mese",
    yearlyLabel: "Piano annuale",
    yearlyPeriod: "risparmio nell'anno",
    mostPopular: "Più scelto",
    freeBadge: "FREE",
    freeTitle: "Inizia con l'essenziale",
    freeDescription:
      "Per organizzare la base della tua routine e provare l'app con il tuo ritmo.",
    freeItems: [
      "Funzioni essenziali per iniziare",
      "Limiti per modulo",
      "Uso iniziale dell'ecosistema",
      "Base di organizzazione personale",
    ],
    premiumBadge: "PREMIUM",
    premiumTitle: "Evolvi con più potenza",
    premiumDescription:
      "Per chi vuole un'esperienza più completa, intelligente e raffinata.",
    premiumItems: [
      "Accesso esteso ai moduli",
      "Analisi più profonde",
      "Meno blocchi e più intelligenza",
      "Più personalizzazione e futuri upgrade",
    ],
    benefitsTitle: "Cosa sblocca Premium",
    benefits: [
      "Open Finance con connessione bancaria",
      "Report completi e visione avanzata",
      "Filtri intelligenti e analisi dettagliata",
      "Più limiti e sblocchi per modulo",
      "Colori premium e futuri upgrade visivi",
      "Un'esperienza più raffinata e intelligente",
    ],
    highlightTitle: "Pensato per chi vuole più che organizzazione",
    highlightText:
      "Premium trasforma Vida em Ordem in un centro personale di direzione, costanza ed evoluzione, con un'esperienza più elegante e strategica.",
    subscribeButton: "Abbonati a Premium",
    testPremium: "Prova la modalità Premium",
    testPremiumActive: "Modalità Premium attiva",
    testFree: "Prova la modalità Free",
    testFreeActive: "Modalità Free attiva",
    footerNote:
      "Pagamenti e gestione del piano sono elaborati in modo sicuro da Stripe.",
    premiumOnTitle: "Modalità Premium attivata",
    premiumOnText: "Premium è stato attivato in modalità test su questo dispositivo.",
    premiumOnError: "Non è stato possibile attivare la modalità Premium.",
    freeOnTitle: "Modalità Free attivata",
    freeOnText: "L'app è tornata al piano Free su questo dispositivo.",
    freeOnError: "Non è stato possibile attivare la modalità Free.",
    checkoutTitle: "Checkout in arrivo",
    checkoutText:
      "Questa schermata è già pronta per il checkout reale. Nel prossimo passo collegheremo l'abbonamento.",
  },
} as const;

const billingInboxCopy = {
  pt: {
    checkoutTitle: "Checkout Premium aberto",
    checkoutMessage:
      "Seu checkout externo foi aberto para concluir a assinatura do Vida em Ordem.",
    manageTitle: "Gerenciamento do plano aberto",
    manageMessage:
      "Sua área externa de gerenciamento do plano foi aberta pelo app.",
  },
  en: {
    checkoutTitle: "Premium checkout opened",
    checkoutMessage:
      "Your external checkout was opened so you can finish the Vida em Ordem subscription.",
    manageTitle: "Plan management opened",
    manageMessage:
      "Your external plan management area was opened by the app.",
  },
  es: {
    checkoutTitle: "Checkout Premium abierto",
    checkoutMessage:
      "Tu checkout externo se abrió para finalizar la suscripción de Vida em Ordem.",
    manageTitle: "Gestión del plan abierta",
    manageMessage:
      "La zona externa de gestión del plan fue abierta por la app.",
  },
  fr: {
    checkoutTitle: "Checkout Premium ouvert",
    checkoutMessage:
      "Votre checkout externe a été ouvert pour finaliser l'abonnement Vida em Ordem.",
    manageTitle: "Gestion du plan ouverte",
    manageMessage:
      "L'espace externe de gestion de votre plan a été ouvert par l'app.",
  },
  it: {
    checkoutTitle: "Checkout Premium aperto",
    checkoutMessage:
      "Il checkout esterno è stato aperto per completare l'abbonamento a Vida em Ordem.",
    manageTitle: "Gestione del piano aperta",
    manageMessage:
      "L'area esterna di gestione del piano è stata aperta dall'app.",
  },
} as const;

export default function AssinaturaScreen() {
  const insets = useSafeAreaInsets();
  const { settings, colors, patchAppSettings } = useAppTheme();
  const { language, t } = useAppLanguage();
  const copy = copyByLanguage[language];
  const showDebugPlanActions = __DEV__;

  useFocusEffect(
    React.useCallback(() => {
      void (async () => {
        try {
          const status = await getBillingStatus();
          const nextPlan =
            status.subscription?.plan === "premium" || status.plan === "premium"
              ? "premium"
              : "free";

          if (settings.plan !== nextPlan) {
            await patchAppSettings({ plan: nextPlan });
          }
        } catch (error) {
          console.log("Erro ao sincronizar status da assinatura:", error);
        }
      })();
    }, [patchAppSettings, settings.plan])
  );

  async function testarModoPremium() {
    try {
      await patchAppSettings({ plan: "premium" });

      Alert.alert(copy.premiumOnTitle, copy.premiumOnText, [
        {
          text: t("common.ok"),
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (error) {
      console.log("Erro ao ativar premium:", error);
      Alert.alert(t("common.error"), copy.premiumOnError);
    }
  }

  async function testarModoFree() {
    try {
      await patchAppSettings({ plan: "free" });

      Alert.alert(copy.freeOnTitle, copy.freeOnText, [
        {
          text: t("common.ok"),
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (error) {
      console.log("Erro ao ativar free:", error);
      Alert.alert(t("common.error"), copy.freeOnError);
    }
  }

  function handlePrimaryBillingAction() {
    void (async () => {
      try {
        const billingCopy = billingInboxCopy[language];

        if (settings.plan === "premium") {
          await openManagePlan({
            inboxTitle: billingCopy.manageTitle,
            inboxMessage: billingCopy.manageMessage,
            actionRoute: "/assinatura",
          });
          return;
        }

        await openPremiumCheckout({
          inboxTitle: billingCopy.checkoutTitle,
          inboxMessage: billingCopy.checkoutMessage,
          actionRoute: "/assinatura",
        });
      } catch (error: any) {
        Alert.alert(
          settings.plan === "premium" ? t("common.managePlan") : copy.checkoutTitle,
          error?.message || copy.checkoutText,
          [{ text: t("common.gotIt") }]
        );
      }
    })();
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={{ backgroundColor: colors.background }}
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
          badgeLabel={settings.plan === "premium" ? t("common.premium") : t("common.free")}
          badgeTone={settings.plan === "premium" ? "success" : "accent"}
        />

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{copy.eyebrow}</Text>

          <Text style={[styles.title, { color: colors.text }]}>{copy.heroTitle}</Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {copy.heroSubtitle}
          </Text>

          <View style={styles.heroMiniRow}>
            <View
              style={[
                styles.heroMiniPill,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Text style={[styles.heroMiniPillText, { color: colors.accent }]}>
                {copy.pillIntelligence}
              </Text>
            </View>

            <View
              style={[
                styles.heroMiniPill,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.heroMiniPillText, { color: colors.textMuted }]}>
                {copy.pillDepth}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pricingGrid}>
          <View
            style={[
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
              {copy.monthlyLabel}
            </Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>R$ 19,90</Text>
            <Text style={[styles.priceSubText, { color: colors.textSecondary }]}>
              {copy.monthlyPeriod}
            </Text>
          </View>

          <View
            style={[
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <View
              style={[
                styles.popularBadge,
                {
                  backgroundColor: colors.accent,
                },
              ]}
            >
              <Text style={styles.popularBadgeText}>{copy.mostPopular}</Text>
            </View>

            <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
              {copy.yearlyLabel}
            </Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>R$ 149,90</Text>
            <Text style={[styles.priceSubText, { color: colors.textSecondary }]}>
              {copy.yearlyPeriod}
            </Text>
          </View>
        </View>

        <View style={styles.compareWrap}>
          <View
            style={[
              styles.compareCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.planBadge,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.textMuted,
                },
              ]}
            >
              {copy.freeBadge}
            </Text>

            <Text style={[styles.planTitle, { color: colors.text }]}>{copy.freeTitle}</Text>

            <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
              {copy.freeDescription}
            </Text>

            <View style={styles.featureList}>
              {copy.freeItems.map((item) => (
                <Text key={item} style={[styles.featureItem, { color: colors.text }]}>
                  • {item}
                </Text>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.compareCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.planBadge,
                {
                  backgroundColor: colors.accentSoft,
                  color: colors.accent,
                },
              ]}
            >
              {copy.premiumBadge}
            </Text>

            <Text style={[styles.planTitle, { color: colors.text }]}>{copy.premiumTitle}</Text>

            <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
              {copy.premiumDescription}
            </Text>

            <View style={styles.featureList}>
              {copy.premiumItems.map((item) => (
                <Text key={item} style={[styles.featureItem, { color: colors.text }]}>
                  • {item}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.benefitsCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>
            {copy.benefitsTitle}
          </Text>

          <View style={styles.benefitsList}>
            {copy.benefits.map((item) => (
              <View key={item} style={styles.benefitRow}>
                <View
                  style={[
                    styles.benefitDot,
                    {
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
                <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.highlightCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accentBorder,
            },
          ]}
        >
          <Text style={[styles.highlightTitle, { color: colors.text }]}>
            {copy.highlightTitle}
          </Text>

          <Text style={[styles.highlightText, { color: colors.textSecondary }]}>
            {copy.highlightText}
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
          onPress={handlePrimaryBillingAction}
        >
          <Text style={[styles.primaryButtonText, { color: colors.accentButtonText }]}>
            {settings.plan === "premium" ? t("common.managePlan") : copy.subscribeButton}
          </Text>
        </Pressable>

        {showDebugPlanActions ? (
          <>
            <Pressable
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={testarModoPremium}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                {settings.plan === "premium" ? copy.testPremiumActive : copy.testPremium}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.ghostButton, { borderColor: colors.border }]}
              onPress={testarModoFree}
            >
              <Text style={[styles.ghostButtonText, { color: colors.textMuted }]}>
                {settings.plan === "free" ? copy.testFreeActive : copy.testFree}
              </Text>
            </Pressable>
          </>
        ) : null}

        <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
          {copy.footerNote}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },

  heroMiniRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },

  heroMiniPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  heroMiniPillText: {
    fontSize: 12,
    fontWeight: "800",
  },

  pricingGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },

  priceCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 124,
    justifyContent: "center",
  },

  popularBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },

  popularBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },

  priceLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },

  priceValue: {
    fontSize: 26,
    fontWeight: "900",
  },

  priceSubText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  compareWrap: {
    gap: 14,
    marginBottom: 18,
  },

  compareCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },

  planBadge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },

  planTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  planDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 14,
  },

  featureList: {
    gap: 8,
  },

  featureItem: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },

  benefitsCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },

  benefitsTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 14,
  },

  benefitsList: {
    gap: 12,
  },

  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },

  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },

  highlightCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },

  highlightTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },

  highlightText: {
    fontSize: 13,
    lineHeight: 21,
  },

  primaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },

  ghostButton: {
    backgroundColor: "transparent",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  ghostButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },

  footerNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 16,
  },

  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
