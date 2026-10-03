const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "argroup.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function parseSchemaColumns(sql) {
  const tables = new Map();
  const re = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = re.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("--"))
      .join(" ");
    const cols = new Map();
    for (const part of body.split(",").map((p) => p.trim())) {
      const colMatch = part.match(/^(\w+)\s+(.+)$/i);
      if (!colMatch) continue;
      const name = colMatch[1];
      if (["PRIMARY", "FOREIGN", "UNIQUE", "CONSTRAINT"].includes(name)) continue;
      cols.set(name, colMatch[2]);
    }
    tables.set(tableName, cols);
  }
  return tables;
}

function migrationType(def) {
  return def
    .replace(/\bPRIMARY\s+KEY\b/gi, "")
    .replace(/\bNOT\s+NULL\b/gi, "")
    .replace(/\bUNIQUE\b/gi, "")
    .replace(/\bDEFAULT\s+CURRENT_TIMESTAMP\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function migrateColumns(schemaSql) {
  const expected = parseSchemaColumns(schemaSql);
  for (const [table, cols] of expected) {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!existing.length) continue;
    const existingNames = new Set(existing.map((c) => c.name));
    for (const [colName, colDef] of cols) {
      if (existingNames.has(colName)) continue;
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colName} ${migrationType(colDef)}`);
      } catch (err) {
        console.warn(`Could not add ${table}.${colName}:`, err.message);
      }
    }
  }
}

const schemaPath = path.join(process.cwd(), "src", "lib", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
db.exec(schemaSql);
migrateColumns(schemaSql);

const SHOP_ID = "ar-group-shop-001";
const ADMIN_USER_ID = "ar-admin-001";

const fullPermissions = JSON.stringify({
  panels: {
    dashboard: true, pos: true, sales: true, registers: true, purchase: true,
    products: true, categories: true, brands: true, units: true, khata: true,
    returns: true, expenses: true, accounts: true, reports: true, staff: true, backup: true,
    pharmacy: false, expiry: false, formulas: false,
  },
  actions: {
    edit_bill: true, delete_bill: true, edit_account: true, delete_account: true,
    allow_wholesale: true, allow_discounts: true, view_cost: true,
  },
});

const existing = db.prepare("SELECT id FROM shops WHERE id = ?").get(SHOP_ID);
if (existing) {
  console.log("Schema updated. Database already seeded at", dbPath);
  process.exit(0);
}

db.prepare(`
  INSERT INTO shops (id, name, industry_type, subscription_tier, allow_negative_stock, has_emi, has_payroll, has_tax, has_assets_rec)
  VALUES (?, ?, 'commercial', 'enterprise', 1, 1, 1, 1, 1)
`).run(SHOP_ID, "Al Madina Enterprise (Falcon Swift PVT. LTD.)");

db.prepare(`
  INSERT INTO user_profiles (id, shop_id, name, role, email, password, permissions)
  VALUES (?, ?, 'Aamish Rehmani', 'superadmin', 'admin', 'AR12345ar', ?)
`).run(ADMIN_USER_ID, SHOP_ID, fullPermissions);

console.log("Database initialized successfully at", dbPath);
console.log("Admin login: admin / AR12345ar");
