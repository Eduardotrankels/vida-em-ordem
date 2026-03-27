import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppScreenHeader from "../../components/AppScreenHeader";
import { useAppLanguage } from "../utils/languageContext";
import { useAppTheme } from "../utils/themeContext";

export default function BillingCancelScreen() {
  const { colors } = useAppTheme();
  const { language } = useAppLanguage();

  const copy = useMemo(
    () =>
      ({
        pt: {
          title: "Pagamento cancelado",
          subtitle: "Nenhuma cobrança foi concluída.",
          text:
            "Tudo certo. Seu plano continua como está e você pode tentar novamente quando quiser.",
          backPlan: "Voltar ao plano",
          backHome: "Ir para a Home",
        },
        en: {
          title: "Payment cancelled",
          subtitle: "No charge was completed.",
          text:
            "All good. Your plan stays as it is and you can try again whenever you want.",
          backPlan: "Back to plan",
          backHome: "Go to Home",
        },
        es: {
          title: "Pago cancelado",
          subtitle: "No se completó ningún cobro.",
          text:
            "Todo bien. Tu plan sigue igual y puedes volver a intentarlo cuando quieras.",
          backPlan: "Volver al plan",
          backHome: "Ir al inicio",
        },
        fr: {
          title: "Paiement annule",
          subtitle: "Aucun paiement n'a ete finalise.",
          text:
            "Tout va bien. Votre plan reste inchangé et vous pourrez reessayer quand vous voulez.",
          backPlan: "Retour au plan",
          backHome: "Aller a l'accueil",
        },
        it: {
          title: "Pagamento annullato",
          subtitle: "Nessun addebito e stato completato.",
          text:
            "Va tutto bene. Il tuo piano resta invariato e potrai riprovare quando vuoi.",
          backPlan: "Torna al piano",
          backHome: "Vai alla Home",
        },
      })[language],
    [language]
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.container}>
        <AppScreenHeader
          title={copy.title}
          subtitle={copy.subtitle}
          icon="close-circle-outline"
          showNotifications={false}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.text, { color: colors.text }]}>{copy.text}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={() => router.replace("/assinatura")}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.accentButtonText },
                ]}
              >
                {copy.backPlan}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                {copy.backHome}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  actions: {
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
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
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
