import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../app/utils/themeContext";

type Props = {
  title: string;
  text: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export default function SubtlePremiumHint({
  title,
  text,
  ctaLabel = "Conhecer Premium",
  onPress,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="diamond-outline" size={16} color={colors.textMuted} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>{text}</Text>
      </View>

      {onPress ? (
        <Pressable
          onPress={onPress}
          style={[
            styles.button,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
  },
  text: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
