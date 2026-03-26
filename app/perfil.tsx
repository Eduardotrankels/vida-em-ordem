import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import Slider from "@react-native-community/slider";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import {
  APP_SETTINGS_KEY,
  AppSettings,
  DEFAULT_SETTINGS,
  getThemeColors,
} from "./utils/appTheme";
import { useAppLanguage } from "./utils/languageContext";
import { formatDateByLanguage } from "./utils/locale";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const USER_PROFILE_KEY = "@vida_em_ordem_user_profile_v1";
const APP_PIN_KEY = "@vida_em_ordem_app_pin_v1";
const APP_UNLOCKED_KEY = "@vida_em_ordem_app_unlocked_v1";
const SUBSCRIPTION_PLAN_KEY = "@vida_em_ordem_subscription_plan_v1";
const DEFAULT_AVATAR_BORDER_COLOR = "#2563eb";

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

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const value = Number.parseInt(fullHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function normalizeHexColor(value: string) {
  const cleaned = value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);

  if (cleaned.length === 3) {
    return `#${cleaned
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase()}`;
  }

  return `#${cleaned.padEnd(6, "0").toUpperCase()}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue /= 6;
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function hueToRgb(p: number, q: number, t: number) {
  let next = t;

  if (next < 0) {
    next += 1;
  }

  if (next > 1) {
    next -= 1;
  }

  if (next < 1 / 6) {
    return p + (q - p) * 6 * next;
  }

  if (next < 1 / 2) {
    return q;
  }

  if (next < 2 / 3) {
    return p + (q - p) * (2 / 3 - next) * 6;
  }

  return p;
}

function hslToHex(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(100, s)) / 100;
  const lightness = Math.max(0, Math.min(100, l)) / 100;

  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return rgbToHex(value, value, value);
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const r = hueToRgb(p, q, hue / 360 + 1 / 3);
  const g = hueToRgb(p, q, hue / 360);
  const b = hueToRgb(p, q, hue / 360 - 1 / 3);

  return rgbToHex(r * 255, g * 255, b * 255);
}

const COLOR_WHEEL_SWATCHES = Array.from({ length: 18 }, (_, index) => ({
  color: hslToHex(index * 20, 92, 52),
  angle: (index / 18) * Math.PI * 2 - Math.PI / 2,
}));

export default function PerfilScreen() {
  const { patchAppSettings } = useAppTheme();
  const { language, t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [photoUri, setPhotoUri] = useState("");
  const [avatarBorderColor, setAvatarBorderColor] = useState(
    DEFAULT_AVATAR_BORDER_COLOR
  );
  const [avatarColorInput, setAvatarColorInput] = useState(
    DEFAULT_AVATAR_BORDER_COLOR
  );

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");

  const isPremium = settings.plan === "premium";

  const loadProfile = useCallback(async () => {
    try {
      const [raw, settingsRaw, planRaw] = await Promise.all([
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(APP_SETTINGS_KEY),
        AsyncStorage.getItem(SUBSCRIPTION_PLAN_KEY),
      ]);

      if (!raw) {
        setProfile(null);
      } else {
        const parsed: UserProfile = JSON.parse(raw);
        setProfile(parsed);
      }

      const parsedSettings = settingsRaw ? JSON.parse(settingsRaw) : DEFAULT_SETTINGS;
      const effectivePlan =
        planRaw === "premium" || parsedSettings?.plan === "premium"
          ? "premium"
          : "free";

      setSettings({
        theme:
          parsedSettings?.theme === "dark" ||
          parsedSettings?.theme === "system"
            ? parsedSettings.theme
            : "light",
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
            : DEFAULT_SETTINGS.regionPreference,
        currencyPreference:
          parsedSettings?.currencyPreference === "BRL" ||
          parsedSettings?.currencyPreference === "USD" ||
          parsedSettings?.currencyPreference === "EUR"
            ? parsedSettings.currencyPreference
            : DEFAULT_SETTINGS.currencyPreference,
      });
    } catch (error) {
      console.log("Erro ao carregar perfil:", error);
      Alert.alert(t("common.error"), t("perfil.loadError"));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const colors = useMemo(
    () => getThemeColors(settings.theme, settings.accentColor),
    [settings.theme, settings.accentColor]
  );

  const goToPremium = useCallback(() => {
    router.push("/assinatura");
  }, []);

  function openEditModal() {
    const nextColor =
      profile?.avatarBorderColor ??
      settings.accentColor ??
      DEFAULT_AVATAR_BORDER_COLOR;

    setName(profile?.name ?? "");
    setNickname(profile?.nickname ?? "");
    setEmail(profile?.email ?? "");
    setAge(profile?.age ?? "");
    setAddress(profile?.address ?? "");
    setPhotoUri(profile?.photoUri ?? "");
    setAvatarBorderColor(nextColor);
    setAvatarColorInput(nextColor.toUpperCase());
    setEditModalOpen(true);
  }

  async function pickProfilePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(t("common.permissionNeeded"), t("perfil.permissionGallery"));
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
      Alert.alert(t("common.error"), t("perfil.selectPhotoError"));
    }
  }

  async function saveProfile() {
    const cleanName = name.trim();
    const cleanNickname = nickname.trim();
    const cleanEmail = email.trim();
    const cleanAge = age.trim();
    const cleanAddress = address.trim();

    if (!cleanName) {
      Alert.alert(t("common.attention"), t("perfil.validation.name"));
      return;
    }

    if (!cleanNickname) {
      Alert.alert(t("common.attention"), t("perfil.validation.nickname"));
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      Alert.alert(t("common.attention"), t("perfil.validation.email"));
      return;
    }

    if (!cleanAge) {
      Alert.alert(t("common.attention"), t("perfil.validation.age"));
      return;
    }

    if (!cleanAddress) {
      Alert.alert(t("common.attention"), t("perfil.validation.address"));
      return;
    }

    try {
      const nextAccentColor = avatarBorderColor || DEFAULT_AVATAR_BORDER_COLOR;

      const nextProfile: UserProfile = {
        name: cleanName,
        nickname: cleanNickname,
        email: cleanEmail,
        age: cleanAge,
        address: cleanAddress,
        photoUri: photoUri || undefined,
        avatarBorderColor: nextAccentColor,
        createdAt: profile?.createdAt ?? new Date().toISOString(),
      };

      await Promise.all([
        AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(nextProfile)),
        patchAppSettings({ accentColor: nextAccentColor }),
      ]);

      setSettings((current) => ({
        ...current,
        accentColor: nextAccentColor,
      }));
      setProfile(nextProfile);
      setEditModalOpen(false);

      Alert.alert(t("perfil.successUpdatedTitle"), t("perfil.successUpdatedText"));
    } catch (error) {
      console.log("Erro ao salvar perfil:", error);
      Alert.alert(t("common.error"), t("perfil.saveError"));
    }
  }

  async function changePin() {
    try {
      const savedPin = await AsyncStorage.getItem(APP_PIN_KEY);

      if (!savedPin) {
        Alert.alert(t("common.error"), t("perfil.pinMissing"));
        return;
      }

      if (currentPin.trim() !== savedPin) {
        Alert.alert(t("common.attention"), t("perfil.pinIncorrect"));
        return;
      }

      if (!/^\d{4}$/.test(newPin.trim())) {
        Alert.alert(t("common.attention"), t("perfil.pinInvalid"));
        return;
      }

      if (newPin.trim() !== confirmNewPin.trim()) {
        Alert.alert(t("common.attention"), t("perfil.pinMismatch"));
        return;
      }

      await AsyncStorage.setItem(APP_PIN_KEY, newPin.trim());

      setCurrentPin("");
      setNewPin("");
      setConfirmNewPin("");
      setPinModalOpen(false);

      Alert.alert(t("perfil.pinSuccessTitle"), t("perfil.pinSuccessText"));
    } catch (error) {
      console.log("Erro ao alterar PIN:", error);
      Alert.alert(t("common.error"), t("perfil.pinChangeError"));
    }
  }

  async function lockAppNow() {
    try {
      await AsyncStorage.setItem(APP_UNLOCKED_KEY, "false");
      router.replace("/bloqueio");
    } catch (error) {
      console.log("Erro ao bloquear app:", error);
      Alert.alert(t("common.error"), t("perfil.lockError"));
    }
  }

  function confirmLockApp() {
    Alert.alert(t("perfil.lockConfirmTitle"), t("perfil.lockConfirmText"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("perfil.lockConfirmAction"), onPress: lockAppNow },
    ]);
  }

  function resetAllAccess() {
    Alert.alert(
      t("perfil.resetTitle"),
      t("perfil.resetText"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("perfil.resetAction"),
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all([
                AsyncStorage.removeItem(USER_PROFILE_KEY),
                AsyncStorage.removeItem(APP_PIN_KEY),
                AsyncStorage.removeItem(APP_UNLOCKED_KEY),
              ]);

              router.replace("/cadastro");
            } catch (error) {
              console.log("Erro ao resetar acesso:", error);
              Alert.alert(t("common.error"), t("perfil.resetError"));
            }
          },
        },
      ]
    );
  }

  const firstLetter =
    profile?.nickname?.trim()?.charAt(0)?.toUpperCase() ||
    profile?.name?.trim()?.charAt(0)?.toUpperCase() ||
    "V";

  const currentBorderColor =
    profile?.avatarBorderColor ??
    settings.accentColor ??
    DEFAULT_AVATAR_BORDER_COLOR;

  const profileAccent = currentBorderColor;
  const accentSoft = rgba(profileAccent, settings.theme === "dark" ? 0.16 : 0.1);
  const accentBorder = rgba(profileAccent, settings.theme === "dark" ? 0.38 : 0.24);
  const isDark = settings.theme === "dark";

  const screenBackground = isDark ? "#090A0C" : colors.background;
  const cardBackground = isDark ? "#0F1115" : colors.surface;
  const cardBackgroundAlt = isDark ? "#141821" : colors.surfaceAlt;
  const cardBackgroundSoft = isDark ? "#0F1115" : colors.surface;
  const uiBorder = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const uiBorderStrong = isDark ? "rgba(255,255,255,0.12)" : colors.border;
  const textPrimary = isDark ? "#F5F7FB" : colors.text;
  const textSecondary = isDark ? "#A8B0C0" : colors.textSecondary;
  const textMuted = isDark ? "#8A93A6" : colors.textMuted;
  const cardShadow = isDark ? "#000000" : colors.shadow;
  const overlayColor = isDark ? "rgba(3,6,12,0.76)" : colors.overlay;

  const editPreviewLetter =
    nickname.trim().charAt(0).toUpperCase() ||
    name.trim().charAt(0).toUpperCase() ||
    "V";

  const avatarRgb = useMemo(() => {
    return hexToRgb(avatarBorderColor || DEFAULT_AVATAR_BORDER_COLOR);
  }, [avatarBorderColor]);
  const avatarHsl = useMemo(() => {
    return rgbToHsl(avatarRgb.r, avatarRgb.g, avatarRgb.b);
  }, [avatarRgb]);

  const joinedDateLabel = formatDateByLanguage(
    profile?.createdAt,
    language,
    undefined,
    "--"
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: screenBackground }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: screenBackground }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenContentBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          title={t("perfil.title")}
          subtitle={t("perfil.subtitle")}
          icon="person-circle-outline"
          badgeLabel={isPremium ? t("common.premium") : t("common.free")}
          badgeTone={isPremium ? "success" : "accent"}
          onBadgePress={goToPremium}
        />

        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: cardBackgroundSoft,
              borderColor: uiBorderStrong,
              shadowColor: cardShadow,
            },
          ]}
        >
          <View style={styles.profileHeroGlowWrap}>
            <View
              style={[
                styles.profileHeroGlowTop,
                { backgroundColor: rgba(profileAccent, 0.16) },
              ]}
            />
            <View
              style={[
                styles.profileHeroGlowBottom,
                { backgroundColor: rgba(profileAccent, 0.08) },
              ]}
            />
          </View>

          <View style={styles.profileTopRow}>
            <View style={styles.avatarShadowWrap}>
              <Pressable style={styles.avatarWrap} onPress={openEditModal}>
                <View
                  style={[
                    styles.avatarBorder,
                    {
                      borderColor: currentBorderColor,
                      backgroundColor: screenBackground,
                    },
                  ]}
                >
                  {profile?.photoUri ? (
                    <Image
                      source={{ uri: profile.photoUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: currentBorderColor },
                      ]}
                    >
                      <Text style={styles.avatarText}>{firstLetter}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>

            <View style={styles.profileMainInfo}>
              <Text style={[styles.profileName, { color: textPrimary }]}>
                {profile?.name || t("perfil.defaultUser")}
              </Text>
              <Text style={[styles.profileNickname, { color: profileAccent }]}>
                {profile?.nickname ? `@${profile.nickname}` : t("perfil.noNickname")}
              </Text>
              <Text style={[styles.profileEmail, { color: textSecondary }]}>
                {profile?.email || t("perfil.noEmail")}
              </Text>
              <View style={styles.identityPillsRow}>
                <View
                  style={[
                    styles.identityPill,
                    {
                      backgroundColor: accentSoft,
                      borderColor: accentBorder,
                    },
                  ]}
                >
                  <Text style={[styles.identityPillText, { color: profileAccent }]}>
                    {t("perfil.identityActive")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.identityPill,
                    {
                      backgroundColor: cardBackgroundAlt,
                      borderColor: uiBorder,
                    },
                  ]}
                >
                  <Text style={[styles.identityPillText, { color: textMuted }]}>
                    {t("perfil.safeProfile")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.profileMiniGrid}>
            <View
              style={[
                styles.profileMiniCard,
                {
                  backgroundColor: cardBackgroundAlt,
                  borderColor: uiBorder,
                },
              ]}
            >
              <Text style={[styles.profileMiniLabel, { color: textMuted }]}>
                {t("perfil.plan")}
              </Text>
              <Text
                style={[
                  styles.profileMiniValue,
                  { color: isPremium ? colors.success : profileAccent },
                ]}
              >
                {isPremium ? t("common.planPremium") : t("common.planFree")}
              </Text>
            </View>

            <View
              style={[
                styles.profileMiniCard,
                {
                  backgroundColor: cardBackgroundAlt,
                  borderColor: uiBorder,
                },
              ]}
            >
              <Text style={[styles.profileMiniLabel, { color: textMuted }]}>
                {t("perfil.registeredAt")}
              </Text>
              <Text style={[styles.profileMiniValue, { color: textPrimary }]}>
                {joinedDateLabel}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
          {t("perfil.yourData")}
        </Text>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: cardBackground,
              borderColor: uiBorder,
            },
          ]}
        >
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondary }]}>
              {t("cadastro.fullName")}
            </Text>
            <Text style={[styles.infoValue, { color: textPrimary }]}>
              {profile?.name || "--"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondary }]}>
              {t("cadastro.nickname")}
            </Text>
            <Text style={[styles.infoValue, { color: textPrimary }]}>
              {profile?.nickname || "--"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondary }]}>
              {t("cadastro.email")}
            </Text>
            <Text style={[styles.infoValue, { color: textPrimary }]}>
              {profile?.email || "--"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondary }]}>
              {t("cadastro.age")}
            </Text>
            <Text style={[styles.infoValue, { color: textPrimary }]}>
              {profile?.age || "--"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondary }]}>
              {t("cadastro.address")}
            </Text>
            <Text style={[styles.infoValue, { color: textPrimary }]}>
              {profile?.address || "--"}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
          {t("perfil.settings")}
        </Text>

        <View style={styles.actionList}>
          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={openEditModal}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {t("perfil.editProfile")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={() => setPinModalOpen(true)}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {t("perfil.changePin")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={() => router.push("/configuracoes")}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {t("perfil.settings")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={confirmLockApp}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {t("perfil.lockNow")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accentButtonBackground,
                borderColor: colors.accentButtonBorder,
              },
              colors.isWhiteAccentButton && styles.whiteAccentButton,
            ]}
            onPress={resetAllAccess}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.accentButtonText },
              ]}
            >
              {t("perfil.eraseLocal")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={editModalOpen} transparent animationType="slide">
        <View style={[styles.modalBackdrop, { backgroundColor: overlayColor }]}>
          <ScrollView
            style={[
              styles.modalCard,
              {
                backgroundColor: cardBackground,
                borderColor: uiBorder,
                paddingBottom: 28 + Math.max(insets.bottom, 24),
              },
            ]}
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: 28 + Math.max(insets.bottom, 24) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              {t("perfil.editModalTitle")}
            </Text>

            <Pressable
              style={[
                styles.photoPicker,
                {
                  borderColor: avatarBorderColor || DEFAULT_AVATAR_BORDER_COLOR,
                  backgroundColor: cardBackgroundAlt,
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
                        avatarBorderColor || DEFAULT_AVATAR_BORDER_COLOR,
                    },
                  ]}
                >
                  <Text style={styles.photoFallbackText}>{editPreviewLetter}</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.colorLabel, { color: textPrimary }]}>
                {t("perfil.avatarColor")}
              </Text>
              <Text style={[styles.freeHintText, { color: textMuted }]}>
                {t("perfil.pickAnyColor")}
              </Text>
            </View>

              <View
                style={[
                  styles.colorEditorCard,
                  {
                    backgroundColor: cardBackgroundAlt,
                  borderColor: uiBorder,
                },
              ]}
              >
              <View style={styles.huePaletteWrap}>
                <Text style={[styles.paletteLabel, { color: textMuted }]}>
                  {t("perfil.colorHint")}
                </Text>
                <View
                  style={[
                    styles.colorWheelCard,
                    {
                      backgroundColor: cardBackground,
                      borderColor: uiBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.colorWheelGlow,
                      { backgroundColor: rgba(avatarBorderColor, 0.14) },
                    ]}
                  />
                  <View
                    style={[
                      styles.colorWheelRing,
                      { borderColor: rgba(avatarBorderColor, 0.22) },
                    ]}
                  >
                    {COLOR_WHEEL_SWATCHES.map((swatch) => {
                      const isSelected = swatch.color === avatarBorderColor;
                      const distance = 74;
                      const size = isSelected ? 26 : 22;

                      return (
                        <Pressable
                          key={swatch.color}
                          style={[
                            styles.colorWheelSwatch,
                            {
                              width: size,
                              height: size,
                              borderRadius: size / 2,
                              backgroundColor: swatch.color,
                              borderColor: isSelected ? textPrimary : "rgba(255,255,255,0.28)",
                              left: 92 + Math.cos(swatch.angle) * distance - size / 2,
                              top: 92 + Math.sin(swatch.angle) * distance - size / 2,
                            },
                            isSelected && styles.colorWheelSwatchActive,
                          ]}
                          onPress={() => {
                            setAvatarBorderColor(swatch.color);
                            setAvatarColorInput(swatch.color);
                          }}
                        />
                      );
                    })}

                    <View
                      style={[
                        styles.colorWheelCenter,
                        {
                          backgroundColor: cardBackgroundAlt,
                          borderColor: uiBorderStrong,
                        },
                      ]}
                      >
                        <View
                          style={[
                            styles.colorWheelCenterGlow,
                            { backgroundColor: rgba(avatarBorderColor, 0.16) },
                          ]}
                        />
                        <View
                          style={[
                            styles.colorWheelCenterPreview,
                            { backgroundColor: avatarBorderColor },
                          ]}
                        />
                    </View>
                  </View>
                </View>
              </View>

              <TextInput
                value={avatarColorInput}
                onChangeText={(value) => {
                  const nextValue = value.startsWith("#") ? value : `#${value}`;
                  setAvatarColorInput(nextValue.toUpperCase());

                  const cleaned = nextValue.replace(/[^0-9a-fA-F]/g, "");
                  if (cleaned.length === 3 || cleaned.length === 6) {
                    setAvatarBorderColor(normalizeHexColor(nextValue));
                  }
                }}
                placeholder="#2563EB"
                placeholderTextColor={textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                style={[
                  styles.colorHexInput,
                  {
                    backgroundColor: cardBackground,
                    color: textPrimary,
                    borderColor: uiBorder,
                  },
                ]}
              />

              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.sliderLabel, { color: textPrimary }]}>
                    {t("perfil.hue")}
                  </Text>
                  <Text style={[styles.sliderValue, { color: textMuted }]}>{avatarHsl.h}°</Text>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={360}
                  step={1}
                  value={avatarHsl.h}
                  minimumTrackTintColor={avatarBorderColor}
                  maximumTrackTintColor={uiBorderStrong}
                  thumbTintColor={avatarBorderColor}
                  onValueChange={(value) => {
                    const nextColor = hslToHex(value, avatarHsl.s, avatarHsl.l);
                    setAvatarBorderColor(nextColor);
                    setAvatarColorInput(nextColor);
                  }}
                />
              </View>

              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.sliderLabel, { color: textPrimary }]}>
                    {t("perfil.saturation")}
                  </Text>
                  <Text style={[styles.sliderValue, { color: textMuted }]}>{avatarHsl.s}%</Text>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={avatarHsl.s}
                  minimumTrackTintColor={avatarBorderColor}
                  maximumTrackTintColor={uiBorderStrong}
                  thumbTintColor={avatarBorderColor}
                  onValueChange={(value) => {
                    const nextColor = hslToHex(avatarHsl.h, value, avatarHsl.l);
                    setAvatarBorderColor(nextColor);
                    setAvatarColorInput(nextColor);
                  }}
                />
              </View>

              <View style={styles.sliderGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.sliderLabel, { color: textPrimary }]}>
                    {t("perfil.lightness")}
                  </Text>
                  <Text style={[styles.sliderValue, { color: textMuted }]}>{avatarHsl.l}%</Text>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={avatarHsl.l}
                  minimumTrackTintColor={avatarBorderColor}
                  maximumTrackTintColor={uiBorderStrong}
                  thumbTintColor={avatarBorderColor}
                  onValueChange={(value) => {
                    const nextColor = hslToHex(avatarHsl.h, avatarHsl.s, value);
                    setAvatarBorderColor(nextColor);
                    setAvatarColorInput(nextColor);
                  }}
                />
              </View>
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("perfil.placeholder.name")}
              placeholderTextColor={textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundAlt,
                  color: textPrimary,
                  borderColor: uiBorder,
                },
              ]}
            />

            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder={t("perfil.placeholder.nickname")}
              placeholderTextColor={textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundAlt,
                  color: textPrimary,
                  borderColor: uiBorder,
                },
              ]}
            />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t("perfil.placeholder.email")}
              placeholderTextColor={textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundAlt,
                  color: textPrimary,
                  borderColor: uiBorder,
                },
              ]}
            />

            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder={t("perfil.placeholder.age")}
              placeholderTextColor={textMuted}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundAlt,
                  color: textPrimary,
                  borderColor: uiBorder,
                },
              ]}
            />

            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={t("perfil.placeholder.address")}
              placeholderTextColor={textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundAlt,
                  color: textPrimary,
                  borderColor: uiBorder,
                },
              ]}
            />

            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={saveProfile}
            >
              <Text style={[styles.saveButtonText, { color: colors.accentButtonText }]}>
                {t("common.saveChanges")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.cancelButton,
                {
                  backgroundColor: accentSoft,
                  borderColor: accentBorder,
                },
              ]}
              onPress={() => setEditModalOpen(false)}
            >
              <Text style={[styles.cancelButtonText, { color: profileAccent }]}>
                {t("common.cancel")}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={pinModalOpen} transparent animationType="slide">
        <View style={[styles.modalBackdrop, { backgroundColor: overlayColor }]}>
          <ScrollView
            style={[
              styles.modalCard,
              {
                backgroundColor: cardBackground,
                borderColor: uiBorder,
                paddingBottom: 28 + Math.max(insets.bottom, 24),
              },
            ]}
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: 28 + Math.max(insets.bottom, 24) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              {t("perfil.pinModalTitle")}
            </Text>

            <TextInput
              value={currentPin}
              onChangeText={setCurrentPin}
              placeholder={t("perfil.placeholder.currentPin")}
              placeholderTextColor={textMuted}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundAlt,
                  color: textPrimary,
                  borderColor: uiBorder,
                },
              ]}
            />

            <TextInput
              value={newPin}
              onChangeText={setNewPin}
              placeholder={t("perfil.placeholder.newPin")}
              placeholderTextColor={textMuted}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundAlt,
                  color: textPrimary,
                  borderColor: uiBorder,
                },
              ]}
            />

            <TextInput
              value={confirmNewPin}
              onChangeText={setConfirmNewPin}
              placeholder={t("perfil.placeholder.confirmNewPin")}
              placeholderTextColor={textMuted}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundAlt,
                  color: textPrimary,
                  borderColor: uiBorder,
                },
              ]}
            />

            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.accentButtonBackground,
                  borderColor: colors.accentButtonBorder,
                },
                colors.isWhiteAccentButton && styles.whiteAccentButton,
              ]}
              onPress={changePin}
            >
              <Text style={[styles.saveButtonText, { color: colors.accentButtonText }]}>
                {t("perfil.saveNewPin")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.cancelButton,
                {
                  backgroundColor: accentSoft,
                  borderColor: accentBorder,
                },
              ]}
              onPress={() => {
                setCurrentPin("");
                setNewPin("");
                setConfirmNewPin("");
                setPinModalOpen(false);
              }}
            >
              <Text style={[styles.cancelButtonText, { color: profileAccent }]}>
                {t("common.cancel")}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  upgradeCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  upgradeGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    right: -30,
    top: -34,
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
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  profileCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
    overflow: "hidden",
  },
  profileHeroGlowWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  profileHeroGlowTop: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    top: -72,
    right: -36,
  },
  profileHeroGlowBottom: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
    bottom: -74,
    left: -42,
  },
  profileTopRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  avatarShadowWrap: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarBorder: {
    width: 116,
    height: 116,
    borderRadius: 999,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 108,
    height: 108,
    borderRadius: 999,
  },
  avatarText: {
    color: "white",
    fontSize: 42,
    fontWeight: "900",
  },
  profileMainInfo: {
    flex: 1,
    paddingBottom: 10,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "900",
  },
  profileNickname: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 8,
  },
  identityPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  identityPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  identityPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  profileMiniGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  profileMiniCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  profileMiniLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  profileMiniValue: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  infoRow: {
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionList: {
    gap: 10,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  actionButtonWarningText: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  actionButtonDangerText: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 16,
    borderWidth: 1,
    maxHeight: "92%",
  },
  modalContent: {
    paddingTop: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  photoPicker: {
    width: 108,
    height: 108,
    borderRadius: 999,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    overflow: "hidden",
    marginBottom: 14,
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 4,
  },
  freeHintText: {
    fontSize: 11,
    fontWeight: "700",
  },
  colorEditorCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  colorHexInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 8,
  },
  huePaletteWrap: {
    marginBottom: 6,
  },
  paletteLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
  },
  colorWheelCard: {
    borderWidth: 1,
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 2,
    overflow: "hidden",
    position: "relative",
  },
  colorWheelGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 999,
    top: -42,
    right: -20,
  },
  colorWheelRing: {
    width: 184,
    height: 184,
    borderRadius: 999,
    position: "relative",
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  colorWheelSwatch: {
    position: "absolute",
    borderWidth: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  colorWheelSwatchActive: {
    transform: [{ scale: 1.14 }],
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  colorWheelCenter: {
    position: "absolute",
    left: 50,
    top: 50,
    width: 84,
    height: 84,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    overflow: "hidden",
  },
  colorWheelCenterGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 999,
  },
  colorWheelCenterPreview: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
  },
  sliderGroup: {
    marginTop: 8,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 10,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  sliderValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  saveButton: {
    borderRadius: 16,
    minHeight: 56,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  saveButtonText: {
    fontWeight: "900",
    fontSize: 14,
  },
  cancelButton: {
    borderRadius: 16,
    minHeight: 56,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: 10,
  },
  cancelButtonText: {
    fontWeight: "800",
    fontSize: 13,
  },
  whiteAccentButton: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
