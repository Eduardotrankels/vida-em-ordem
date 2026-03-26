import fs from "fs";
import path from "path";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const configuredPath = process.env.SQLITE_PATH?.trim();
  const dbPath = configuredPath
    ? path.resolve(configuredPath)
    : path.resolve("data.sqlite");

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await dbInstance.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'local',
      email TEXT,
      name TEXT,
      nickname TEXT,
      photo_url TEXT,
      locale TEXT,
      region TEXT,
      currency_code TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_subscription_status TEXT,
      google_sub TEXT UNIQUE,
      created_at TEXT,
      updated_at TEXT,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS user_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL UNIQUE,
      connector_id TEXT,
      institution_name TEXT,
      status TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL UNIQUE,
      item_id TEXT NOT NULL,
      name TEXT,
      type TEXT,
      subtype TEXT,
      number TEXT,
      balance REAL DEFAULT 0,
      currency_code TEXT,
      updated_at TEXT,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS user_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      item_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      description TEXT,
      amount REAL DEFAULT 0,
      date TEXT,
      type TEXT,
      category TEXT,
      currency_code TEXT,
      status TEXT,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);

    CREATE INDEX IF NOT EXISTS idx_users_google_sub
      ON users(google_sub);

    CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
      ON users(stripe_customer_id);

    CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id
      ON users(stripe_subscription_id);

    CREATE INDEX IF NOT EXISTS idx_user_items_user_id
      ON user_items(user_id);

    CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id
      ON user_accounts(user_id);

    CREATE INDEX IF NOT EXISTS idx_user_accounts_item_id
      ON user_accounts(item_id);

    CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id
      ON user_transactions(user_id);

    CREATE INDEX IF NOT EXISTS idx_user_transactions_item_id
      ON user_transactions(item_id);

    CREATE INDEX IF NOT EXISTS idx_user_transactions_account_id
      ON user_transactions(account_id);
  `);

  const userColumns = await dbInstance.all(`PRAGMA table_info(users)`);
  const userColumnNames = new Set(userColumns.map((column) => column.name));

  if (!userColumnNames.has("stripe_customer_id")) {
    await dbInstance.exec(
      `ALTER TABLE users ADD COLUMN stripe_customer_id TEXT`
    );
  }

  if (!userColumnNames.has("stripe_subscription_id")) {
    await dbInstance.exec(
      `ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT`
    );
  }

  if (!userColumnNames.has("stripe_subscription_status")) {
    await dbInstance.exec(
      `ALTER TABLE users ADD COLUMN stripe_subscription_status TEXT`
    );
  }

  return dbInstance;
}
