import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { APP_SESSION_KEY } from "./utils/appSession";
import { AI_ONBOARDING_KEY } from "./utils/lifeJourney";
import { useAppLanguage } from "./utils/languageContext";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const USER_PROFILE_KEY = "@vida_em_ordem_user_profile_v1";
const APP_PIN_KEY = "@vida_em_ordem_app_pin_v1";
const APP_UNLOCKED_KEY = "@vida_em_ordem_app_unlocked_v1";

const accessCopy = {
  pt: {
    title: "Proteja seu acesso",
    subtitle:
      "Como você entrou com Google, falta só criar um PIN local para bloquear o app com segurança.",
    cardEyebrow: "Acesso do app",
    cardTitle: "Crie um PIN de 4 dígitos",
    cardText:
      "Esse PIN será pedido sempre que o app for aberto novamente. Se o aparelho tiver biometria, você também poderá entrar com digital ou rosto.",
    currentAccount: "Conta conectada",
    pinLabel: "PIN de acesso",
    pinConfirm: "Confirmar PIN",
    pinPlaceholder: "0000",
    infoText:
      "Depois disso, seu Google continua conectado, mas o acesso ao app fica protegido como nos melhores aplicativos.",
    action: "Salvar e continuar",
    validationPin: "O PIN deve ter exatamente 4 números.",
    validationMatch: "A confirmação do PIN não confere.",
    missingAccount: "Não encontramos sua conta Google. Vamos voltar para a entrada.",
    saveError: "Não foi possível salvar seu PIN agora.",
  },
  en: {
    title: "Protect your access",
    subtitle:
      "Since you signed in with Google, the last step is creating a local PIN to keep the app secure.",
    cardEyebrow: "App access",
    cardTitle: "Create a 4-digit PIN",
    cardText:
      "This PIN will be requested whenever the app is opened again. If your device has biometrics, you will also be able to unlock with fingerprint or face.",
    currentAccount: "Connected account",
    pinLabel: "Access PIN",
    pinConfirm: "Confirm PIN",
    pinPlaceholder: "0000",
    infoText:
      "After this, Google stays connected, but app access becomes protected like in top-tier apps.",
    action: "Save and continue",
    validationPin: "Your PIN must contain exactly 4 digits.",
    validationMatch: "The PIN confirmation does not match.",
    missingAccount: "We could not find your Google account. We will take you back to the entry screen.",
    saveError: "Could not save your PIN right now.",
  },
  es: {
    title: "Protege tu acceso",
    subtitle:
      "Como entraste con Google, solo falta crear un PIN local para mantener la app protegida.",
    cardEyebrow: "Acceso de la app",
    cardTitle: "Crea un PIN de 4 dígitos",
    cardText:
      "Este PIN se pedirá siempre que vuelvas a abrir la app. Si el dispositivo tiene biometría, también podrás entrar con huella o rostro.",
    currentAccount: "Cuenta conectada",
    pinLabel: "PIN de acceso",
    pinConfirm: "Confirmar PIN",
    pinPlaceholder: "0000",
    infoText:
      "Después de esto, tu Google seguirá conectado, pero el acceso a la app quedará protegido como en las mejores aplicaciones.",
    action: "Guardar y continuar",
    validationPin: "El PIN debe tener exactamente 4 números.",
    validationMatch: "La confirmación del PIN no coincide.",
    missingAccount: "No encontramos tu cuenta de Google. Volveremos a la pantalla de entrada.",
    saveError: "No fue posible guardar tu PIN ahora.",
  },
  fr: {
    title: "Protégez votre accès",
    subtitle:
      "Comme vous êtes entré avec Google, il ne reste qu'à créer un PIN local pour sécuriser l'app.",
    cardEyebrow: "Accès à l'app",
    cardTitle: "Créez un PIN à 4 chiffres",
    cardText:
      "Ce PIN sera demandé chaque fois que l'application sera ouverte de nouveau. Si l'appareil dispose de biométrie, vous pourrez aussi entrer avec empreinte ou visage.",
    currentAccount: "Compte connecté",
    pinLabel: "PIN d'accès",
    pinConfirm: "Confirmer le PIN",
    pinPlaceholder: "0000",
    infoText:
      "Après cela, Google restera connecté, mais l'accès à l'app sera protégé comme dans les meilleures applications.",
    action: "Enregistrer et continuer",
    validationPin: "Le PIN doit contenir exactement 4 chiffres.",
    validationMatch: "La confirmation du PIN ne correspond pas.",
    missingAccount: "Nous n'avons pas trouvé votre compte Google. Retour à l'écran d'entrée.",
    saveError: "Impossible d'enregistrer votre PIN pour le moment.",
  },
  it: {
    title: "Proteggi il tuo accesso",
    subtitle:
      "Dato che sei entrato con Google, manca solo un PIN locale per mantenere l'app protetta.",
    cardEyebrow: "Accesso all'app",
    cardTitle: "Crea un PIN di 4 cifre",
    cardText:
      "Questo PIN verrà richiesto ogni volta che riaprirai l'app. Se il dispositivo ha la biometria, potrai entrare anche con impronta o volto.",
    currentAccount: "Account collegato",
    pinLabel: "PIN di accesso",
    pinConfirm: "Conferma PIN",
    pinPlaceholder: "0000",
    infoText:
      "Dopo questo passaggio, Google resterà collegato, ma l'accesso all'app sarà protetto come nelle migliori applicazioni.",
    action: "Salva e continua",
    validationPin: "Il PIN deve contenere esattamente 4 numeri.",
    validationMatch: "La conferma del PIN non coincide.",
    missingAccount: "Non abbiamo trovato il tuo account Google. Torneremo alla schermata iniziale.",
    saveError: "Non è stato possibile salvare il PIN in questo momento.",
  },
} as const;

export default function ConfigurarAcessoScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { language, t } = useAppLanguage();
  const copy = accessCopy[language];
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [accountLabel, setAccountLabel] = useState("");

  const loadGoogleAccount = useCallback(async () => {
    try {
      const [profileRaw, sessionRaw] = await Promise.all([
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(APP_SESSION_KEY),
      ]);
      const session =
        sessionRaw && typeof sessionRaw === "string"
          ? JSON.parse(sessionRaw)
          : null;
      const profile =
        profileRaw && typeof profileRaw === "string"
          ? JSON.parse(profileRaw)
          : null;

      if (!profile || session?.provider !== "google") {
        Alert.alert(t("common.attention"), copy.missingAccount, [
          {
            text: t("common.ok"),
            onPress: () => router.replace("/welcome"),
          },
        ]);
        return;
      }

      const nextAccountLabel =
        profile.email || profile.nickname || profile.name || "Google";
      setAccountLabel(nextAccountLabel);
    } catch (error) {
      console.log("Erro ao preparar configuração de acesso Google:", error);
      Alert.alert(t("common.error"), copy.missingAccount, [
        {
          text: t("common.ok"),
          onPress: () => router.replace("/welcome"),
        },
      ]);
    }
  }, [copy.missingAccount, t]);

  useFocusEffect(
    useCallback(() => {
      void loadGoogleAccount();
    }, [loadGoogleAccount])
  );

  const handleSavePin = useCallback(async () => {
    const cleanPin = pin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      Alert.alert(t("common.attention"), copy.validationPin);
      return;
    }

    if (cleanPin !== cleanConfirmPin) {
      Alert.alert(t("common.attention"), copy.validationMatch);
      return;
    }

    try {
      const aiOnboardingRaw = await AsyncStorage.getItem(AI_ONBOARDING_KEY);
      await AsyncStorage.setItem(APP_PIN_KEY, cleanPin);
      await AsyncStorage.setItem(APP_UNLOCKED_KEY, "true");

      router.replace(aiOnboardingRaw ? "/(tabs)" : "/onboarding-ia");
    } catch (error) {
      console.log("Erro ao salvar PIN de acesso:", error);
      Alert.alert(t("common.error"), copy.saveError);
    }
  }, [
    confirmPin,
    copy.saveError,
    copy.validationMatch,
    copy.validationPin,
    pin,
    t,
  ]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.select({ ios: 12, android: 24 })}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: getScreenContentBottomPadding(
                insets.bottom,
                "form"
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppScreenHeader
            title={copy.title}
            subtitle={copy.subtitle}
            icon="shield-checkmark-outline"
            showBack={false}
            badgeLabel={t("common.premium")}
            badgeTone="accent"
          />

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              {copy.cardEyebrow}
            </Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {copy.cardTitle}
            </Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {copy.cardText}
            </Text>

            <View
              style={[
                styles.accountPill,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.accountLabel, { color: colors.textMuted }]}>
                {copy.currentAccount}
              </Text>
              <Text style={[styles.accountValue, { color: colors.text }]}>
                {accountLabel || "Google"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.text }]}>
              {copy.pinLabel}
            </Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder={copy.pinPlaceholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text }]}>
              {copy.pinConfirm}
            </Text>
            <TextInput
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder={copy.pinPlaceholder}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {copy.infoText}
              </Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={handleSavePin}
          >
            <Text
              style={[styles.actionButtonText, { color: colors.accentButtonText }]}
            >
              {copy.action}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 180,
    flexGrow: 1,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  accountPill: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  accountLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  accountValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
  },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 4,
  },
  actionButtonText: {
    fontSize: 14,
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
