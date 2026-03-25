import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import { bootstrapAppAccount } from "./services/appAccountApi";
import { ensureAppSession } from "./utils/appSession";
import { useAppLanguage } from "./utils/languageContext";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "./utils/appTheme";

const USER_PROFILE_KEY = "@vida_em_ordem_user_profile_v1";
const APP_PIN_KEY = "@vida_em_ordem_app_pin_v1";
const APP_UNLOCKED_KEY = "@vida_em_ordem_app_unlocked_v1";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";

type UserProfile = {
  name: string;
  nickname: string;
  email: string;
  age: string;
  address: string;
  photoUri?: string;
  avatarBorderColor?: string;
  createdAt: string;
};

const DEFAULT_AVATAR_BORDER_COLOR = "#2563eb";

export default function CadastroScreen() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { language, t } = useAppLanguage();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [photoUri, setPhotoUri] = useState("");

  const isPremium = settings.plan === "premium";

  const colors = useMemo(
    () =>
      getThemeColors(
        settings.theme,
        settings.accentColor,
        systemColorScheme
      ),
    [settings.theme, settings.accentColor, systemColorScheme]
  );

  const loadSettings = useCallback(async () => {
    try {
      const [raw, planRaw] = await Promise.all([
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
      ]);

      const parsedSettings = raw ? JSON.parse(raw) : DEFAULT_SETTINGS;

      const effectivePlan =
        planRaw === "premium" || parsedSettings?.plan === "premium"
          ? "premium"
          : "free";

      setSettings({
        theme:
          parsedSettings?.theme === "dark" ||
          parsedSettings?.theme === "light" ||
          parsedSettings?.theme === "system"
            ? parsedSettings.theme
            : DEFAULT_SETTINGS.theme,
        accentColor: parsedSettings?.accentColor || DEFAULT_SETTINGS.accentColor,
        inactivityLockMinutes:
          parsedSettings?.inactivityLockMinutes === 1 ||
          parsedSettings?.inactivityLockMinutes === 3 ||
          parsedSettings?.inactivityLockMinutes === 5 ||
          parsedSettings?.inactivityLockMinutes === 10
            ? parsedSettings.inactivityLockMinutes
            : 0,
        plan: effectivePlan,
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
    } catch (error) {
      console.log("Erro ao carregar tema no cadastro:", error);
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  const syncSessionWithBackend = useCallback(
    async (profile: {
      userId: string;
      provider: "local" | "google";
      name?: string | null;
      nickname?: string | null;
      email?: string | null;
      photoUri?: string | null;
    }) => {
      try {
        await bootstrapAppAccount({
          userId: profile.userId,
          provider: profile.provider,
          name: profile.name,
          nickname: profile.nickname,
          email: profile.email,
          photoUri: profile.photoUri,
          locale: language,
          regionPreference: settings.regionPreference,
          currencyPreference: settings.currencyPreference,
        });
      } catch (error) {
        console.log("Erro ao sincronizar conta base com backend:", error);
      }
    },
    [language, settings.currencyPreference, settings.regionPreference]
  );


  async function pickProfilePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
        Alert.alert(
          t("common.permissionNeeded"),
          t("cadastro.permissionGallery")
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Erro ao escolher foto:", error);
      Alert.alert(t("common.error"), t("cadastro.selectPhotoError"));
    }
  }

  async function handleSave() {
    const cleanName = name.trim();
    const cleanNickname = nickname.trim();
    const cleanEmail = email.trim();
    const cleanAge = age.trim();
    const cleanAddress = address.trim();
    const cleanPin = pin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!cleanName) {
      Alert.alert(t("common.attention"), t("cadastro.validation.name"));
      return;
    }

    if (!cleanNickname) {
      Alert.alert(t("common.attention"), t("cadastro.validation.nickname"));
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      Alert.alert(t("common.attention"), t("cadastro.validation.email"));
      return;
    }

    if (!cleanAge) {
      Alert.alert(t("common.attention"), t("cadastro.validation.age"));
      return;
    }

    if (!cleanAddress) {
      Alert.alert(t("common.attention"), t("cadastro.validation.address"));
      return;
    }

    if (!/^\d{4}$/.test(cleanPin)) {
      Alert.alert(t("common.attention"), t("cadastro.validation.pin"));
      return;
    }

    if (cleanPin !== cleanConfirmPin) {
      Alert.alert(t("common.attention"), t("cadastro.validation.pinMismatch"));
      return;
    }

    const profile: UserProfile = {
      name: cleanName,
      nickname: cleanNickname,
      email: cleanEmail,
      age: cleanAge,
      address: cleanAddress,
      photoUri: photoUri || undefined,
      avatarBorderColor: settings.accentColor || DEFAULT_AVATAR_BORDER_COLOR,
      createdAt: new Date().toISOString(),
    };

    try {
      const session = await ensureAppSession({
        name: cleanName,
        nickname: cleanNickname,
        email: cleanEmail,
        photoUri: photoUri || undefined,
      });

      await Promise.all([
        AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile)),
        AsyncStorage.setItem(APP_PIN_KEY, cleanPin),
        AsyncStorage.setItem(APP_UNLOCKED_KEY, "true"),
      ]);

      await syncSessionWithBackend({
        userId: session.userId,
        provider: session.provider,
        name: cleanName,
        nickname: cleanNickname,
        email: cleanEmail,
        photoUri: photoUri || undefined,
      });

      Alert.alert(
        t("cadastro.successTitle"),
        t("cadastro.successText"),
        [
          {
            text: t("common.enter"),
            onPress: () => {
              router.replace("/onboarding-ia");
            },
          },
        ]
      );
    } catch (error) {
      console.log("Erro ao salvar cadastro:", error);
      Alert.alert(t("common.error"), t("cadastro.saveError"));
    }
  }

  const previewLetter = (
    nickname.trim().charAt(0) ||
    name.trim().charAt(0) ||
    "V"
  ).toUpperCase();

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
            { paddingBottom: getScreenContentBottomPadding(insets.bottom, "form") },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <AppScreenHeader
            title={t("cadastro.title")}
            subtitle={t("cadastro.subtitle")}
            icon="person-outline"
            showBack={false}
            badgeLabel={isPremium ? t("common.premium") : t("common.free")}
            badgeTone={isPremium ? "success" : "accent"}
            onBadgePress={goToPremium}
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
            <Text style={[styles.heroLabel, { color: colors.accent }]}>
              {t("cadastro.identityTitle")}
            </Text>

            <Pressable
              style={[
                styles.photoPicker,
                {
                  backgroundColor: colors.surface,
                  borderColor: settings.accentColor || DEFAULT_AVATAR_BORDER_COLOR,
                },
              ]}
              onPress={pickProfilePhoto}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <View
                  style={[
                    styles.photoFallback,
                    {
                      backgroundColor:
                        settings.accentColor || DEFAULT_AVATAR_BORDER_COLOR,
                    },
                  ]}
                >
                  <Text style={styles.photoFallbackText}>{previewLetter}</Text>
                </View>
              )}
            </Pressable>

            <Text style={[styles.heroHint, { color: colors.textSecondary }]}>
              {t("cadastro.heroHint")}
            </Text>

            <View style={styles.heroMiniRow}>
              <View
                style={[
                  styles.heroMiniCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.heroMiniLabel, { color: colors.textMuted }]}>
                  {t("cadastro.avatar")}
                </Text>
                <Text style={[styles.heroMiniValue, { color: colors.text }]}>
                  {photoUri
                    ? t("cadastro.avatarCustom")
                    : t("cadastro.avatarInitial")}
                </Text>
              </View>

              <View
                style={[
                  styles.heroMiniCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.heroMiniLabel, { color: colors.textMuted }]}>
                  {t("cadastro.security")}
                </Text>
                <Text style={[styles.heroMiniValue, { color: colors.text }]}>
                  {t("cadastro.pin")}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("cadastro.yourData")}
          </Text>

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
              {t("cadastro.fullName")}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("cadastro.placeholder.name")}
              placeholderTextColor={colors.textSecondary}
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
              {t("cadastro.nickname")}
            </Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder={t("cadastro.placeholder.nickname")}
              placeholderTextColor={colors.textSecondary}
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
              {t("cadastro.email")}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t("cadastro.placeholder.email")}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
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
              {t("cadastro.age")}
            </Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder={t("cadastro.placeholder.age")}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
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
              {t("cadastro.address")}
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={t("cadastro.placeholder.address")}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("cadastro.pinSection")}
          </Text>

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
              {t("cadastro.pin")}
            </Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder={t("cadastro.placeholder.pin")}
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
              {t("cadastro.confirmPin")}
            </Text>
            <TextInput
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder={t("cadastro.placeholder.pin")}
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
              <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
                {t("cadastro.pinInfo")}
              </Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={handleSave}
          >
            <Text
              style={[styles.saveButtonText, { color: colors.accentButtonText }]}
            >
              {t("cadastro.saveButton")}
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
  header: {
    marginBottom: 18,
  },
  headerPlanRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  planBadgeTop: {
    borderRadius: 999,
    borderWidth: 1,
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
  heroCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
    alignItems: "center",
  },
  languageCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  languageCardTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  languageCardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  languageOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  languageOption: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  languageOptionLabel: {
    fontSize: 13,
    fontWeight: "900",
  },
  languageOptionSubLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  googleButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  googleHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  heroHint: {
    marginTop: 10,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  heroMiniRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    width: "100%",
  },
  heroMiniCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  heroMiniLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroMiniValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
  },
  photoPicker: {
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  photoFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackText: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  formCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  infoBoxText: {
    fontSize: 12,
    lineHeight: 18,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 14,
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
