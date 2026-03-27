import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATION_INBOX_KEY = "@vida_em_ordem_notification_inbox_v1";
const MAX_NOTIFICATIONS = 80;

export type InboxNotificationKind =
  | "app"
  | "external"
  | "journey"
  | "bank"
  | "billing";

export type InboxActionRoute =
  | "/(tabs)"
  | "/alertas"
  | "/assinatura"
  | "/premium"
  | "/perfil"
  | "/configuracoes"
  | "/ajuda-suporte"
  | "/plano-ia"
  | "/evolucao-ia"
  | "/dinheiro"
  | "/dinheiro-conectar-banco"
  | "/dinheiro-conexoes"
  | "/saude"
  | "/metas"
  | "/habitos"
  | "/checkin"
  | "/conquistas"
  | "/lazer"
  | "/trabalho"
  | "/tempo"
  | "/aprendizado"
  | "/espiritualidade";

export type AppInboxNotification = {
  id: string;
  title: string;
  message: string;
  kind: InboxNotificationKind;
  createdAt: string;
  readAt?: string | null;
  sourceId?: string | null;
  source?: string | null;
  actionRoute?: InboxActionRoute | null;
  isExternal?: boolean;
};

type NotificationListener = (items: AppInboxNotification[]) => void;

const listeners = new Set<NotificationListener>();

function buildNotificationId() {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readInbox() {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_INBOX_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as AppInboxNotification[];
  } catch (error) {
    console.log("Erro ao ler caixa de alertas:", error);
    return [];
  }
}

async function writeInbox(items: AppInboxNotification[]) {
  const trimmed = [...items]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, MAX_NOTIFICATIONS);

  await AsyncStorage.setItem(NOTIFICATION_INBOX_KEY, JSON.stringify(trimmed));

  listeners.forEach((listener) => {
    try {
      listener(trimmed);
    } catch (error) {
      console.log("Erro ao notificar ouvintes da caixa de alertas:", error);
    }
  });

  return trimmed;
}

export async function listInboxNotifications() {
  const items = await readInbox();

  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getUnreadInboxCount() {
  const items = await readInbox();

  return items.filter((item) => !item.readAt).length;
}

export async function pushInboxNotification(
  input: Omit<AppInboxNotification, "id" | "createdAt"> & {
    createdAt?: string;
  }
) {
  const current = await readInbox();
  const sourceId = input.sourceId?.trim() || null;

  if (sourceId) {
    const existing = current.find((item) => item.sourceId === sourceId);

    if (existing) {
      return existing;
    }
  }

  const nextItem: AppInboxNotification = {
    id: buildNotificationId(),
    title: input.title,
    message: input.message,
    kind: input.kind,
    createdAt: input.createdAt || new Date().toISOString(),
    readAt: input.readAt ?? null,
    sourceId,
    source: input.source ?? null,
    actionRoute: input.actionRoute ?? null,
    isExternal: Boolean(input.isExternal),
  };

  await writeInbox([nextItem, ...current]);
  return nextItem;
}

export async function markInboxNotificationRead(id: string) {
  const current = await readInbox();
  const next = current.map((item) =>
    item.id === id && !item.readAt
      ? { ...item, readAt: new Date().toISOString() }
      : item
  );

  await writeInbox(next);
}

export async function markAllInboxNotificationsRead() {
  const current = await readInbox();
  const now = new Date().toISOString();
  const next = current.map((item) =>
    item.readAt ? item : { ...item, readAt: now }
  );

  await writeInbox(next);
}

export async function clearInboxNotifications() {
  await writeInbox([]);
}

export function subscribeInboxUpdates(listener: NotificationListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
