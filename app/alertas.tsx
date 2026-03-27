import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AppScreenHeader from "../components/AppScreenHeader";
import {
  AppInboxNotification,
  listInboxNotifications,
  markAllInboxNotificationsRead,
  markInboxNotificationRead,
  subscribeInboxUpdates,
} from "./utils/notificationInbox";
import { useAppLanguage } from "./utils/languageContext";
import { formatDateTimeByLanguage } from "./utils/locale";
import { getScreenContentBottomPadding } from "./utils/safeArea";
import { useAppTheme } from "./utils/themeContext";

const copyByLanguage = {
  pt: {
    title: "Alertas",
    subtitle:
      "Acompanhe mensagens do app, lembretes da jornada e notificações externas em um só lugar.",
    unreadBadge: (count: number) => `${count} novas`,
    markAll: "Marcar tudo como lido",
    emptyTitle: "Nenhum alerta por aqui",
    emptyText:
      "Quando o app tiver algo importante para te avisar, tudo vai aparecer nesta caixa.",
    unread: "Novo",
    read: "Lido",
    kind: {
      app: "App",
      external: "Externo",
      journey: "Jornada",
      bank: "Bancos",
      billing: "Plano",
    },
    openAction: "Abrir",
  },
  en: {
    title: "Alerts",
    subtitle:
      "Track app messages, journey reminders, and external notifications in one place.",
    unreadBadge: (count: number) => `${count} new`,
    markAll: "Mark all as read",
    emptyTitle: "No alerts yet",
    emptyText:
      "When the app has something important to tell you, everything will show up here.",
    unread: "New",
    read: "Read",
    kind: {
      app: "App",
      external: "External",
      journey: "Journey",
      bank: "Banks",
      billing: "Plan",
    },
    openAction: "Open",
  },
  es: {
    title: "Alertas",
    subtitle:
      "Acompaña mensajes de la app, recordatorios de la jornada y notificaciones externas en un solo lugar.",
    unreadBadge: (count: number) => `${count} nuevas`,
    markAll: "Marcar todo como leído",
    emptyTitle: "Aún no hay alertas",
    emptyText:
      "Cuando la app tenga algo importante para avisarte, todo aparecerá aquí.",
    unread: "Nuevo",
    read: "Leído",
    kind: {
      app: "App",
      external: "Externo",
      journey: "Jornada",
      bank: "Bancos",
      billing: "Plan",
    },
    openAction: "Abrir",
  },
  fr: {
    title: "Alertes",
    subtitle:
      "Retrouvez les messages de l'app, les rappels de la journée et les notifications externes au même endroit.",
    unreadBadge: (count: number) => `${count} nouvelles`,
    markAll: "Tout marquer comme lu",
    emptyTitle: "Aucune alerte pour l'instant",
    emptyText:
      "Quand l'app aura quelque chose d'important à vous signaler, tout apparaîtra ici.",
    unread: "Nouveau",
    read: "Lu",
    kind: {
      app: "App",
      external: "Externe",
      journey: "Parcours",
      bank: "Banques",
      billing: "Plan",
    },
    openAction: "Ouvrir",
  },
  it: {
    title: "Avvisi",
    subtitle:
      "Segui messaggi dell'app, promemoria del percorso e notifiche esterne in un solo posto.",
    unreadBadge: (count: number) => `${count} nuove`,
    markAll: "Segna tutto come letto",
    emptyTitle: "Nessun avviso per ora",
    emptyText:
      "Quando l'app avrà qualcosa di importante da dirti, tutto apparirà qui.",
    unread: "Nuovo",
    read: "Letto",
    kind: {
      app: "App",
      external: "Esterno",
      journey: "Percorso",
      bank: "Banche",
      billing: "Piano",
    },
    openAction: "Apri",
  },
} as const;

export default function AlertasScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { language } = useAppLanguage();
  const copy = copyByLanguage[language];
  const [items, setItems] = useState<AppInboxNotification[]>([]);

  const reloadItems = useCallback(async () => {
    const nextItems = await listInboxNotifications();
    setItems(nextItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadItems();
    }, [reloadItems])
  );

  useEffect(() => {
    return subscribeInboxUpdates((nextItems) => {
      setItems(nextItems);
    });
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items]
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllInboxNotificationsRead();
  }, []);

  const handleOpenNotification = useCallback(
    async (item: AppInboxNotification) => {
      if (!item.readAt) {
        await markInboxNotificationRead(item.id);
      }

      if (item.actionRoute) {
        router.push(item.actionRoute);
      }
    },
    []
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getScreenContentBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppScreenHeader
          title={copy.title}
          subtitle={copy.subtitle}
          icon="notifications-outline"
          badgeLabel={unreadCount > 0 ? copy.unreadBadge(unreadCount) : undefined}
          badgeTone="accent"
          showNotifications={false}
        />

        {items.length > 0 ? (
          <Pressable
            style={[
              styles.markAllButton,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
            onPress={handleMarkAllRead}
          >
            <Text style={[styles.markAllButtonText, { color: colors.text }]}>
              {copy.markAll}
            </Text>
          </Pressable>
        ) : null}

        {items.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconWrap,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="notifications-off-outline"
                size={22}
                color={colors.textMuted}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {copy.emptyTitle}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {copy.emptyText}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const isUnread = !item.readAt;

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isUnread ? colors.accentBorder : colors.border,
                    },
                  ]}
                  onPress={() => {
                    void handleOpenNotification(item);
                  }}
                >
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.kindBadge,
                        {
                          backgroundColor: isUnread
                            ? colors.accentSoft
                            : colors.surfaceAlt,
                          borderColor: isUnread
                            ? colors.accentBorder
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.kindBadgeText,
                          {
                            color: isUnread ? colors.accent : colors.textMuted,
                          },
                        ]}
                      >
                        {copy.kind[item.kind]}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isUnread
                            ? colors.successSoft
                            : colors.surfaceAlt,
                          borderColor: isUnread ? colors.success : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: isUnread ? colors.success : colors.textMuted,
                          },
                        ]}
                      >
                        {isUnread ? copy.unread : copy.read}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.cardMessage, { color: colors.textSecondary }]}
                  >
                    {item.message}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                      {formatDateTimeByLanguage(item.createdAt, language)}
                    </Text>

                    {item.actionRoute ? (
                      <Text
                        style={[styles.openActionText, { color: colors.accent }]}
                      >
                        {copy.openAction}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  markAllButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  markAllButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  kindBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  kindBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14,
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  cardDate: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  openActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
