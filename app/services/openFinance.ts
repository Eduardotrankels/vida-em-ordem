import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveAppUserId } from "../utils/appSession";

export type BankConnectionStatus =
  | "pending"
  | "active"
  | "error"
  | "expired"
  | "revoked";

export type SupportedInstitution = {
  id: string;
  name: string;
  type: string;
  logo: string;
  color: string;
  description: string;
  available: boolean;
};

export type BankInstitution = SupportedInstitution;

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

type MoneyEntryType = "entrada" | "saida";

type MoneyCategory =
  | "Moradia"
  | "Alimentação"
  | "Transporte"
  | "Lazer"
  | "Investimentos"
  | "Educação"
  | "Saúde"
  | "Outros";

export type ImportedMoneyEntry = {
  id: string;
  title: string;
  amount: number;
  type: MoneyEntryType;
  category: MoneyCategory;
  createdAt: string;
  source?: "open_finance";
  institutionId?: string;
  institutionName?: string;
  externalId?: string;
  tags?: string[];
  isRecurring?: boolean;
  notes?: string;
};

const BASE_URL = "http://72.62.137.25:3333";

const BANK_CONNECTIONS_KEY = "@vida_em_ordem_bank_connections_v2";
const MONEY_ENTRIES_KEY = "@vida_em_ordem_money_entries_v1";
const PREMIUM_KEY = "@vida_em_ordem_subscription_plan_v1";

async function api<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const query = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
  }

  const url = `${BASE_URL}${path}${query.toString() ? `?${query.toString()}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Erro ao comunicar com o backend.");
  }

  return response.json();
}

export async function getTransactions(userId?: string) {
  const resolvedUserId = userId ?? (await resolveAppUserId());
  return api<{ transactions: any[] }>("/api/pluggy/transactions", {
    userId: resolvedUserId,
  });
}

export async function getAccounts(userId?: string) {
  const resolvedUserId = userId ?? (await resolveAppUserId());
  return api<{ accounts: any[] }>("/api/pluggy/accounts", {
    userId: resolvedUserId,
  });
}

const MOCK_INSTITUTIONS: SupportedInstitution[] = [
  {
    id: "nubank",
    name: "Nubank",
    type: "Conta digital",
    logo: "🟣",
    color: "#8b5cf6",
    description: "Conta, cartão e movimentações do dia a dia.",
    available: true,
  },
  {
    id: "itau",
    name: "Itaú",
    type: "Banco tradicional",
    logo: "🟠",
    color: "#f97316",
    description: "Sincronize saldos, entradas e saídas automaticamente.",
    available: true,
  },
  {
    id: "bradesco",
    name: "Bradesco",
    type: "Banco tradicional",
    logo: "🔴",
    color: "#ef4444",
    description: "Importe movimentações e acompanhe despesas do mês.",
    available: true,
  },
  {
    id: "santander",
    name: "Santander",
    type: "Banco tradicional",
    logo: "❤️",
    color: "#dc2626",
    description: "Centralize sua conta e visualize o fluxo financeiro.",
    available: true,
  },
  {
    id: "inter",
    name: "Banco Inter",
    type: "Conta digital",
    logo: "🧡",
    color: "#fb923c",
    description: "Conecte sua conta digital e acompanhe gastos com clareza.",
    available: true,
  },
  {
    id: "c6",
    name: "C6 Bank",
    type: "Conta digital",
    logo: "⚫",
    color: "#111827",
    description: "Integração com conta digital e histórico de transações.",
    available: true,
  },
  {
    id: "caixa",
    name: "Caixa",
    type: "Banco tradicional",
    logo: "🔵",
    color: "#2563eb",
    description: "Integração em preparação.",
    available: false,
  },
  {
    id: "bb",
    name: "Banco do Brasil",
    type: "Banco tradicional",
    logo: "🟡",
    color: "#eab308",
    description: "Integração em preparação.",
    available: false,
  },
];

const INCOME_TEMPLATES = [
  "Salário",
  "Pix recebido",
  "Transferência recebida",
  "Rendimento aplicação",
  "Freelance",
  "Reembolso",
  "Venda realizada",
];

const EXPENSE_TEMPLATES = [
  "Mercado",
  "Supermercado",
  "Ifood",
  "Restaurante",
  "Uber",
  "99",
  "Combustível",
  "Farmácia",
  "Consulta médica",
  "Curso online",
  "Livro",
  "Netflix",
  "Spotify",
  "Internet",
  "Energia elétrica",
  "Água",
  "Aluguel",
  "Condomínio",
  "Cinema",
  "Lanche",
  "Padaria",
];

const RECURRING_KEYWORDS = [
  "netflix",
  "spotify",
  "internet",
  "energia",
  "agua",
  "água",
  "aluguel",
  "condominio",
  "condomínio",
];

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function isPremiumUser(): Promise<boolean> {
  const premiumRaw = await AsyncStorage.getItem(PREMIUM_KEY);
  return premiumRaw === "premium" || premiumRaw === "true";
}

function isValidStatus(value: unknown): value is BankConnectionStatus {
  return (
    value === "pending" ||
    value === "active" ||
    value === "error" ||
    value === "expired" ||
    value === "revoked"
  );
}

function isValidMoneyCategory(value: unknown): value is MoneyCategory {
  return (
    value === "Moradia" ||
    value === "Alimentação" ||
    value === "Transporte" ||
    value === "Lazer" ||
    value === "Investimentos" ||
    value === "Educação" ||
    value === "Saúde" ||
    value === "Outros"
  );
}

function normalizeConnections(raw: unknown): BankConnection[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any) => ({
    id: String(item?.id ?? uid()),
    institutionId: String(item?.institutionId ?? ""),
    institutionName: String(item?.institutionName ?? "Banco"),
    institutionLogo: String(item?.institutionLogo ?? "🏦"),
    institutionType: String(item?.institutionType ?? "Conta"),
    status: isValidStatus(item?.status) ? item.status : "pending",
    accountCount: Number(item?.accountCount ?? 1),
    connectedAt: String(item?.connectedAt ?? new Date().toISOString()),
    lastSyncedAt: item?.lastSyncedAt ? String(item.lastSyncedAt) : null,
    consentExpiresAt: item?.consentExpiresAt
      ? String(item.consentExpiresAt)
      : null,
  }));
}

function normalizeMoneyEntries(raw: unknown): ImportedMoneyEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any) => ({
    id: String(item?.id ?? uid()),
    title: String(item?.title ?? "Movimentação"),
    amount: Number(item?.amount ?? 0),
    type: item?.type === "entrada" ? "entrada" : "saida",
    category: isValidMoneyCategory(item?.category) ? item.category : "Outros",
    createdAt: String(item?.createdAt ?? new Date().toISOString()),
    source: item?.source === "open_finance" ? "open_finance" : undefined,
    institutionId: item?.institutionId ? String(item.institutionId) : undefined,
    institutionName: item?.institutionName
      ? String(item.institutionName)
      : undefined,
    externalId: item?.externalId ? String(item.externalId) : undefined,
    tags: Array.isArray(item?.tags) ? item.tags.map(String) : [],
    isRecurring: !!item?.isRecurring,
    notes: item?.notes ? String(item.notes) : undefined,
  }));
}

function categorizeTransaction(
  description: string,
  type: MoneyEntryType
): MoneyCategory {
  const text = normalizeText(description);

  if (
    text.includes("mercado") ||
    text.includes("supermercado") ||
    text.includes("ifood") ||
    text.includes("restaurante") ||
    text.includes("padaria") ||
    text.includes("lanche")
  ) {
    return "Alimentação";
  }

  if (
    text.includes("uber") ||
    text.includes("99") ||
    text.includes("combustivel") ||
    text.includes("combustível") ||
    text.includes("gasolina") ||
    text.includes("transporte") ||
    text.includes("onibus") ||
    text.includes("ônibus")
  ) {
    return "Transporte";
  }

  if (
    text.includes("farmacia") ||
    text.includes("farmácia") ||
    text.includes("consulta") ||
    text.includes("clinica") ||
    text.includes("clínica") ||
    text.includes("medica") ||
    text.includes("médica") ||
    text.includes("saude") ||
    text.includes("saúde")
  ) {
    return "Saúde";
  }

  if (
    text.includes("curso") ||
    text.includes("livro") ||
    text.includes("faculdade") ||
    text.includes("escola")
  ) {
    return "Educação";
  }

  if (
    text.includes("cinema") ||
    text.includes("netflix") ||
    text.includes("spotify") ||
    text.includes("show") ||
    text.includes("lazer")
  ) {
    return "Lazer";
  }

  if (
    text.includes("aluguel") ||
    text.includes("condominio") ||
    text.includes("condomínio") ||
    text.includes("energia") ||
    text.includes("agua") ||
    text.includes("água") ||
    text.includes("internet") ||
    text.includes("moradia")
  ) {
    return "Moradia";
  }

  if (
    type === "entrada" &&
    (text.includes("rendimento") ||
      text.includes("aplicacao") ||
      text.includes("aplicação") ||
      text.includes("invest") ||
      text.includes("resgate"))
  ) {
    return "Investimentos";
  }

  return "Outros";
}

function detectRecurring(description: string) {
  const text = normalizeText(description);
  return RECURRING_KEYWORDS.some((keyword) => text.includes(keyword));
}

function buildTags(
  description: string,
  type: MoneyEntryType,
  category: MoneyCategory,
  institutionName: string,
  isRecurring: boolean
) {
  const tags = new Set<string>();

  tags.add(type === "entrada" ? "entrada" : "saida");
  tags.add(category.toLowerCase());
  tags.add(normalizeText(institutionName).replace(/\s+/g, "_"));

  if (isRecurring) tags.add("recorrente");

  const text = normalizeText(description);

  if (text.includes("pix")) tags.add("pix");
  if (text.includes("salario") || text.includes("salário")) tags.add("salario");
  if (text.includes("rendimento")) tags.add("rendimento");
  if (text.includes("uber") || text.includes("99")) tags.add("mobilidade");
  if (text.includes("ifood") || text.includes("restaurante")) tags.add("refeicao");
  if (text.includes("mercado") || text.includes("supermercado")) tags.add("essencial");
  if (text.includes("netflix") || text.includes("spotify")) tags.add("assinatura");

  return Array.from(tags);
}

function buildNotes(
  description: string,
  institutionName: string,
  isRecurring: boolean
) {
  const parts: string[] = [`Importado de ${institutionName}`];

  if (isRecurring) {
    parts.push("Possível despesa recorrente detectada");
  }

  if (
    normalizeText(description).includes("salario") ||
    normalizeText(description).includes("salário")
  ) {
    parts.push("Entrada relevante para planejamento mensal");
  }

  return parts.join(" • ");
}

function buildAmountByType(type: MoneyEntryType, title: string) {
  const text = normalizeText(title);

  if (type === "entrada") {
    if (text.includes("salario") || text.includes("salário")) {
      return randomInt(1800, 6500);
    }
    if (text.includes("freelance")) return randomInt(150, 1800);
    if (text.includes("rendimento")) return randomInt(8, 150);
    if (text.includes("reembolso")) return randomInt(20, 300);
    return randomInt(40, 700);
  }

  if (text.includes("aluguel")) return randomInt(700, 2500);
  if (text.includes("condominio") || text.includes("condomínio")) {
    return randomInt(180, 750);
  }
  if (text.includes("energia")) return randomInt(90, 260);
  if (text.includes("agua") || text.includes("água")) return randomInt(40, 120);
  if (text.includes("internet")) return randomInt(79, 150);
  if (text.includes("netflix")) return 39.9;
  if (text.includes("spotify")) return 21.9;
  if (text.includes("mercado") || text.includes("supermercado")) {
    return randomInt(80, 450);
  }
  if (text.includes("ifood")) return randomInt(25, 90);
  if (text.includes("uber") || text.includes("99")) return randomInt(18, 70);
  if (text.includes("combustivel") || text.includes("combustível")) {
    return randomInt(70, 260);
  }
  if (text.includes("farmacia") || text.includes("farmácia")) {
    return randomInt(20, 140);
  }
  if (text.includes("curso")) return randomInt(59, 250);
  if (text.includes("livro")) return randomInt(30, 120);

  return randomInt(20, 220);
}

function buildMockTransactions(
  connection: BankConnection,
  isPremium: boolean
): ImportedMoneyEntry[] {
  const now = new Date();
  const count = isPremium ? randomInt(8, 14) : randomInt(3, 5);
  const transactions: ImportedMoneyEntry[] = [];

  for (let i = 0; i < count; i++) {
    const type: MoneyEntryType = Math.random() > 0.28 ? "saida" : "entrada";
    const title = pickOne(
      type === "entrada" ? INCOME_TEMPLATES : EXPENSE_TEMPLATES
    );
    const amount = buildAmountByType(type, title);
    const createdAt = addDays(now, -randomInt(0, isPremium ? 30 : 10)).toISOString();
    const category = categorizeTransaction(title, type);
    const isRecurring = detectRecurring(title);
    const externalId = `${connection.institutionId}_${createdAt}_${title}_${amount}_${type}`;

    transactions.push({
      id: uid(),
      title,
      amount,
      type,
      category,
      createdAt,
      source: "open_finance",
      institutionId: connection.institutionId,
      institutionName: connection.institutionName,
      externalId,
      tags: buildTags(
        title,
        type,
        category,
        connection.institutionName,
        isRecurring
      ),
      isRecurring,
      notes: buildNotes(title, connection.institutionName, isRecurring),
    });
  }

  return transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function readStoredConnections(): Promise<BankConnection[]> {
  const raw = await AsyncStorage.getItem(BANK_CONNECTIONS_KEY);
  return normalizeConnections(raw ? JSON.parse(raw) : []);
}

async function writeStoredConnections(connections: BankConnection[]) {
  await AsyncStorage.setItem(BANK_CONNECTIONS_KEY, JSON.stringify(connections));
}

async function readMoneyEntries(): Promise<ImportedMoneyEntry[]> {
  const raw = await AsyncStorage.getItem(MONEY_ENTRIES_KEY);
  return normalizeMoneyEntries(raw ? JSON.parse(raw) : []);
}

async function writeMoneyEntries(entries: ImportedMoneyEntry[]) {
  await AsyncStorage.setItem(MONEY_ENTRIES_KEY, JSON.stringify(entries));
}

export function getMockInstitutions(): SupportedInstitution[] {
  return [...MOCK_INSTITUTIONS];
}

export function getConnectionStatusLabel(status: BankConnectionStatus): string {
  switch (status) {
    case "active":
      return "Ativa";
    case "pending":
      return "Pendente";
    case "error":
      return "Erro";
    case "expired":
      return "Expirada";
    case "revoked":
      return "Revogada";
    default:
      return "Desconhecido";
  }
}

export async function listStoredConnections(): Promise<BankConnection[]> {
  const connections = await readStoredConnections();
  const premium = await isPremiumUser();

  return premium ? connections : connections.slice(0, 1);
}

export async function connectMockInstitution(
  institutionId: string
): Promise<BankConnection[]> {
  const institution = MOCK_INSTITUTIONS.find((item) => item.id === institutionId);

  if (!institution) {
    throw new Error("Instituição não encontrada.");
  }

  if (!institution.available) {
    throw new Error("Esta instituição ainda não está disponível para conexão.");
  }

  const premium = await isPremiumUser();
  const connections = await readStoredConnections();

  if (!premium && connections.length >= 1) {
    throw new Error(
      "No plano Free você pode conectar apenas 1 banco. Faça upgrade para o Premium."
    );
  }

  const alreadyExists = connections.some(
    (connection) => connection.institutionId === institutionId
  );

  if (alreadyExists) {
    return premium ? connections : connections.slice(0, 1);
  }

  const now = new Date();
  const consentExpiresAt = addDays(now, 180).toISOString();

  const newConnection: BankConnection = {
    id: uid(),
    institutionId: institution.id,
    institutionName: institution.name,
    institutionLogo: institution.logo,
    institutionType: institution.type,
    status: "active",
    accountCount: premium ? randomInt(1, 3) : 1,
    connectedAt: now.toISOString(),
    lastSyncedAt: null,
    consentExpiresAt,
  };

  const nextConnections = [newConnection, ...connections];
  await writeStoredConnections(nextConnections);

  return premium ? nextConnections : nextConnections.slice(0, 1);
}

export async function removeStoredConnection(
  connectionId: string
): Promise<BankConnection[]> {
  const premium = await isPremiumUser();

  if (!premium) {
    throw new Error("Remover conexões é um recurso do plano Premium.");
  }

  const connections = await readStoredConnections();
  const target = connections.find((connection) => connection.id === connectionId);

  const nextConnections = connections.filter(
    (connection) => connection.id !== connectionId
  );

  await writeStoredConnections(nextConnections);

  if (target) {
    const entries = await readMoneyEntries();
    const filteredEntries = entries.filter(
      (entry) => entry.institutionId !== target.institutionId
    );
    await writeMoneyEntries(filteredEntries);
  }

  return nextConnections;
}

export async function syncStoredConnection(
  connectionId: string
): Promise<BankConnection[]> {
  const premium = await isPremiumUser();

  if (!premium) {
    throw new Error("Sincronização manual é um recurso do plano Premium.");
  }

  const connections = await readStoredConnections();
  const connection = connections.find((item) => item.id === connectionId);

  if (!connection) {
    throw new Error("Conexão não encontrada.");
  }

  if (connection.status !== "active") {
    throw new Error("A conexão não está ativa.");
  }

  const importedEntries = await readMoneyEntries();
  const newTransactions = buildMockTransactions(connection, premium);

  const existingExternalIds = new Set(
    importedEntries
      .map((entry) => entry.externalId)
      .filter((value): value is string => !!value)
  );

  const onlyNewTransactions = newTransactions.filter(
    (transaction) =>
      !!transaction.externalId && !existingExternalIds.has(transaction.externalId)
  );

  const mergedEntries = [...onlyNewTransactions, ...importedEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  await writeMoneyEntries(mergedEntries);

  const nowIso = new Date().toISOString();

  const nextConnections = connections.map((item) =>
    item.id === connectionId
      ? {
          ...item,
          lastSyncedAt: nowIso,
          status: "active" as const,
        }
      : item
  );

  await writeStoredConnections(nextConnections);

  return nextConnections;
}
