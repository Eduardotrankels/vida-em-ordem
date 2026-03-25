import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "./utils/appTheme";

const APP_PIN_KEY = "@vida_em_ordem_app_pin_v1";
const APP_UNLOCKED_KEY = "@vida_em_ordem_app_unlocked_v1";
const APP_SESSION_KEY = "@vida_em_ordem_app_session_v1";

export default function BloqueioScreen() {
  const systemColorScheme = useColorScheme();
  const [typedPin, setTypedPin] = useState("");
  const [savedPin, setSavedPin] = useState("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometria");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const colors = useMemo(
    () =>
      getThemeColors(
        settings.theme,
        settings.accentColor,
        systemColorScheme
      ),
    [settings.theme, settings.accentColor, systemColorScheme]
  );

  const unlockApp = useCallback(async () => {
    try {
      await AsyncStorage.setItem(APP_UNLOCKED_KEY, "true");
      router.dismissAll();
      router.replace("/");
    } catch (error) {
      console.log("Erro ao desbloquear app:", error);
      Alert.alert("Erro", "Não foi possível desbloquear o app.");
      setTypedPin("");
    }
  }, []);

  const handleBiometricAuth = useCallback(
    async (silent = false) => {
      if (!biometricAvailable || isAuthenticating) return;

      try {
        setIsAuthenticating(true);

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Desbloquear Vida em Ordem",
          cancelLabel: "Usar PIN",
          fallbackLabel: "Usar PIN",
          disableDeviceFallback: false,
        });

        if (result.success) {
          await unlockApp();
          return;
        }

        if (!silent) {
          if (result.error === "user_cancel" || result.error === "system_cancel") {
            return;
          }

          Alert.alert(
            "Biometria não validada",
            "Não foi possível autenticar. Você pode usar seu PIN."
          );
        }
      } catch (error) {
        console.log("Erro na biometria:", error);
        if (!silent) {
          Alert.alert(
            "Erro",
            "Não foi possível usar a biometria agora. Tente novamente ou use seu PIN."
          );
        }
      } finally {
        setIsAuthenticating(false);
      }
    },
    [biometricAvailable, isAuthenticating, unlockApp]
  );

  const loadData = useCallback(async () => {
    try {
      const [pinRaw, settingsRaw, sessionRaw] = await Promise.all([
        AsyncStorage.getItem(APP_PIN_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(APP_SESSION_KEY),
      ]);
      const session =
        sessionRaw && typeof sessionRaw === "string"
          ? JSON.parse(sessionRaw)
          : null;

      const parsedSettings = settingsRaw ? JSON.parse(settingsRaw) : DEFAULT_SETTINGS;

      setSettings({
        theme:
          parsedSettings?.theme === "light" ||
          parsedSettings?.theme === "system"
            ? parsedSettings.theme
            : "dark",
        accentColor: parsedSettings?.accentColor || DEFAULT_SETTINGS.accentColor,
        inactivityLockMinutes:
          parsedSettings?.inactivityLockMinutes === 1 ||
          parsedSettings?.inactivityLockMinutes === 3 ||
          parsedSettings?.inactivityLockMinutes === 5 ||
          parsedSettings?.inactivityLockMinutes === 10
            ? parsedSettings.inactivityLockMinutes
            : 0,
        plan: parsedSettings?.plan === "premium" ? "premium" : "free",
        regionPreference:
          parsedSettings?.regionPreference === "BR" ||
          parsedSettings?.regionPreference === "US" ||
          parsedSettings?.regionPreference === "ES" ||
          parsedSettings?.regionPreference === "FR" ||
          parsedSettings?.regionPreference === "IT"
            ? parsedSettings.regionPreference
            : "auto",
        currencyPreference:
          parsedSettings?.currencyPreference === "BRL" ||
          parsedSettings?.currencyPreference === "USD" ||
          parsedSettings?.currencyPreference === "EUR"
            ? parsedSettings.currencyPreference
            : "auto",
      });

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const supportedTypes =
          await LocalAuthentication.supportedAuthenticationTypesAsync();

        if (
          supportedTypes.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
          )
        ) {
          setBiometricLabel("Face ID / Rosto");
        } else if (
          supportedTypes.includes(
            LocalAuthentication.AuthenticationType.FINGERPRINT
          )
        ) {
          setBiometricLabel("Digital");
        } else if (
          supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)
        ) {
          setBiometricLabel("Íris");
        } else {
          setBiometricLabel("Biometria");
        }

        setBiometricAvailable(true);
      } else {
        setBiometricAvailable(false);
      }

      if (!pinRaw) {
        if (session?.provider === "google" && hasHardware && isEnrolled) {
          setSavedPin("");
          return;
        }

        router.replace(session?.provider === "google" ? "/welcome" : "/cadastro");
        return;
      }

      setSavedPin(pinRaw);
    } catch (error) {
      console.log("Erro ao carregar bloqueio:", error);
      Alert.alert("Erro", "Não foi possível carregar a tela de bloqueio.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function prepare() {
        setTypedPin("");
        await loadData();

        if (!cancelled) {
          setTimeout(() => {
            if (!cancelled) {
              handleBiometricAuth(true);
            }
          }, 250);
        }
      }

      prepare();

      return () => {
        cancelled = true;
      };
    }, [loadData, handleBiometricAuth])
  );

  async function handleDigitPress(digit: string) {
    if (typedPin.length >= 4) return;

    const nextPin = typedPin + digit;
    setTypedPin(nextPin);

    if (nextPin.length === 4) {
      if (nextPin === savedPin) {
        await unlockApp();
      } else {
        setTimeout(() => {
          Alert.alert("PIN incorreto", "Tente novamente.");
          setTypedPin("");
        }, 120);
      }
    }
  }

  function handleDelete() {
    if (!typedPin.length) return;
    setTypedPin((prev) => prev.slice(0, -1));
  }

  function renderDot(index: number) {
    const filled = index < typedPin.length;

    return (
      <View
        key={index}
        style={[
          styles.dot,
          {
            borderColor: filled ? colors.accent : colors.border,
            backgroundColor: filled ? colors.accent : "transparent",
          },
        ]}
      />
    );
  }

  function renderKey(digit: string) {
    return (
      <Pressable
        key={digit}
        style={[
          styles.key,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleDigitPress(digit)}
      >
        <Text style={[styles.keyText, { color: colors.text }]}>{digit}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.heroGlow,
            { backgroundColor: colors.accentSoft },
          ]}
        />

        <View
          style={[
            styles.lockCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.lockIconWrap,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>App bloqueado</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {!savedPin && biometricAvailable
              ? `Use ${biometricLabel} para continuar.`
              : biometricAvailable
              ? `Use ${biometricLabel} ou digite seu PIN para continuar.`
              : "Digite seu PIN para continuar."}
          </Text>

          {biometricAvailable ? (
            <Pressable
              style={[
                styles.biometricButton,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
              onPress={() => handleBiometricAuth(false)}
            >
              <Text style={[styles.biometricButtonText, { color: colors.accent }]}>
                {isAuthenticating ? "Validando..." : `Usar ${biometricLabel}`}
              </Text>
            </Pressable>
          ) : null}

          {savedPin ? (
            <View style={styles.dotsRow}>{[0, 1, 2, 3].map(renderDot)}</View>
          ) : null}
        </View>

        {savedPin ? (
          <View style={styles.keyboard}>
            <View style={styles.keyRow}>{["1", "2", "3"].map(renderKey)}</View>
            <View style={styles.keyRow}>{["4", "5", "6"].map(renderKey)}</View>
            <View style={styles.keyRow}>{["7", "8", "9"].map(renderKey)}</View>

            <View style={styles.keyRow}>
              <View style={styles.keyPlaceholder} />
              {renderKey("0")}
              <Pressable
                style={[
                  styles.key,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleDelete}
              >
                <Text style={[styles.keyText, { color: colors.textMuted }]}>⌫</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    width: 180,
    height: 180,
    borderRadius: 999,
  },
  lockCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 28,
  },
  lockIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  biometricButton: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  biometricButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
  },
  keyboard: {
    gap: 12,
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  key: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPlaceholder: {
    flex: 1,
  },
  keyText: {
    fontSize: 24,
    fontWeight: "800",
  },
});
