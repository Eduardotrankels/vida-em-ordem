import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { resolveAppUserId } from "../utils/appSession";

const PROD_BASE_URL = "https://api.vidaemordem.app";

function resolveDevBackendBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];

    if (host) {
      return `http://${host}:3333`;
    }
  }

  return "http://72.62.137.25:3333";
}

const BASE_URL = __DEV__ ? resolveDevBackendBaseUrl() : PROD_BASE_URL;

const PREMIUM_KEY = "@vida_em_ordem_subscription_plan_v1";

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: any;
  userId?: string;
};

async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, userId } = options;
  const resolvedUserId = userId ?? (await resolveAppUserId());

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": resolvedUserId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let data: any = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      if (rawText.trim().startsWith("<")) {
        throw new Error(
          "O backend não respondeu JSON. Verifique se o servidor está online na porta 3333."
        );
      }

      throw new Error("A resposta do backend não está em JSON válido.");
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || "Erro na comunicação com o backend.");
  }

  return data as T;
}

async function isPremiumUser() {
  const premiumRaw = await AsyncStorage.getItem(PREMIUM_KEY);
  return premiumRaw === "premium" || premiumRaw === "true";
}

async function requirePremium(message?: string) {
  const premium = await isPremiumUser();

  if (!premium) {
    throw new Error(
      message || "Este recurso está disponível apenas no plano Premium."
    );
  }
}

export type BankConnectionStatus =
  | "pending"
  | "active"
  | "error"
  | "expired"
  | "revoked"
  | "UPDATING"
  | "UPDATED"
  | "LOGIN_IN_PROGRESS"
  | "WAITING_USER_INPUT"
  | "OUTDATED"
  | string;

export type BankConnection = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string;
  institutionType: string;
  status: BankConnectionStatus;
  accountCount: number;
  connectedAt: string;
  lastSyncedAt: string | null;
  consentExpiresAt: string | null;
};

export type ConnectorResponse = {
  results?: {
    id: number | string;
    name: string;
    imageUrl?: string;
    primaryColor?: string;
    type?: string;
  }[];
};

export type ConnectTokenResponse = {
  accessToken: string;
};

export type UserItemsResponse = {
  items: {
    itemId: string;
    connectorId?: number | string | null;
    institutionName?: string;
    createdAt: string;
    updatedAt?: string;
    status?: string;
  }[];
};

export type AppAccount = {
  id: string;
  itemId: string;
  name: string;
  type?: string;
  subtype?: string | null;
  number?: string | null;
  balance?: number;
  currencyCode?: string;
  updatedAt?: string;
};

export type AppAccountsResponse = {
  accounts: AppAccount[];
};

export type AppTransaction = {
  id: string;
  itemId: string;
  accountId: string;
  description: string;
  amount: number;
  date: string;
  type?: string | null;
  category?: string | null;
  currencyCode?: string;
  status?: string | null;
};

export type AppTransactionsResponse = {
  transactions: AppTransaction[];
};

export function getBackendBaseUrl() {
  return BASE_URL;
}

export function getConnectionStatusLabel(status: BankConnectionStatus): string {
  switch (status) {
    case "active":
    case "UPDATED":
      return "Ativa";
    case "pending":
    case "UPDATING":
    case "LOGIN_IN_PROGRESS":
    case "WAITING_USER_INPUT":
      return "Pendente";
    case "error":
      return "Erro";
    case "expired":
      return "Expirada";
    case "revoked":
      return "Revogada";
    case "OUTDATED":
      return "Desatualizada";
    default:
      return "Conectada";
  }
}

export async function getTransactions(userId?: string) {
  return api<AppTransactionsResponse>("/api/pluggy/transactions", {
    userId,
  });
}

export async function listConnectors() {
  return api<ConnectorResponse>("/api/pluggy/connectors");
}

export async function createConnectToken(
  userId?: string,
  itemId?: string
) {
  if (!itemId) {
    const premium = await isPremiumUser();

    if (!premium) {
      const registered = await listRegisteredItems(userId);

      if ((registered?.items || []).length >= 1) {
        throw new Error(
          "No plano Free você pode conectar apenas 1 banco. Faça upgrade para o Premium para conectar múltiplos bancos."
        );
      }
    }
  }

  return api<ConnectTokenResponse>("/api/pluggy/connect-token", {
    method: "POST",
    userId,
    body: itemId ? { itemId } : {},
  });
}

export async function listRegisteredItems(userId?: string) {
  return api<UserItemsResponse>("/api/pluggy/items", {
    userId,
  });
}

export async function registerItem(
  payload: {
    itemId: string;
    connectorId?: number | string | null;
    institutionName?: string;
    status?: string;
  },
  userId?: string
) {
  return api<{
    ok: true;
    items: UserItemsResponse["items"];
    accounts?: AppAccount[];
    transactions?: AppTransaction[];
  }>("/api/pluggy/items/register", {
    method: "POST",
    userId,
    body: payload,
  });
}

export async function getItemDetails(itemId: string) {
  return api<any>(`/api/pluggy/items/${itemId}`);
}

export async function getItemAccounts(itemId: string) {
  return api<any>(`/api/pluggy/items/${itemId}/accounts`);
}

export async function getAccountTransactions(
  accountId: string,
  params?: {
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
  }
) {
  const query = new URLSearchParams();

  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return api<any>(`/api/pluggy/accounts/${accountId}/transactions${suffix}`);
}

export async function deleteItem(itemId: string, userId?: string) {
  await requirePremium("Remover conexões é um recurso do plano Premium.");

  return api<{ ok: true; items: UserItemsResponse["items"] }>(
    `/api/pluggy/items/${itemId}`,
    {
      method: "DELETE",
      userId,
    }
  );
}

export async function syncItem(itemId: string, userId?: string) {
  await requirePremium("Sincronização manual é um recurso do plano Premium.");

  return api<{
    ok: true;
    item: any;
    accounts: AppAccount[];
    transactions: AppTransaction[];
  }>(`/api/pluggy/items/${itemId}/sync`, {
    method: "POST",
    userId,
    body: {},
  });
}

export async function listAppAccounts(
  userId?: string,
  itemId?: string
) {
  const suffix = itemId ? `?itemId=${encodeURIComponent(itemId)}` : "";
  return api<AppAccountsResponse>(`/api/app/accounts${suffix}`, { userId });
}

export async function listRealAccounts(userId?: string) {
  return api<{ accounts: any[] }>("/api/pluggy/accounts", {
    userId,
  });
}

export async function listRealTransactions(userId?: string) {
  return api<{ transactions: any[] }>("/api/pluggy/transactions", {
    userId,
  });
}

export async function listAppTransactions(
  userId?: string,
  params?: {
    itemId?: string;
    accountId?: string;
  }
) {
  const query = new URLSearchParams();

  if (params?.itemId) query.set("itemId", params.itemId);
  if (params?.accountId) query.set("accountId", params.accountId);

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return api<AppTransactionsResponse>(`/api/app/transactions${suffix}`, {
    userId,
  });
}
