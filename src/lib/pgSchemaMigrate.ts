import { pgDb, isPostgresMode } from "./pgDb";

let ready = false;

const CORE_SCHEMA_STATEMENTS = [
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_voided INTEGER DEFAULT 0`,
  `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS is_voided INTEGER DEFAULT 0`,
];

const FUEL_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS petrol_stations (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    cash_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_tanks (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    station_id TEXT,
    fuel_type TEXT NOT NULL,
    capacity REAL DEFAULT 0,
    current_dip REAL DEFAULT 0,
    purchase_price REAL DEFAULT 0,
    sale_price REAL DEFAULT 0,
    stock_liters REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_pumps (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    station_id TEXT,
    tank_id TEXT,
    nozzle_name TEXT,
    initial_reading REAL DEFAULT 0,
    current_reading REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE fuel_tanks ADD COLUMN IF NOT EXISTS station_id TEXT`,
  `ALTER TABLE fuel_tanks ADD COLUMN IF NOT EXISTS purchase_price REAL DEFAULT 0`,
  `ALTER TABLE fuel_tanks ADD COLUMN IF NOT EXISTS sale_price REAL DEFAULT 0`,
  `ALTER TABLE fuel_tanks ADD COLUMN IF NOT EXISTS stock_liters REAL DEFAULT 0`,
  `ALTER TABLE fuel_pumps ADD COLUMN IF NOT EXISTS station_id TEXT`,
  `ALTER TABLE fuel_pumps ADD COLUMN IF NOT EXISTS initial_reading REAL DEFAULT 0`,
  `ALTER TABLE fuel_pumps ADD COLUMN IF NOT EXISTS current_reading REAL DEFAULT 0`,
  `ALTER TABLE fuel_pumps ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1`,
  `CREATE TABLE IF NOT EXISTS fuel_transactions (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    station_id TEXT,
    dispenser_id TEXT,
    fuel_tank_id TEXT,
    shift_date TEXT,
    quantity_sold REAL DEFAULT 0,
    total_sale REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    opening_reading REAL,
    closing_reading REAL,
    user_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_purchases (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    station_id TEXT,
    fuel_tank_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    price_per_liter REAL NOT NULL,
    total_cost REAL NOT NULL,
    purchase_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_stock_differences (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    station_id TEXT,
    fuel_tank_id TEXT NOT NULL,
    expected_stock REAL DEFAULT 0,
    recorded_stock REAL DEFAULT 0,
    difference REAL DEFAULT 0,
    remarks TEXT,
    recorded_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_cash_transactions (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    station_id TEXT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_after REAL DEFAULT 0,
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_daily_closes (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    station_id TEXT,
    shift_date TEXT NOT NULL,
    total_sales REAL DEFAULT 0,
    total_profit REAL DEFAULT 0,
    total_expense REAL DEFAULT 0,
    total_credit REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE fuel_purchases ADD COLUMN IF NOT EXISTS supplier_id TEXT`,
  `ALTER TABLE fuel_purchases ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash'`,
  `ALTER TABLE fuel_purchases ADD COLUMN IF NOT EXISTS account_id TEXT`,
  `ALTER TABLE fuel_purchases ADD COLUMN IF NOT EXISTS paid_amount REAL DEFAULT 0`,
  `ALTER TABLE fuel_cash_transactions ADD COLUMN IF NOT EXISTS account_id TEXT`,
  `ALTER TABLE fuel_daily_closes ADD COLUMN IF NOT EXISTS cash_amount REAL DEFAULT 0`,
  `ALTER TABLE fuel_daily_closes ADD COLUMN IF NOT EXISTS card_amount REAL DEFAULT 0`,
  `ALTER TABLE fuel_daily_closes ADD COLUMN IF NOT EXISTS online_amount REAL DEFAULT 0`,
  `ALTER TABLE fuel_daily_closes ADD COLUMN IF NOT EXISTS cash_account_id TEXT`,
  `ALTER TABLE fuel_daily_closes ADD COLUMN IF NOT EXISTS bank_account_id TEXT`,
  `ALTER TABLE fuel_daily_closes ADD COLUMN IF NOT EXISTS expense_account_id TEXT`,
  `ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS ref_type TEXT`,
  `ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS ref_id TEXT`,
  `ALTER TABLE fuel_stock_differences ADD COLUMN IF NOT EXISTS account_id TEXT`,
  `ALTER TABLE fuel_stock_differences ADD COLUMN IF NOT EXISTS expense_id TEXT`,
  `CREATE TABLE IF NOT EXISTS fuel_daily_close_credits (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL,
    daily_close_id TEXT NOT NULL,
    party_id TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_fuel_daily_close_station_date ON fuel_daily_closes(shop_id, station_id, shift_date)`,
];

export async function ensurePostgresFuelSchema() {
  if (!isPostgresMode() || ready) return;

  for (const sql of CORE_SCHEMA_STATEMENTS) {
    try {
      await pgDb.run(sql);
    } catch (err) {
      console.warn("[Postgres] Core schema statement skipped:", (err as Error).message);
    }
  }

  for (const sql of FUEL_SCHEMA_STATEMENTS) {
    try {
      await pgDb.run(sql);
    } catch (err) {
      console.warn("[Postgres] Schema statement skipped:", (err as Error).message);
    }
  }

  ready = true;
}

