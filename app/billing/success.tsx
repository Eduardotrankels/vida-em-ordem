import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppScreenHeader from "../../components/AppScreenHeader";
import { confirmCheckoutSession } from "../services/billing";
import { pushInboxNotification } from "../utils/notificationInbox";
import { useAppLanguage } from "../utils/languageContext";
import { useAppTheme } from "../utils/themeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_UNLOCKED_KEY = "@vida_em_ordem_app_unlocked_v1";

export default function BillingSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const { colors, patchAppSettings } = useAppTheme();
  const { language } = useAppLanguage();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const copy = useMemo(
    () =>
      ({
        pt: {
          title: "Pagamento recebido",
          subtitle: "Estamos confirmando sua assinatura Premium.",
          loading: "Aguarde alguns segundos enquanto validamos seu pagamento.",
          success:
            "Seu Premium foi confirmado. O app já está pronto para liberar os recursos pagos.",
          error:
            "Ainda não foi possível confirmar a assinatura. Se o pagamento acabou de ser feito, tente novamente em alguns instantes.",
          openPlan: "Ver meu plano",
          goHome: "Ir para a Home",
        },
        en: {
          title: "Payment received",
          subtitle: "We are confirming your Premium subscription.",
          loading: "Please wait a few seconds while we validate your payment.",
          success:
            "Your Premium was confirmed. The app is ready to unlock the paid features.",
          error:
            "We could not confirm the subscription yet. If the payment was just completed, try again in a few moments.",
          openPlan: "View my plan",
          goHome: "Go to Home",
        },
        es: {
          title: "Pago recibido",
          subtitle: "Estamos confirmando tu suscripción Premium.",
          loading: "Espera unos segundos mientras validamos tu pago.",
          success:
            "Tu Premium fue confirmado. La app ya puede liberar los recursos pagos.",
          error:
            "Aún no fue posible confirmar la suscripción. Si el pago acaba de hacerse, vuelve a intentarlo en unos momentos.",
          openPlan: "Ver mi plan",
          goHome: "Ir al inicio",
        },
        fr: {
          title: "Paiement recu",
          subtitle: "Nous confirmons votre abonnement Premium.",
          loading: "Attendez quelques secondes pendant la validation du paiement.",
          success:
            "Votre Premium a ete confirme. L'app peut maintenant liberer les fonctions payantes.",
          error:
            "Nous ne pouvons pas encore confirmer l'abonnement. Si le paiement vient d'etre effectue, reessayez dans quelques instants.",
          openPlan: "Voir mon plan",
          goHome: "Aller a l'accueil",
        },
        it: {
          title: "Pagamento ricevuto",
          subtitle: "Stiamo confermando il tuo abbonamento Premium.",
          loading: "Attendi qualche secondo mentre validiamo il pagamento.",
          success:
            "Il tuo Premium e stato confermato. L'app e pronta a sbloccare le funzioni a pagamento.",
          error:
            "Non e stato ancora possibile confermare l'abbonamento. Se il pagamento e appena stato effettuato, riprova tra poco.",
          openPlan: "Vedi il mio piano",
          goHome: "Vai alla Home",
        },
      })[language],
    [language]
  );

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!session_id || Array.isArray(session_id)) {
        setStatus("error");
        setMessage(copy.error);
        return;
      }

      try {
        const result = await confirmCheckoutSession(session_id);
        const premiumConfirmed =
          result.subscription?.plan === "premium" || result.plan === "premium";

        if (!premiumConfirmed) {
          throw new Error(copy.error);
        }

        await patchAppSettings({ plan: "premium" });
        await AsyncStorage.setItem(APP_UNLOCKED_KEY, "true");
        await pushInboxNotification({
          kind: "billing",
          title:
            language === "pt"
              ? "Premium confirmado"
              : language === "en"
              ? "Premium confirmed"
              : language === "es"
              ? "Premium confirmado"
              : language === "fr"
              ? "Premium confirme"
              : "Premium confermato",
          message: copy.success,
          actionRoute: "/assinatura",
          source: "billing",
          sourceId: `premium-confirmed-${session_id}`,
        });

        if (!cancelled) {
          setStatus("success");
          setMessage(copy.success);
        }
      } catch (error: any) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error?.message || copy.error);
        }
      }
    }

    void validate();

    return () => {
      cancelled = true;
    };
  }, [copy.error, copy.success, language, patchAppSettings, session_id]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.container}>
        <AppScreenHeader
          title={copy.title}
          subtitle={copy.subtitle}
          icon="card-outline"
          showNotifications={false}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor:
                status === "success" ? colors.success : status === "error" ? colors.danger : colors.accentBorder,
            },
          ]}
        >
          <Text style={[styles.status, { color: colors.text }]}>
            {status === "loading" ? copy.loading : message}
          </Text>

          {status !== "loading" ? (
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
                  {copy.openPlan}
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
                  {copy.goHome}
                </Text>
              </Pressable>
            </View>
          ) : null}
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
  status: {
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
