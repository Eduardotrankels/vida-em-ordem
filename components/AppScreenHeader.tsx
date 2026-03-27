import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppLanguage } from "../app/utils/languageContext";
import { useAppTheme } from "../app/utils/themeContext";
import NotificationBellButton from "./NotificationBellButton";

type Props = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  showBack?: boolean;
  badgeLabel?: string;
  badgeTone?: "accent" | "success" | "neutral";
  onBadgePress?: () => void;
  showNotifications?: boolean;
};

export default function AppScreenHeader({
  title,
  subtitle,
  icon,
  showBack = true,
  badgeLabel,
  badgeTone = "accent",
  onBadgePress,
  showNotifications = true,
}: Props) {
  const { colors } = useAppTheme();
  const { t } = useAppLanguage();

  const headerAccent = colors.accent;
  const cardBackground = colors.isDark ? "#0F1115" : colors.surface;
  const uiBorder = colors.isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const textPrimary = colors.isDark ? "#F5F7FB" : colors.text;
  const textSecondary = colors.isDark ? "#A8B0C0" : colors.textSecondary;
  const normalizedBadgeLabel = badgeLabel?.trim().toLowerCase() ?? "";
  const isFreeBadge = normalizedBadgeLabel.includes("free");
  const glowColor = colors.isDark
    ? `${headerAccent}29`
    : `${headerAccent}14`;

  function handleBackPress() {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }

  const badgeStyles =
    isFreeBadge
      ? {
          backgroundColor: colors.surfaceAlt,
          borderColor: uiBorder,
          color: textSecondary,
        }
      :
    badgeTone === "success"
      ? {
          backgroundColor: colors.successSoft,
          borderColor: colors.success,
          color: colors.success,
        }
      : badgeTone === "neutral"
      ? {
          backgroundColor: colors.surfaceAlt,
          borderColor: uiBorder,
          color: textSecondary,
        }
      : {
          backgroundColor: colors.accentSoft,
          borderColor: colors.accentBorder,
          color: headerAccent,
        };

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          style={[
            styles.backButton,
            {
              backgroundColor: cardBackground,
              borderColor: uiBorder,
            },
          ]}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={16} color={textPrimary} />
          <Text style={[styles.backButtonText, { color: textPrimary }]}>
            {t("common.back")}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.headerRow}>
        <View style={styles.headerMain}>
          <View style={[styles.headerGlow, { backgroundColor: glowColor }]} />
          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <Ionicons name={icon} size={18} color={headerAccent} />
            </View>

            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
          </View>

          {subtitle ? (
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {showNotifications || badgeLabel ? (
          <View style={styles.headerSideActions}>
            {showNotifications ? <NotificationBellButton /> : null}

            {badgeLabel ? (
              <Pressable
                disabled={!onBadgePress || isFreeBadge}
                style={[
                  styles.badge,
                  {
                    backgroundColor: badgeStyles.backgroundColor,
                    borderColor: badgeStyles.borderColor,
                    opacity: isFreeBadge ? 0.8 : 1,
                  },
                ]}
                onPress={isFreeBadge ? undefined : onBadgePress}
              >
                <Text style={[styles.badgeText, { color: badgeStyles.color }]}>
                  {badgeLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 18,
  },
  backButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerSideActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  headerMain: {
    flex: 1,
  },
  headerGlow: {
    position: "absolute",
    top: -8,
    left: -4,
    width: 94,
    height: 94,
    borderRadius: 999,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: "94%",
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
