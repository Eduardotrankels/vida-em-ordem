import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import { PluggyClient } from "pluggy-sdk";
import { getDb } from "./db.js";

dotenv.config();

const pluggy = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});
const googleClient = new OAuth2Client();

const app = express();

app.use(
  cors({
    origin: process.env.APP_ORIGIN || "*",
  })
);
app.use(express.json());

const PORT = Number(process.env.PORT || 3333);
const PLUGGY_BASE_URL = process.env.PLUGGY_BASE_URL || "https://api.pluggy.ai";
const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  "";
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.GOOGLE_ANDROID_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  "";
const GOOGLE_IOS_CLIENT_ID =
  process.env.GOOGLE_IOS_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  "";

/**
 * Cache simples em memória para API Key
 */
let apiKeyCache = {
  value: null,
  expiresAt: 0,
};

if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
  console.error("❌ Faltam PLUGGY_CLIENT_ID e/ou PLUGGY_CLIENT_SECRET no .env");
  process.exit(1);
}

function nowMs() {
  return Date.now();
}

function safeErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.codeDescription ||
    error?.response?.data?.error ||
    error?.message ||
    "Erro inesperado"
  );
}

function getGoogleAudiences() {
  return [
    GOOGLE_WEB_CLIENT_ID,
    GOOGLE_ANDROID_CLIENT_ID,
    GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean);
}

async function getUserById(userId) {
  const db = await getDb();

  return db.get(
    `
      SELECT
        id,
        provider,
        email,
        name,
        nickname,
        photo_url as photoUrl,
        locale,
        region,
        currency_code as currencyCode,
        google_sub as googleSub,
        created_at as createdAt,
        updated_at as updatedAt
      FROM users
      WHERE id = ?
    `,
    [String(userId)]
  );
}

async function getUserByGoogleSub(googleSub) {
  const db = await getDb();

  return db.get(
    `
      SELECT
        id,
        provider,
        email,
        name,
        nickname,
        photo_url as photoUrl,
        locale,
        region,
        currency_code as currencyCode,
        google_sub as googleSub,
        created_at as createdAt,
        updated_at as updatedAt
      FROM users
      WHERE google_sub = ?
    `,
    [String(googleSub)]
  );
}

async function upsertUserAccount({
  id,
  provider = "local",
  email = null,
  name = null,
  nickname = null,
  photoUrl = null,
  locale = null,
  region = null,
  currencyCode = null,
  googleSub = null,
  rawJson = null,
}) {
  const safeId =
    typeof id === "string" && id.trim() ? id.trim() : null;

  if (!safeId) {
    throw new Error("id do usuário é obrigatório.");
  }

  const current = await getUserById(safeId);
  const now = new Date().toISOString();

  const merged = {
    id: safeId,
    provider: provider || current?.provider || "local",
    email: email ?? current?.email ?? null,
    name: name ?? current?.name ?? null,
    nickname: nickname ?? current?.nickname ?? null,
    photoUrl: photoUrl ?? current?.photoUrl ?? null,
    locale: locale ?? current?.locale ?? null,
    region: region ?? current?.region ?? null,
    currencyCode: currencyCode ?? current?.currencyCode ?? null,
    googleSub: googleSub ?? current?.googleSub ?? null,
    createdAt: current?.createdAt || now,
    updatedAt: now,
    rawJson: rawJson ? JSON.stringify(rawJson) : null,
  };

  const db = await getDb();

  await db.run(
    `
      INSERT INTO users (
        id, provider, email, name, nickname, photo_url, locale, region,
        currency_code, google_sub, created_at, updated_at, raw_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider = excluded.provider,
        email = excluded.email,
        name = excluded.name,
        nickname = excluded.nickname,
        photo_url = excluded.photo_url,
        locale = excluded.locale,
        region = excluded.region,
        currency_code = excluded.currency_code,
        google_sub = excluded.google_sub,
        updated_at = excluded.updated_at,
        raw_json = COALESCE(excluded.raw_json, users.raw_json)
    `,
    [
      merged.id,
      merged.provider,
      merged.email,
      merged.name,
      merged.nickname,
      merged.photoUrl,
      merged.locale,
      merged.region,
      merged.currencyCode,
      merged.googleSub,
      merged.createdAt,
      merged.updatedAt,
      merged.rawJson,
    ]
  );

  const saved = await getUserById(merged.id);

  return {
    ...saved,
    googleLinked: !!saved?.googleSub,
  };
}

async function ensureUserRecord(userId) {
  return upsertUserAccount({ id: userId, provider: "local" });
}

async function verifyGoogleIdToken(idToken) {
  const audiences = getGoogleAudiences();

  if (!audiences.length) {
    const error = new Error("Google OAuth ainda não foi configurado no backend.");
    error.statusCode = 503;
    throw error;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audiences,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub) {
    throw new Error("O token do Google não trouxe um identificador válido.");
  }

  return {
    googleSub: payload.sub,
    email: payload.email || null,
    name: payload.name || null,
    photoUrl: payload.picture || null,
    rawJson: payload,
  };
}

async function getPluggyApiKey() {
  if (apiKeyCache.value && apiKeyCache.expiresAt > nowMs()) {
    return apiKeyCache.value;
  }

  const response = await axios.post(
    `${PLUGGY_BASE_URL}/auth`,
    {
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const apiKey = response.data?.apiKey;

  if (!apiKey) {
    throw new Error("Não foi possível obter API Key da Pluggy.");
  }

  apiKeyCache = {
    value: apiKey,
    expiresAt: nowMs() + 1000 * 60 * 110,
  };

  return apiKey;
}

async function pluggyRequest(method, path, { data, params, headers } = {}) {
  const apiKey = await getPluggyApiKey();

  const response = await axios({
    method,
    url: `${PLUGGY_BASE_URL}${path}`,
    data,
    params,
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });

  return response.data;
}

async function ensureUserId(req, res, next) {
  try {
    const userId =
      req.headers["x-user-id"] || req.query.userId || req.body?.userId;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        error: "userId é obrigatório. Envie em x-user-id, query ou body.",
      });
    }

    await ensureUserRecord(userId);
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
}

async function getUserItems(userId) {
  const db = await getDb();
  return db.all(
    `
      SELECT
        item_id as itemId,
        connector_id as connectorId,
        institution_name as institutionName,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM user_items
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `,
    [userId]
  );
}

async function upsertUserItem(userId, item) {
  const db = await getDb();

  await db.run(
    `
      INSERT INTO user_items (
        user_id, item_id, connector_id, institution_name, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        connector_id = excluded.connector_id,
        institution_name = excluded.institution_name,
        status = excluded.status,
        updated_at = excluded.updated_at
    `,
    [
      userId,
      item.itemId,
      item.connectorId || null,
      item.institutionName || "Instituição",
      item.status || "UPDATING",
      item.createdAt || new Date().toISOString(),
      item.updatedAt || new Date().toISOString(),
    ]
  );
}

async function deleteUserItem(userId, itemId) {
  const db = await getDb();

  await db.run(`DELETE FROM user_items WHERE user_id = ? AND item_id = ?`, [
    userId,
    itemId,
  ]);

  await db.run(`DELETE FROM user_accounts WHERE user_id = ? AND item_id = ?`, [
    userId,
    itemId,
  ]);

  await db.run(`DELETE FROM user_transactions WHERE user_id = ? AND item_id = ?`, [
    userId,
    itemId,
  ]);
}

async function upsertAccounts(userId, itemId, accounts) {
  const db = await getDb();

  for (const account of accounts) {
    await db.run(
      `
        INSERT INTO user_accounts (
          user_id, account_id, item_id, name, type, subtype, number,
          balance, currency_code, updated_at, raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id) DO UPDATE SET
          item_id = excluded.item_id,
          name = excluded.name,
          type = excluded.type,
          subtype = excluded.subtype,
          number = excluded.number,
          balance = excluded.balance,
          currency_code = excluded.currency_code,
          updated_at = excluded.updated_at,
          raw_json = excluded.raw_json
      `,
      [
        userId,
        String(account.id),
        String(itemId),
        account.name || "Conta",
        account.type || account.subtype || "ACCOUNT",
        account.subtype || null,
        account.number || null,
        account.balance ?? 0,
        account.currencyCode || "BRL",
        new Date().toISOString(),
        JSON.stringify(account),
      ]
    );
  }
}

async function upsertTransactions(userId, itemId, accountId, transactions) {
  const db = await getDb();

  for (const tx of transactions) {
    await db.run(
      `
        INSERT INTO user_transactions (
          user_id, transaction_id, item_id, account_id, description,
          amount, date, type, category, currency_code, status, raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(transaction_id) DO UPDATE SET
          item_id = excluded.item_id,
          account_id = excluded.account_id,
          description = excluded.description,
          amount = excluded.amount,
          date = excluded.date,
          type = excluded.type,
          category = excluded.category,
          currency_code = excluded.currency_code,
          status = excluded.status,
          raw_json = excluded.raw_json
      `,
      [
        userId,
        String(tx.id),
        String(itemId),
        String(accountId),
        tx.description || tx.merchant?.name || "Transação",
        tx.amount ?? 0,
        tx.date || tx.createdAt || new Date().toISOString(),
        tx.type || null,
        tx.category || null,
        tx.currencyCode || "BRL",
        tx.status || null,
        JSON.stringify(tx),
      ]
    );
  }
}

async function getUserAccounts(userId, itemId = null) {
  const db = await getDb();

  if (itemId) {
    return db.all(
      `
        SELECT
          account_id as id,
          item_id as itemId,
          name,
          type,
          subtype,
          number,
          balance,
          currency_code as currencyCode,
          updated_at as updatedAt
        FROM user_accounts
        WHERE user_id = ? AND item_id = ?
        ORDER BY name ASC
      `,
      [userId, itemId]
    );
  }

  return db.all(
    `
      SELECT
        account_id as id,
        item_id as itemId,
        name,
        type,
        subtype,
        number,
        balance,
        currency_code as currencyCode,
        updated_at as updatedAt
      FROM user_accounts
      WHERE user_id = ?
      ORDER BY name ASC
    `,
    [userId]
  );
}

async function getUserTransactions(userId, filters = {}) {
  const db = await getDb();

  let query = `
    SELECT
      transaction_id as id,
      item_id as itemId,
      account_id as accountId,
      description,
      amount,
      date,
      type,
      category,
      currency_code as currencyCode,
      status
    FROM user_transactions
    WHERE user_id = ?
  `;

  const safeFilters = filters ?? {};
  const params = [String(userId)];

  if (safeFilters.itemId != null && safeFilters.itemId !== "") {
    query += ` AND item_id = ?`;
    params.push(String(safeFilters.itemId));
  }

  if (safeFilters.accountId != null && safeFilters.accountId !== "") {
    query += ` AND account_id = ?`;
    params.push(String(safeFilters.accountId));
  }

  query += ` ORDER BY date DESC`;

  return db.all(query, params);
}

async function syncItemDataForUser(userId, itemId) {
  const itemData = await pluggyRequest("get", `/items/${itemId}`);

  const accountsResponse = await pluggyRequest("get", "/accounts", {
    params: { itemId },
  });

  const accounts = accountsResponse?.results || accountsResponse || [];

  await upsertUserItem(userId, {
    itemId: String(itemId),
    connectorId: itemData?.connector?.id ? String(itemData.connector.id) : null,
    institutionName: itemData?.connector?.name || "Instituição",
    status: itemData?.status || "UPDATED",
    updatedAt: new Date().toISOString(),
  });

  await upsertAccounts(userId, itemId, accounts);

  for (const account of accounts) {
    const txResponse = await pluggyRequest("get", "/transactions", {
      params: {
        accountId: account.id,
        page: 1,
        pageSize: 100,
      },
    });

    const transactions = txResponse?.results || txResponse || [];
    await upsertTransactions(userId, itemId, account.id, transactions);
  }

  return {
    item: itemData,
    accounts: await getUserAccounts(userId, String(itemId)),
    transactions: await getUserTransactions(userId, { itemId: String(itemId) }),
  };
}

app.get("/", (_req, res) => {
  res.send("Backend Vida em Ordem online 🚀");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "vida-em-ordem-backend",
    pluggyConfigured: !!PLUGGY_CLIENT_ID && !!PLUGGY_CLIENT_SECRET,
    googleConfigured: getGoogleAudiences().length > 0,
  });
});

app.post("/api/auth/bootstrap", async (req, res) => {
  try {
    const {
      userId,
      provider = "local",
      email = null,
      name = null,
      nickname = null,
      photoUri = null,
      locale = null,
      region = null,
      currencyCode = null,
    } = req.body || {};

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        error: "userId é obrigatório para criar a conta base.",
      });
    }

    const user = await upsertUserAccount({
      id: userId,
      provider,
      email,
      name,
      nickname,
      photoUrl: photoUri,
      locale,
      region,
      currencyCode,
      rawJson: req.body || null,
    });

    res.json({
      ok: true,
      user,
    });
  } catch (error) {
    console.error("Erro ao registrar conta base:", error);
    res.status(error?.statusCode || 500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.post("/api/auth/google/link", ensureUserId, async (req, res) => {
  try {
    const { idToken, locale = null, region = null, currencyCode = null } =
      req.body || {};

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({
        error: "idToken do Google é obrigatório.",
      });
    }

    const googleIdentity = await verifyGoogleIdToken(idToken);
    const linkedUser = await getUserByGoogleSub(googleIdentity.googleSub);

    if (linkedUser && linkedUser.id !== req.userId) {
      return res.status(409).json({
        error: "Esta conta Google já está vinculada a outro perfil.",
      });
    }

    const user = await upsertUserAccount({
      id: req.userId,
      provider: "google",
      email: googleIdentity.email,
      name: googleIdentity.name,
      photoUrl: googleIdentity.photoUrl,
      locale,
      region,
      currencyCode,
      googleSub: googleIdentity.googleSub,
      rawJson: googleIdentity.rawJson,
    });

    res.json({
      ok: true,
      user,
    });
  } catch (error) {
    console.error("Erro ao vincular Google:", error);
    res.status(error?.statusCode || 500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/auth/me", ensureUserId, async (req, res) => {
  try {
    const user = await ensureUserRecord(req.userId);

    res.json({
      ok: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/pluggy/connectors", async (req, res) => {
  try {
    const search = req.query.search || undefined;

    const data = await pluggyRequest("get", "/connectors", {
      params: search ? { search } : undefined,
    });

    res.json(data);
  } catch (error) {
    console.error("Erro ao listar connectors:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.post("/api/pluggy/connect-token", ensureUserId, async (req, res) => {
  try {
    const { itemId = null } = req.body || {};

    const payload = {
      clientUserId: req.userId,
      webhookUrl: WEBHOOK_URL || undefined,
      avoidDuplicates: true,
    };

    if (itemId) payload.itemId = itemId;

    const data = await pluggyRequest("post", "/connect_token", {
      data: payload,
    });

    res.json(data);
  } catch (error) {
    console.error("Erro ao criar connect token:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.post("/pluggy/connect-token", async (req, res) => {
  try {
    const { userId } = req.body;

    const token = await pluggy.createConnectToken({
      clientUserId: userId,
    });

    res.json({
      accessToken: token.accessToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar connect token" });
  }
});

app.post("/api/pluggy/items/register", ensureUserId, async (req, res) => {
  try {
    const { itemId, connectorId, institutionName, status } = req.body || {};

    if (!itemId) {
      return res.status(400).json({ error: "itemId é obrigatório." });
    }

    await upsertUserItem(req.userId, {
      itemId,
      connectorId: connectorId || null,
      institutionName: institutionName || "Instituição",
      status: status || "UPDATING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const syncResult = await syncItemDataForUser(req.userId, itemId);

    res.json({
      ok: true,
      items: await getUserItems(req.userId),
      accounts: syncResult.accounts,
      transactions: syncResult.transactions,
    });
  } catch (error) {
    console.error("Erro ao registrar item:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/pluggy/items", ensureUserId, async (req, res) => {
  try {
    res.json({
      items: await getUserItems(req.userId),
    });
  } catch (error) {
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/pluggy/items/:itemId", async (req, res) => {
  try {
    const data = await pluggyRequest("get", `/items/${req.params.itemId}`);
    res.json(data);
  } catch (error) {
    console.error("Erro ao buscar item:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/pluggy/items/:itemId/accounts", async (req, res) => {
  try {
    const data = await pluggyRequest("get", "/accounts", {
      params: {
        itemId: req.params.itemId,
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Erro ao buscar contas:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/pluggy/accounts/:accountId/transactions", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Math.min(Number(req.query.pageSize || 100), 500);
    const from = req.query.from || undefined;
    const to = req.query.to || undefined;

    const data = await pluggyRequest("get", "/transactions", {
      params: {
        accountId: req.params.accountId,
        page,
        pageSize,
        from,
        to,
      },
    });

    res.json(data);
  } catch (error) {
    console.error("Erro ao buscar transações:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/pluggy/accounts", ensureUserId, async (req, res) => {
  try {
    const accounts = await getUserAccounts(req.userId);

    res.json({
      accounts,
    });
  } catch (error) {
    console.error("Erro ao consolidar contas do usuário:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/pluggy/transactions", ensureUserId, async (req, res) => {
  try {
    const itemId = req.query.itemId ? String(req.query.itemId) : null;
    const accountId = req.query.accountId ? String(req.query.accountId) : null;

    const transactions = await getUserTransactions(req.userId, {
      itemId,
      accountId,
    });

    res.json({
      transactions,
    });
  } catch (error) {
    console.error(
      "Erro ao consolidar transações reais do usuário:",
      error?.response?.data || error
    );
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/transactions", async (_req, res) => {
  try {
    res.json({
      transactions: [
        {
          id: 1,
          description: "Compra Mercado",
          amount: -150.5,
          date: "2026-03-17",
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar transações" });
  }
});

app.get("/api/app/accounts", ensureUserId, async (req, res) => {
  try {
    const itemId = req.query.itemId ? String(req.query.itemId) : null;
    res.json({
      accounts: await getUserAccounts(req.userId, itemId),
    });
  } catch (error) {
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.get("/api/app/transactions", ensureUserId, async (req, res) => {
  try {
    const itemId = req.query.itemId ? String(req.query.itemId) : null;
    const accountId = req.query.accountId ? String(req.query.accountId) : null;

    res.json({
      transactions: await getUserTransactions(req.userId, {
        itemId,
        accountId,
      }),
    });
  } catch (error) {
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.post("/api/pluggy/items/:itemId/sync", ensureUserId, async (req, res) => {
  try {
    const result = await syncItemDataForUser(req.userId, req.params.itemId);

    res.json({
      ok: true,
      item: result.item,
      accounts: result.accounts,
      transactions: result.transactions,
    });
  } catch (error) {
    console.error("Erro ao sincronizar item:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.delete("/api/pluggy/items/:itemId", ensureUserId, async (req, res) => {
  try {
    await pluggyRequest("delete", `/items/${req.params.itemId}`);
    await deleteUserItem(req.userId, req.params.itemId);

    res.json({
      ok: true,
      items: await getUserItems(req.userId),
    });
  } catch (error) {
    console.error("Erro ao remover item:", error?.response?.data || error);
    res.status(500).json({
      error: safeErrorMessage(error),
    });
  }
});

app.post("/api/pluggy/webhook", async (req, res) => {
  try {
    const payload = req.body;

    console.log("🔔 Webhook Pluggy recebido:", JSON.stringify(payload, null, 2));

    const event = payload?.event || payload?.type;
    const itemId =
      payload?.data?.itemId ||
      payload?.data?.item?.id ||
      payload?.itemId ||
      payload?.item?.id;

    if (itemId) {
      const db = await getDb();
      const owners = await db.all(
        `SELECT DISTINCT user_id as userId FROM user_items WHERE item_id = ?`,
        [String(itemId)]
      );

      for (const owner of owners) {
        if (
          event === "item/created" ||
          event === "item/updated" ||
          event === "transactions/created" ||
          event === "transactions/updated" ||
          event === "transactions/deleted"
        ) {
          try {
            await syncItemDataForUser(owner.userId, String(itemId));
          } catch (syncError) {
            console.error("Erro ao sincronizar após webhook:", syncError);
          }
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Erro no webhook Pluggy:", error);
    return res.status(500).json({ error: "Erro ao processar webhook" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend rodando em http://0.0.0.0:${PORT}`);
});
