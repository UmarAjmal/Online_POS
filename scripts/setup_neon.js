const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[ERROR] Please set DATABASE_URL environment variable.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

async function main() {
  console.log("[*] Connecting to Neon PostgreSQL...");
  const client = await pool.connect();
  console.log("[✓] Connected successfully to Neon cloud!");

  try {
    const rawSql = fs.readFileSync(path.join(__dirname, "../src/lib/schema.sql"), "utf8");

    // Clean SQLite-specific parts for PostgreSQL
    // In PostgreSQL, TEXT with DEFAULT CURRENT_TIMESTAMP needs to be TIMESTAMPTZ or (CURRENT_TIMESTAMP::text)
    let pgSql = rawSql
      .replace(/DEFAULT\s+CURRENT_TIMESTAMP/gi, "DEFAULT (CURRENT_TIMESTAMP::text)")
      .replace(/REAL/gi, "NUMERIC")
      .replace(/INTEGER/gi, "BIGINT");

    console.log("[*] Creating all application tables in Neon...");

    // Split and execute statements (strip line comments first)
    const cleanSql = pgSql.replace(/--[^\r\n]*/g, "");
    const statements = cleanSql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 5);

    let created = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        created++;
      } catch (err) {
        console.warn("[WARN]", err.message, "in statement:", stmt.slice(0, 50));
      }
    }
    console.log(`[✓] Executed ${created} schema statements.`);

    const listTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("[DEBUG] Tables currently in Neon:", listTables.rows.map(r => r.table_name));

    // Seed default shop and superadmin user if not exists
    const shopCheck = await client.query("SELECT id FROM shops WHERE id = $1", ["ar-group-shop-001"]);
    if (shopCheck.rows.length === 0) {
      console.log("[*] Seeding default business and superadmin user...");
      const fullPerms = JSON.stringify({
        panels: {
          dashboard: true, pos: true, sales: true, registers: true, purchase: true,
          products: true, categories: true, brands: true, units: true, khata: true,
          returns: true, expenses: true, accounts: true, reports: true, staff: true,
          pharmacy: true, expiry: true, formulas: true,
        },
        actions: {
          edit_bill: true, delete_bill: true, edit_account: true, delete_account: true,
          allow_wholesale: true, allow_discounts: true, view_cost: true,
        },
      });

      await client.query(`
        INSERT INTO shops (id, name, industry_type, currency, subscription_tier, allow_negative_stock, has_emi, has_payroll, has_tax, has_assets_rec)
        VALUES ($1, $2, 'retail', 'PKR', 'enterprise', 1, 1, 1, 1, 1)
        ON CONFLICT (id) DO NOTHING
      `, ["ar-group-shop-001", "Falcon Swift Retail & POS"]);

      await client.query(`
        INSERT INTO user_profiles (id, shop_id, name, role, email, password, permissions)
        VALUES ($1, $2, 'Owner', 'superadmin', 'admin', 'admin123', $3)
        ON CONFLICT (id) DO NOTHING
      `, ["ar-admin-001", "ar-group-shop-001", fullPerms]);

      await client.query(`
        INSERT INTO cash_accounts (id, shop_id, name, type, current_balance)
        VALUES ($1, $2, 'Main Cash Register', 'cash', 0)
        ON CONFLICT (id) DO NOTHING
      `, ["ca-main-001", "ar-group-shop-001"]);

      console.log("[✓] Default shop & superadmin seeded!");
    } else {
      console.log("[✓] Shop already exists in Neon database.");
    }

    // List all created tables
    const tableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log(`[✓] Total tables in Neon: ${tableRes.rows.length}`);
    console.log(tableRes.rows.map(r => r.table_name).join(", "));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
