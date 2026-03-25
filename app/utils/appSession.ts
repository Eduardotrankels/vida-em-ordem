import AsyncStorage from "@react-native-async-storage/async-storage";

export const APP_SESSION_KEY = "@vida_em_ordem_app_session_v1";

export type AppSessionProvider = "local" | "google";

export type AppSessionProfileInput = {
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
  photoUri?: string | null;
};

export type AppSession = {
  userId: string;
  provider: AppSessionProvider;
  name: string | null;
  nickname: string | null;
  email: string | null;
  photoUri: string | null;
  googleLinkedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeNullableText(value?: string | null) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildSessionSeed(profile?: AppSessionProfileInput) {
  const emailSeed = normalizeNullableText(profile?.email);
  const nameSeed =
    normalizeNullableText(profile?.nickname) ||
    normalizeNullableText(profile?.name) ||
    "usuario";

  const base = (emailSeed || nameSeed)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return base || "usuario";
}

function buildUserId(profile?: AppSessionProfileInput) {
  const seed = buildSessionSeed(profile);
  const entropy = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  return `vo_${seed}_${entropy}`;
}

function buildNickname(profile?: AppSessionProfileInput) {
  const explicitNickname = normalizeNullableText(profile?.nickname);

  if (explicitNickname) {
    return explicitNickname;
  }

  const safeName = normalizeNullableText(profile?.name);

  if (!safeName) {
    return null;
  }

  return safeName.split(/\s+/)[0] || safeName;
}

function sanitizeSession(raw: any): AppSession | null {
  if (!raw || typeof raw !== "object") return null;

  const userId =
    typeof raw.userId === "string" && raw.userId.trim()
      ? raw.userId.trim()
      : null;

  if (!userId) return null;

  const provider: AppSessionProvider =
    raw.provider === "google" ? "google" : "local";

  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.trim()
      ? raw.createdAt
      : new Date().toISOString();

  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt.trim()
      ? raw.updatedAt
      : createdAt;

  return {
    userId,
    provider,
    name: normalizeNullableText(raw.name),
    nickname: normalizeNullableText(raw.nickname),
    email: normalizeNullableText(raw.email),
    photoUri: normalizeNullableText(raw.photoUri),
    googleLinkedAt: normalizeNullableText(raw.googleLinkedAt),
    createdAt,
    updatedAt,
  };
}

function mergeSessionProfile(
  session: AppSession,
  profile?: AppSessionProfileInput,
  provider?: AppSessionProvider
) {
  const now = new Date().toISOString();
  const nextProvider = provider || session.provider;

  return {
    ...session,
    provider: nextProvider,
    name: normalizeNullableText(profile?.name) ?? session.name,
    nickname: buildNickname(profile) ?? session.nickname,
    email: normalizeNullableText(profile?.email) ?? session.email,
    photoUri: normalizeNullableText(profile?.photoUri) ?? session.photoUri,
    googleLinkedAt:
      nextProvider === "google"
        ? session.googleLinkedAt || now
        : session.googleLinkedAt,
    updatedAt: now,
  };
}

export async function readAppSession(): Promise<AppSession | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_SESSION_KEY);

    if (!raw) return null;

    return sanitizeSession(JSON.parse(raw));
  } catch (error) {
    console.log("Erro ao carregar sessão do app:", error);
    return null;
  }
}

export async function saveAppSession(session: AppSession) {
  const safeSession = sanitizeSession(session);

  if (!safeSession) {
    throw new Error("Sessão inválida para salvar.");
  }

  await AsyncStorage.setItem(APP_SESSION_KEY, JSON.stringify(safeSession));
  return safeSession;
}

export async function ensureAppSession(
  profile?: AppSessionProfileInput
): Promise<AppSession> {
  const current = await readAppSession();

  if (current) {
    const merged = mergeSessionProfile(current, profile);
    return saveAppSession(merged);
  }

  const now = new Date().toISOString();
  const session: AppSession = {
    userId: buildUserId(profile),
    provider: "local",
    name: normalizeNullableText(profile?.name),
    nickname: buildNickname(profile),
    email: normalizeNullableText(profile?.email),
    photoUri: normalizeNullableText(profile?.photoUri),
    googleLinkedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  return saveAppSession(session);
}

export async function linkGoogleSession(
  profile?: AppSessionProfileInput
): Promise<AppSession> {
  const current = await ensureAppSession(profile);
  const linked = mergeSessionProfile(current, profile, "google");
  return saveAppSession(linked);
}

export async function clearAppSession() {
  await AsyncStorage.removeItem(APP_SESSION_KEY);
}

export async function resolveAppUserId(profile?: AppSessionProfileInput) {
  const session = await ensureAppSession(profile);
  return session.userId;
}
