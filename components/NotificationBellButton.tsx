import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  getUnreadInboxCount,
  subscribeInboxUpdates,
} from "../app/utils/notificationInbox";
import { useAppTheme } from "../app/utils/themeContext";

type Props = {
  onPress?: () => void;
};

export default function NotificationBellButton({ onPress }: Props) {
  const { colors } = useAppTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    const nextCount = await getUnreadInboxCount();
    setUnreadCount(nextCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount])
  );

  useEffect(() => {
    void refreshUnreadCount();

    return subscribeInboxUpdates((items) => {
      setUnreadCount(items.filter((item) => !item.readAt).length);
    });
  }, [refreshUnreadCount]);

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Pressable
      onPress={onPress || (() => router.push("/alertas"))}
      style={[
        styles.button,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name="notifications-outline" size={18} color={colors.text} />

      {unreadCount > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.danger,
              borderColor: colors.background,
            },
          ]}
        >
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -4,
    right: -4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
});
