import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import VidaEmOrdemLogo from "../components/VidaEmOrdemLogo";
import { linkGoogleAccount } from "./services/appAccountApi";
import {
  configureGoogleNativeSignIn,
  getGoogleNativeModule,
  isExpoGoRuntime,
} from "./utils/googleNativeAuth";
import { ensureAppSession, linkGoogleSession } from "./utils/appSession";
import { AI_ONBOARDING_KEY } from "./utils/lifeJourney";
import { useAppLanguage } from "./utils/languageContext";
import { markWelcomeScreenSeen } from "./utils/welcome";

const USER_PROFILE_KEY = "@vida_em_ordem_user_profile_v1";
const APP_PIN_KEY = "@vida_em_ordem_app_pin_v1";
const APP_UNLOCKED_KEY = "@vida_em_ordem_app_unlocked_v1";

const welcomeCopyByLanguage = {
  pt: {
    title: "Entre no Vida em Ordem",
    subtitle:
      "Uma entrada mais clara e elegante para começar sua jornada com foco.",
    loginTitle: "Acesse sua conta",
    loginSubtitle:
      "Use o e-mail do seu perfil e, por enquanto, o PIN cadastrado como sua senha local.",
    emailLabel: "E-mail",
    emailPlaceholder: "seuemail@exemplo.com",
    passwordLabel: "Senha",
    passwordPlaceholder: "Digite sua senha",
    passwordHint: "Nesta fase, a senha local é o PIN criado no cadastro.",
    enterButton: "Entrar",
    divider: "ou continue com",
    googleButton: "Continuar com Google",
    signUpPrompt: "Ainda não tem cadastro?",
    signUpAction: "Fazer cadastro",
    noAccountTitle: "Cadastro ainda não encontrado",
    noAccountText:
      "Ainda não existe um perfil salvo neste aparelho. Toque em Fazer cadastro para criar sua conta ou use Google para começar com seus dados preenchidos.",
    invalidLoginTitle: "Dados não conferem",
    invalidLoginText:
      "Confira o e-mail e a senha local. Neste momento, a senha do app é o PIN que você criou no cadastro.",
    googleExpoGoTitle: "Google pede Development Build",
    googleExpoGoText:
      "No Expo Go o retorno do OAuth não funciona como em produção. Para validar o Google de verdade, use a Development Build instalada.",
    googleConfigTitle: "Google ainda não configurado",
    googleConfigText:
      "Os client IDs do Google ainda não estão prontos nesta build. Assim que eles estiverem válidos, esse botão entra no fluxo real.",
    googleBusy: "Conectando Google...",
    googleLinkedError: "Não foi possível continuar com Google agora.",
  },
  en: {
    title: "Sign in to Vida em Ordem",
    subtitle:
      "A clearer and more elegant entry to begin your journey with focus.",
    loginTitle: "Access your account",
    loginSubtitle:
      "Use your profile email and, for now, the registered PIN as your local password.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    passwordHint: "At this stage, your local password is the PIN created during sign-up.",
    enterButton: "Sign in",
    divider: "or continue with",
    googleButton: "Continue with Google",
    signUpPrompt: "Don't have an account yet?",
    signUpAction: "Create account",
    noAccountTitle: "Account not found yet",
    noAccountText:
      "There is no saved profile on this device yet. Tap Create account to build your account or use Google to start with your data prefilled.",
    invalidLoginTitle: "Credentials do not match",
    invalidLoginText:
      "Check your email and local password. Right now, the app password is the PIN created during sign-up.",
    googleExpoGoTitle: "Google needs a Development Build",
    googleExpoGoText:
      "Expo Go cannot complete the OAuth return flow like production. To validate Google for real, use the installed Development Build.",
    googleConfigTitle: "Google is not configured yet",
    googleConfigText:
      "The Google client IDs are not ready in this build yet. As soon as they are valid, this button will enter the real flow.",
    googleBusy: "Connecting Google...",
    googleLinkedError: "Could not continue with Google right now.",
  },
  es: {
    title: "Entra en Vida en Orden",
    subtitle:
      "Una entrada más clara y elegante para comenzar tu jornada con enfoque.",
    loginTitle: "Accede a tu cuenta",
    loginSubtitle:
      "Usa el correo de tu perfil y, por ahora, el PIN registrado como tu contraseña local.",
    emailLabel: "Correo",
    emailPlaceholder: "tuemail@ejemplo.com",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "Escribe tu contraseña",
    passwordHint: "En esta fase, tu contraseña local es el PIN creado en el registro.",
    enterButton: "Entrar",
    divider: "o continúa con",
    googleButton: "Continuar con Google",
    signUpPrompt: "¿Aún no tienes cuenta?",
    signUpAction: "Crear cuenta",
    noAccountTitle: "Aún no se encontró el registro",
    noAccountText:
      "Todavía no existe un perfil guardado en este dispositivo. Toca Crear cuenta para registrarte o usa Google para empezar con tus datos ya completos.",
    invalidLoginTitle: "Los datos no coinciden",
    invalidLoginText:
      "Revisa tu correo y tu contraseña local. En este momento, la contraseña de la app es el PIN creado en el registro.",
    googleExpoGoTitle: "Google requiere Development Build",
    googleExpoGoText:
      "En Expo Go el retorno de OAuth no funciona como en producción. Para validar Google de verdad, usa la Development Build instalada.",
    googleConfigTitle: "Google aún no está configurado",
    googleConfigText:
      "Los client IDs de Google todavía no están listos en esta build. En cuanto estén válidos, este botón entrará en el flujo real.",
    googleBusy: "Conectando Google...",
    googleLinkedError: "No fue posible continuar con Google ahora.",
  },
  fr: {
    title: "Entrez dans Vida em Ordem",
    subtitle:
      "Une entrée plus claire et plus élégante pour commencer votre parcours avec focus.",
    loginTitle: "Accédez à votre compte",
    loginSubtitle:
      "Utilisez l'e-mail de votre profil et, pour l'instant, le PIN enregistré comme mot de passe local.",
    emailLabel: "E-mail",
    emailPlaceholder: "votremail@exemple.com",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "Saisissez votre mot de passe",
    passwordHint:
      "À cette étape, votre mot de passe local correspond au PIN créé lors de l'inscription.",
    enterButton: "Entrer",
    divider: "ou continuer avec",
    googleButton: "Continuer avec Google",
    signUpPrompt: "Vous n'avez pas encore de compte ?",
    signUpAction: "Créer un compte",
    noAccountTitle: "Inscription introuvable pour le moment",
    noAccountText:
      "Aucun profil n'est encore enregistré sur cet appareil. Touchez Créer un compte ou utilisez Google pour commencer avec vos données préremplies.",
    invalidLoginTitle: "Les données ne correspondent pas",
    invalidLoginText:
      "Vérifiez votre e-mail et votre mot de passe local. Pour l'instant, le mot de passe de l'app correspond au PIN créé à l'inscription.",
    googleExpoGoTitle: "Google demande un Development Build",
    googleExpoGoText:
      "Dans Expo Go, le retour OAuth ne fonctionne pas comme en production. Pour valider Google pour de vrai, utilisez la Development Build installée.",
    googleConfigTitle: "Google n'est pas encore configuré",
    googleConfigText:
      "Les client IDs Google ne sont pas encore prêts dans cette build. Dès qu'ils seront valides, ce bouton suivra le flux réel.",
    googleBusy: "Connexion Google...",
    googleLinkedError: "Impossible de continuer avec Google pour le moment.",
  },
  it: {
    title: "Entra in Vida em Ordem",
    subtitle:
      "Un ingresso più chiaro ed elegante per iniziare il tuo percorso con focus.",
    loginTitle: "Accedi al tuo account",
    loginSubtitle:
      "Usa l'e-mail del profilo e, per ora, il PIN registrato come password locale.",
    emailLabel: "E-mail",
    emailPlaceholder: "tuamail@esempio.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Inserisci la tua password",
    passwordHint:
      "In questa fase, la tua password locale corrisponde al PIN creato durante la registrazione.",
    enterButton: "Entra",
    divider: "oppure continua con",
    googleButton: "Continua con Google",
    signUpPrompt: "Non hai ancora un account?",
    signUpAction: "Crea account",
    noAccountTitle: "Registrazione non ancora trovata",
    noAccountText:
      "Non esiste ancora un profilo salvato su questo dispositivo. Tocca Crea account oppure usa Google per iniziare con i tuoi dati già compilati.",
    invalidLoginTitle: "I dati non corrispondono",
    invalidLoginText:
      "Controlla e-mail e password locale. In questo momento, la password dell'app è il PIN creato durante la registrazione.",
    googleExpoGoTitle: "Google richiede una Development Build",
    googleExpoGoText:
      "In Expo Go il ritorno OAuth non funziona come in produzione. Per validare Google davvero, usa la Development Build installata.",
    googleConfigTitle: "Google non è ancora configurato",
    googleConfigText:
      "I client ID di Google non sono ancora pronti in questa build. Non appena saranno validi, questo pulsante userà il flusso reale.",
    googleBusy: "Connessione Google...",
    googleLinkedError: "Non è possibile continuare con Google in questo momento.",
  },
} as const;

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z"
        fill="#4285F4"
      />
      <Path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.58-5.05-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <Path
        d="M3.95 10.72A5.4 5.4 0 0 1 3.67 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l2.99-2.33Z"
        fill="#FBBC05"
      />
      <Path
        d="M9 3.58c1.32 0 2.5.46 3.42 1.35l2.56-2.56C13.46.96 11.43 0 9 0A9 9 0 0 0 .96 4.95l2.99 2.33c.71-2.12 2.7-3.7 5.05-3.7Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const { language } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const copy = welcomeCopyByLanguage[language];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(16)).current;
  const logoFloatAnim = useRef(new Animated.Value(0)).current;
  const dotDriftAnim = useRef(new Animated.Value(0)).current;
  const isExpoGo = isExpoGoRuntime();
  const googleNativeModule = useMemo(
    () => (isExpoGo ? null : getGoogleNativeModule()),
    [isExpoGo]
  );
  const GoogleSigninButton = googleNativeModule?.GoogleSigninButton;
  const googleAuthState = useMemo(() => configureGoogleNativeSignIn(), []);
  const isGoogleConfigured = googleAuthState.isConfigured;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoFloatAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(logoFloatAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotDriftAnim, {
            toValue: 1,
            duration: 4400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dotDriftAnim, {
            toValue: 0,
            duration: 4400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [dotDriftAnim, fadeAnim, logoFloatAnim, translateAnim]);

  const floatingTranslateY = logoFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, -8],
  });

  const dotTranslate = dotDriftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  async function handleEnter() {
    try {
      const [profileRaw, pinRaw, aiOnboardingRaw] = await Promise.all([
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(APP_PIN_KEY),
        AsyncStorage.getItem(AI_ONBOARDING_KEY),
      ]);

      if (!profileRaw || !pinRaw) {
        Alert.alert(copy.noAccountTitle, copy.noAccountText);
        return;
      }

      const profile = JSON.parse(profileRaw) as { email?: string };
      const emailMatches =
        profile.email?.trim().toLowerCase() === email.trim().toLowerCase();
      const passwordMatches = pinRaw === password.trim();

      if (!emailMatches || !passwordMatches) {
        Alert.alert(copy.invalidLoginTitle, copy.invalidLoginText);
        return;
      }

      await markWelcomeScreenSeen();
      await AsyncStorage.setItem(APP_UNLOCKED_KEY, "true");

      router.replace(aiOnboardingRaw ? "/(tabs)" : "/onboarding-ia");
    } catch (error) {
      console.log("Erro ao entrar pela tela inicial:", error);
      Alert.alert(copy.invalidLoginTitle, copy.invalidLoginText);
    }
  }

  async function handleGooglePress() {
    if (isExpoGo) {
      Alert.alert(copy.googleExpoGoTitle, copy.googleExpoGoText);
      return;
    }

    if (!isGoogleConfigured || !googleNativeModule) {
      Alert.alert(copy.googleConfigTitle, copy.googleConfigText);
      return;
    }

    try {
      setIsGoogleBusy(true);
      await googleNativeModule.GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await googleNativeModule.GoogleSignin.signIn();

      if (response.type !== "success") {
        setIsGoogleBusy(false);
        return;
      }

      const idToken = response.data.idToken;

      if (!idToken) {
        setIsGoogleBusy(false);
        Alert.alert(copy.googleConfigTitle, copy.googleLinkedError);
        return;
      }

      const session = await ensureAppSession({
        email: email.trim() || undefined,
      });

      const linkedAccount = await linkGoogleAccount({
        userId: session.userId,
        idToken,
        locale: language,
        regionPreference: "auto",
        currencyPreference: "auto",
      });

      await linkGoogleSession({
        name: linkedAccount.name,
        nickname: linkedAccount.nickname,
        email: linkedAccount.email,
        photoUri: linkedAccount.photoUrl,
      });

      const now = new Date().toISOString();
      const nicknameSeed =
        linkedAccount.nickname ||
        linkedAccount.name?.split(/\s+/)[0] ||
        linkedAccount.email?.split("@")[0] ||
        "Usuario";

      await AsyncStorage.setItem(
        USER_PROFILE_KEY,
        JSON.stringify({
          name: linkedAccount.name || nicknameSeed,
          nickname: nicknameSeed,
          email: linkedAccount.email || email.trim(),
          age: "",
          address: "",
          photoUri: linkedAccount.photoUrl || undefined,
          avatarBorderColor: "#2563eb",
          createdAt: now,
        })
      );
      await AsyncStorage.removeItem(APP_PIN_KEY);
      await AsyncStorage.setItem(APP_UNLOCKED_KEY, "false");

      await markWelcomeScreenSeen();
      router.replace("/configurar-acesso");
    } catch (error) {
      console.log("Erro ao abrir Google nativo na abertura:", error);
      setIsGoogleBusy(false);
      Alert.alert(copy.googleConfigTitle, copy.googleLinkedError);
      return;
    }

    setIsGoogleBusy(false);
  }

async function handleGoToCadastro() {
  await markWelcomeScreenSeen();
  router.replace("/cadastro");
}

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + 24, 40) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.brandBlock,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
              },
            ]}
          >
            <View style={styles.heroStage}>
              <View style={styles.logoGlow} />
              <Animated.View
                style={{
                  transform: [{ translateY: floatingTranslateY }],
                }}
              >
                <VidaEmOrdemLogo size={156} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.floatingDot,
                  styles.floatingDotBlue,
                  { transform: [{ translateX: dotTranslate }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.floatingDot,
                  styles.floatingDotYellow,
                  { transform: [{ translateY: floatingTranslateY }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.floatingDot,
                  styles.floatingDotRed,
                  { transform: [{ translateX: Animated.multiply(dotTranslate, -0.7) }] },
                ]}
              />
            </View>

            <Text style={styles.brandName}>vida-em-ordem</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
              },
            ]}
          >
            <Text style={styles.cardTitle}>{copy.loginTitle}</Text>
            <Text style={styles.cardSubtitle}>{copy.loginSubtitle}</Text>

            <Text style={styles.label}>{copy.emailLabel}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={copy.emailPlaceholder}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <Text style={styles.label}>{copy.passwordLabel}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={copy.passwordPlaceholder}
              secureTextEntry
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
            <Text style={styles.helperText}>{copy.passwordHint}</Text>

            <Pressable style={styles.primaryButton} onPress={handleEnter}>
              <Text style={styles.primaryButtonText}>{copy.enterButton}</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{copy.divider}</Text>
              <View style={styles.dividerLine} />
            </View>

            {GoogleSigninButton && !isExpoGo ? (
              <View style={styles.googleButtonWrap}>
                <GoogleSigninButton
                  style={styles.googleNativeButton}
                  size={googleNativeModule.GoogleSigninButton.Size.Wide}
                  color={googleNativeModule.GoogleSigninButton.Color.Light}
                  onPress={handleGooglePress}
                  disabled={isGoogleBusy}
                />
                {isGoogleBusy ? (
                  <Text style={styles.googleBusyText}>{copy.googleBusy}</Text>
                ) : null}
              </View>
            ) : (
              <Pressable style={styles.googleButton} onPress={handleGooglePress}>
                <GoogleMark size={18} />
                <Text style={styles.googleButtonText}>
                  {isGoogleBusy ? copy.googleBusy : copy.googleButton}
                </Text>
              </Pressable>
            )}

            <View style={styles.signUpRow}>
              <Text style={styles.signUpPrompt}>{copy.signUpPrompt}</Text>
              <Pressable onPress={handleGoToCadastro}>
                <Text style={styles.signUpAction}>{copy.signUpAction}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FBFCFE",
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  brandBlock: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 22,
  },
  heroStage: {
    width: 220,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoGlow: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "rgba(44,134,245,0.08)",
  },
  floatingDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  floatingDotBlue: {
    top: 14,
    left: 34,
    backgroundColor: "#3B82F6",
  },
  floatingDotYellow: {
    top: 68,
    right: 30,
    backgroundColor: "#F6B61F",
  },
  floatingDotRed: {
    bottom: 26,
    right: 16,
    backgroundColor: "#F25B4B",
  },
  brandName: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 14,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 320,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  label: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    paddingHorizontal: 14,
    fontSize: 14,
  },
  helperText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#2E86F5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    shadowColor: "#2E86F5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(15,23,42,0.08)",
  },
  dividerText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  googleButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  googleButtonWrap: {
    alignItems: "center",
  },
  googleNativeButton: {
    width: "100%",
    height: 54,
  },
  googleBusyText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  signUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },
  signUpPrompt: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  signUpAction: {
    color: "#2E86F5",
    fontSize: 13,
    fontWeight: "900",
  },
});
