import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, router, usePathname, useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import VidaEmOrdemLogo from "../components/VidaEmOrdemLogo";
import { APP_SESSION_KEY } from "./utils/appSession";
import {
  reloadInactivityWatcherConfig,
  resetInactivityWatcher,
  startInactivityWatcher,
  stopInactivityWatcher,
} from "./utils/appLock";
import { resetGoogleNativeSignInSession } from "./utils/googleNativeAuth";
import { LanguageProvider, useAppLanguage } from "./utils/languageContext";
import { AI_ONBOARDING_KEY } from "./utils/lifeJourney";
import { ThemeProvider, useAppTheme } from "./utils/themeContext";
import {
  APP_WELCOME_SEEN_KEY,
  hasSeenWelcomeScreen,
} from "./utils/welcome";

const USER_PROFILE_KEY = "@vida_em_ordem_user_profile_v1";
const APP_PIN_KEY = "@vida_em_ordem_app_pin_v1";
const APP_UNLOCKED_KEY = "@vida_em_ordem_app_unlocked_v1";
const DEV_RESET_MARKER_KEY = "@vida_em_ordem_dev_reset_marker_v1";
const DEV_WELCOME_RESET_MARKER_KEY = "@vida_em_ordem_dev_welcome_reset_marker_v1";
const DEV_GOOGLE_RESET_MARKER_KEY = "@vida_em_ordem_dev_google_reset_marker_v1";
const FORCE_FRESH_ACCESS_TOKEN = "2026-03-23-fresh-access-reset-6";
const FORCE_WELCOME_RESET_TOKEN = "2026-03-24-welcome-reset-2";
const FORCE_GOOGLE_SIGNUP_RESET_TOKEN = "2026-03-25-google-signup-reset-2";

function RootNavigator() {
  const segments = useSegments();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const { colors, isThemeReady } = useAppTheme();
  const { isLanguageReady, t } = useAppLanguage();

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const throttleRef = useRef(0);
  const startupLockHandledRef = useRef(false);

  useEffect(() => {
    if (!__DEV__) {
      setResetComplete(true);
      return;
    }

    async function ensureFreshAccessReset() {
      try {
        const currentMarker = await AsyncStorage.getItem(DEV_RESET_MARKER_KEY);

        if (currentMarker === FORCE_FRESH_ACCESS_TOKEN) {
          setResetComplete(true);
          return;
        }

        const keys = await AsyncStorage.getAllKeys();
        const appKeys = keys.filter((key) => key.startsWith("@vida_em_ordem_"));

        if (appKeys.length > 0) {
          await AsyncStorage.multiRemove(appKeys);
        }

        await AsyncStorage.setItem(
          DEV_RESET_MARKER_KEY,
          FORCE_FRESH_ACCESS_TOKEN
        );
      } catch (error) {
        console.log("Erro ao resetar app para primeiro acesso:", error);
      } finally {
        setResetComplete(true);
      }
    }

    void ensureFreshAccessReset();
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    async function ensureWelcomeReset() {
      try {
        const currentMarker = await AsyncStorage.getItem(
          DEV_WELCOME_RESET_MARKER_KEY
        );

        if (currentMarker === FORCE_WELCOME_RESET_TOKEN) {
          return;
        }

        await AsyncStorage.multiRemove([APP_WELCOME_SEEN_KEY]);
        await AsyncStorage.setItem(
          DEV_WELCOME_RESET_MARKER_KEY,
          FORCE_WELCOME_RESET_TOKEN
        );
      } catch (error) {
        console.log("Erro ao resetar tela de boas-vindas:", error);
      }
    }

    void ensureWelcomeReset();
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    async function ensureGoogleSignupReset() {
      try {
        const currentMarker = await AsyncStorage.getItem(
          DEV_GOOGLE_RESET_MARKER_KEY
        );

        if (currentMarker === FORCE_GOOGLE_SIGNUP_RESET_TOKEN) {
          return;
        }

        const keysToClear = [
          APP_SESSION_KEY,
          USER_PROFILE_KEY,
          APP_PIN_KEY,
          APP_UNLOCKED_KEY,
          AI_ONBOARDING_KEY,
          APP_WELCOME_SEEN_KEY,
          "@vida_em_ordem_auth_prefill_v1",
          "@vida_em_ordem_ai_plan_v1",
          "@vida_em_ordem_ai_journey_progress_v1",
          "@vida_em_ordem_ai_rewards_v1",
          "@vida_em_ordem_ai_weekly_checkin_v1",
          "@vida_em_ordem_intro_tour_seen_v1",
        ];

        await AsyncStorage.multiRemove(keysToClear);
        await resetGoogleNativeSignInSession();
        await AsyncStorage.setItem(
          DEV_GOOGLE_RESET_MARKER_KEY,
          FORCE_GOOGLE_SIGNUP_RESET_TOKEN
        );
      } catch (error) {
        console.log("Erro ao resetar fluxo de cadastro Google:", error);
      }
    }

    void ensureGoogleSignupReset();
  }, []);

  useEffect(() => {
    if (!resetComplete) return;

    async function checkAccess() {
      try {
        let [profileRaw, pinRaw, unlockedRaw] = await Promise.all([
          AsyncStorage.getItem(USER_PROFILE_KEY),
          AsyncStorage.getItem(APP_PIN_KEY),
          AsyncStorage.getItem(APP_UNLOCKED_KEY),
        ]);
        const sessionRaw = await AsyncStorage.getItem(APP_SESSION_KEY);
        const aiOnboardingRaw = await AsyncStorage.getItem(AI_ONBOARDING_KEY);
        const welcomeSeen = await hasSeenWelcomeScreen();
        const session =
          sessionRaw && typeof sessionRaw === "string"
            ? JSON.parse(sessionRaw)
            : null;
        const isGoogleOnlyAccess =
          !!profileRaw && !pinRaw && session?.provider === "google";

        const firstSegment = segments[0];
        const inWelcome = firstSegment === "welcome";
        const inCadastro = firstSegment === "cadastro";
        const inConfigurarAcesso = firstSegment === "configurar-acesso";
        const inBloqueio = firstSegment === "bloqueio";
        const inAiOnboarding = firstSegment === "onboarding-ia";

        if (!startupLockHandledRef.current) {
          startupLockHandledRef.current = true;

          if (profileRaw) {
            await AsyncStorage.setItem(APP_UNLOCKED_KEY, "false");
            unlockedRaw = "false";
          }
        }

        const allowedWhenUnlocked = [
          "(tabs)",
          "perfil",
          "configuracoes",
          "dinheiro",
          "dinheiro-conexoes",
          "dinheiro-conectar-banco",
          "metas",
          "saude",
          "espiritualidade",
          "assinatura",
          "lazer",
          "trabalho",
          "tempo",
          "aprendizado",
          "checkin",
          "conquistas",
          "habitos",
          "onboarding-ia",
          "tour-app",
          "plano-ia",
          "evolucao-ia",
        ];

        const isAllowedUnlockedRoute = firstSegment
          ? allowedWhenUnlocked.includes(firstSegment)
          : false;

        if (!profileRaw) {
          stopInactivityWatcher();

          if (!welcomeSeen) {
            if (!inWelcome) {
              router.replace("/welcome");
              return;
            }
          } else if (!inCadastro) {
            router.replace("/cadastro");
            return;
          }
        } else if (!pinRaw && isGoogleOnlyAccess) {
          stopInactivityWatcher();

          if (!inConfigurarAcesso) {
            router.replace("/configurar-acesso");
            return;
          }
        } else if (!pinRaw) {
          stopInactivityWatcher();

          if (!inCadastro) {
            router.replace("/cadastro");
            return;
          }
        } else if (unlockedRaw !== "true") {
          stopInactivityWatcher();

          if (!inBloqueio) {
            router.replace("/bloqueio");
            return;
          }
        } else {
          if (!aiOnboardingRaw) {
            stopInactivityWatcher();

            if (!inAiOnboarding) {
              router.replace("/onboarding-ia");
              return;
            }
          } else if (inAiOnboarding) {
            router.replace("/(tabs)");
            return;
          }

          if (!isAllowedUnlockedRoute) {
            router.replace("/(tabs)");
            return;
          }
        }
      } catch (error) {
        console.log("Erro no layout raiz:", error);
      } finally {
        setReady(true);
      }
    }

    checkAccess();
  }, [resetComplete, segments]);

  useEffect(() => {
    const isPublicRoute =
      pathname === "/welcome" ||
      pathname === "/cadastro" ||
      pathname === "/configurar-acesso" ||
      pathname === "/bloqueio" ||
      pathname === "/onboarding-ia" ||
      !pathname;

    if (isPublicRoute) {
      stopInactivityWatcher();
      return;
    }

    startInactivityWatcher(() => {
      void (async () => {
        const [pinRaw, sessionRaw] = await Promise.all([
          AsyncStorage.getItem(APP_PIN_KEY),
          AsyncStorage.getItem(APP_SESSION_KEY),
        ]);
        const session =
          sessionRaw && typeof sessionRaw === "string"
            ? JSON.parse(sessionRaw)
            : null;

        if (!pinRaw && session?.provider === "google") {
          router.replace("/bloqueio");
          return;
        }

        router.replace("/bloqueio");
      })();
    });

    return () => {
      stopInactivityWatcher();
    };
  }, [pathname]);

  useEffect(() => {
    reloadInactivityWatcherConfig();
  }, [pathname]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;

      if (
        pathname === "/welcome" ||
        pathname === "/cadastro" ||
        pathname === "/configurar-acesso" ||
        pathname === "/bloqueio"
      ) {
        return;
      }

      if (
        previous === "active" &&
        (nextState === "inactive" || nextState === "background")
      ) {
        void AsyncStorage.setItem(APP_UNLOCKED_KEY, "false");
        return;
      }

      if (previous.match(/inactive|background/) && nextState === "active") {
        void (async () => {
          const [profileRaw, pinRaw, sessionRaw] = await Promise.all([
            AsyncStorage.getItem(USER_PROFILE_KEY),
            AsyncStorage.getItem(APP_PIN_KEY),
            AsyncStorage.getItem(APP_SESSION_KEY),
          ]);
          const session =
            sessionRaw && typeof sessionRaw === "string"
              ? JSON.parse(sessionRaw)
              : null;

          if (!profileRaw) {
            return;
          }

          if (!pinRaw && session?.provider === "google") {
            router.replace("/bloqueio");
            return;
          }

          router.replace("/bloqueio");
        })();

        resetInactivityWatcher();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [pathname]);

  function handleLightInteraction() {
    if (
      pathname === "/cadastro" ||
      pathname === "/configurar-acesso" ||
      pathname === "/bloqueio" ||
      pathname === "/onboarding-ia"
    ) {
      return;
    }

    const now = Date.now();

    if (now - throttleRef.current < 900) return;

    throttleRef.current = now;
    resetInactivityWatcher();
  }

  const statusBarStyle = colors.isDark ? "light-content" : "dark-content";

  if (!ready || !isThemeReady || !isLanguageReady) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={colors.background}
          translucent={false}
        />
        <VidaEmOrdemLogo size={92} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {t("app.loading")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      onTouchStart={handleLightInteraction}
      onPointerDown={handleLightInteraction}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={colors.background}
        translucent={false}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "none",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="configurar-acesso" />
        <Stack.Screen name="bloqueio" />
        <Stack.Screen name="onboarding-ia" />
        <Stack.Screen name="tour-app" />
        <Stack.Screen name="plano-ia" />
        <Stack.Screen name="evolucao-ia" />
        <Stack.Screen name="perfil" />
        <Stack.Screen name="configuracoes" />
        <Stack.Screen name="dinheiro" />
        <Stack.Screen name="dinheiro-conexoes" />
        <Stack.Screen name="dinheiro-conectar-banco" />
        <Stack.Screen name="metas" />
        <Stack.Screen name="saude" />
        <Stack.Screen name="espiritualidade" />
        <Stack.Screen name="assinatura" />
        <Stack.Screen name="lazer" />
        <Stack.Screen name="trabalho" />
        <Stack.Screen name="tempo" />
        <Stack.Screen name="aprendizado" />
        <Stack.Screen name="checkin" />
        <Stack.Screen name="conquistas" />
        <Stack.Screen name="habitos" />
        <Stack.Screen name="premium" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <RootNavigator />
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 16,
  },
});
