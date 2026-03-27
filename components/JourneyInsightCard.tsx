import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type JourneyInsightCardProps = {
  eyebrow: string;
  title: string;
  text: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  accentColor: string;
  accentSoft: string;
  accentBorder: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  textSecondaryColor: string;
  buttonBackground: string;
  buttonBorder: string;
  buttonTextColor: string;
  isWhiteAccentButton?: boolean;
  timerLabel?: string;
  timerValue?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function JourneyInsightCard({
  eyebrow,
  title,
  text,
  iconName,
  accentColor,
  accentSoft,
  accentBorder,
  surfaceColor,
  borderColor,
  textColor,
  textSecondaryColor,
  buttonBackground,
  buttonBorder,
  buttonTextColor,
  isWhiteAccentButton = false,
  timerLabel,
  timerValue,
  actionLabel,
  onAction,
}: JourneyInsightCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surfaceColor,
          borderColor,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.textWrap}>
          <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        </View>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: accentSoft,
              borderColor: accentBorder,
            },
          ]}
        >
          <Ionicons name={iconName} size={18} color={accentColor} />
        </View>
      </View>

      <Text style={[styles.text, { color: textSecondaryColor }]}>{text}</Text>

      {timerLabel && timerValue ? (
        <View
          style={[
            styles.timerPill,
            {
              backgroundColor: accentSoft,
              borderColor: accentBorder,
            },
          ]}
        >
          <Text style={[styles.timerLabel, { color: accentColor }]}>
            {timerLabel}
          </Text>
          <Text style={[styles.timerValue, { color: textColor }]}>
            {timerValue}
          </Text>
        </View>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: buttonBackground,
              borderColor: buttonBorder,
            },
            isWhiteAccentButton && styles.whiteAccentButton,
          ]}
          onPress={onAction}
        >
          <Text style={[styles.actionButtonText, { color: buttonTextColor }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  textWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
    marginTop: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  timerPill: {
    alignSelf: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
  timerValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  actionButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
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
