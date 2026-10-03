import type Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { runFullSchema } from "./schemaMigrate";

let sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (sqliteDb) return sqliteDb;

  const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "argroup.db");
  sqliteDb = new BetterSqlite3(dbPath);
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("synchronous = NORMAL");
  sqliteDb.pragma("cache_size = -64000"); // 64 MB RAM cache
  sqliteDb.pragma("temp_store = MEMORY");
  sqliteDb.pragma("mmap_size = 268435456"); // 256 MB memory-mapped zero-copy I/O
  sqliteDb.pragma("busy_timeout = 10000");
  sqliteDb.pragma("foreign_keys = ON");
  return sqliteDb;
}

export const db = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getSqliteDb() as object, prop, receiver);
  },
});

export const SHOP_ID = "ar-group-shop-001";
export const ADMIN_USER_ID = "ar-admin-001";

const fullPermissions = {
  panels: {
    dashboard: true,
    pos: true,
    sales: true,
    registers: true,
    purchase: true,
    products: true,
    categories: true,
    brands: true,
    units: true,
    khata: true,
    returns: true,
    expenses: true,
    accounts: true,
    reports: true,
    staff: true,
    pharmacy: true,
    expiry: true,
    formulas: true,
  },
  actions: {
    edit_bill: true,
    delete_bill: true,
    edit_account: true,
    delete_account: true,
    allow_wholesale: true,
    allow_discounts: true,
    view_cost: true,
  },
};

function migrateExistingShopToPharmacy() {
  db.prepare(`
    UPDATE shops SET industry_type = 'pharmacy' WHERE id = ? AND industry_type IN ('commercial', 'general', 'karyana')
  `).run(SHOP_ID);

  db.prepare(`
    UPDATE user_profiles
    SET shop_id = ?, password = 'admin123'
    WHERE email = 'admin' AND role = 'superadmin'
  `).run(SHOP_ID);

  const user = db.prepare(`SELECT permissions FROM user_profiles WHERE id = ?`).get(ADMIN_USER_ID) as { permissions?: string } | undefined;
  if (user?.permissions) {
    try {
      const perms = JSON.parse(user.permissions);
      if (perms?.panels) {
        perms.panels.pharmacy = true;
        perms.panels.expiry = true;
        perms.panels.formulas = true;
        delete perms.panels.backup;
        delete perms.panels.settings;
        db.prepare(`UPDATE user_profiles SET permissions = ? WHERE id = ?`).run(JSON.stringify(perms), ADMIN_USER_ID);
      }
    } catch {
      // ignore malformed permissions JSON
    }
  }
}

function seedArGroupData() {
  const existingShop = db.prepare("SELECT id FROM shops WHERE id = ?").get(SHOP_ID);
  if (existingShop) return;

  db.prepare(`
    INSERT INTO shops (id, name, industry_type, subscription_tier, allow_negative_stock, has_emi, has_payroll, has_tax, has_assets_rec)
    VALUES (?, ?, 'pharmacy', 'enterprise', 1, 1, 1, 1, 1)
  `).run(SHOP_ID, "Al Madina Enterprise (Falcon Swift PVT. LTD.)");

  db.prepare(`
    INSERT INTO user_profiles (id, shop_id, name, role, email, password, permissions)
    VALUES (?, ?, ?, 'superadmin', 'admin', 'admin123', ?)
  `).run(ADMIN_USER_ID, SHOP_ID, "Aamish Rehmani", JSON.stringify(fullPermissions));

  const categories = [
    ["cat-grain", "Grain & Mandi (غلہ)"],
    ["cat-fuel", "Fuel & Lubricants (ایندھن)"],
    ["cat-farm", "Farm Inputs (زرعی)"],
    ["cat-groc", "Grocery (کریانہ)"],
    ["cat-bev", "Beverages (مشروبات)"],
  ];
  const catStmt = db.prepare("INSERT INTO categories (id, shop_id, name) VALUES (?, ?, ?)");
  for (const [id, name] of categories) catStmt.run(id, SHOP_ID, name);

  const brands = [
    ["brand-local", "Local / Mandi"],
    ["brand-ppl", "PPL Petroleum"],
    ["brand-nestle", "Nestle Pakistan"],
    ["brand-national", "National Foods"],
  ];
  const brandStmt = db.prepare("INSERT INTO brands (id, shop_id, name) VALUES (?, ?, ?)");
  for (const [id, name] of brands) brandStmt.run(id, SHOP_ID, name);

  const units = [
    ["unit-bag", "Bag / Bori (بوری)", "bag", 1],
    ["unit-kg", "Kilogram (کلو)", "kg", 1],
    ["unit-ltr", "Liter (لیٹر)", "ltr", 1],
    ["unit-pcs", "Piece (پیس)", "pcs", 1],
  ];
  const unitStmt = db.prepare(
    "INSERT INTO units (id, shop_id, name, code, conversion_factor) VALUES (?, ?, ?, ?, ?)"
  );
  for (const u of units) unitStmt.run(u[0], SHOP_ID, u[1], u[2], u[3]);

  const products = [
    ["prod-1", "Wheat Grade-A (گندم)", "Wheat", "WHT-001", "Bag", 3200, 3450, 0, 10, "cat-grain", "brand-local", null, null, null, "Mandi Yard", 0],
    ["prod-2", "High Speed Diesel", "HSD", "DSL-001", "Liter", 265, 290, 0, 100, "cat-fuel", "brand-ppl", null, null, null, "Pump Tank 1", 0],
    ["prod-3", "Motor Gasoline (Petrol)", "PMG", "PET-001", "Liter", 275, 300, 0, 100, "cat-fuel", "brand-ppl", null, null, null, "Pump Tank 2", 0],
    ["prod-4", "Certified Wheat Seed 50kg", "Seed", "SED-001", "Bag", 4500, 4800, 0, 5, "cat-farm", "brand-local", null, null, null, "Farm Store", 0],
    ["prod-5", "Basmati Rice 5kg", null, "RICE-5KG", "Bag", 1450, 1650, 0, 10, "cat-groc", "brand-national", null, null, null, "Shelf A", 0],
  ];
  const prodStmt = db.prepare(`
    INSERT INTO products (
      id, shop_id, name, generic_name, code, unit,
      purchase_price_single, sale_price_single, current_stock, min_stock_level,
      category_id, brand_id, formula_id, batch_number, expiry_date, rack_location, is_narcotic
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of products) {
    prodStmt.run(p[0], SHOP_ID, p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15]);
  }

  db.prepare(
    "INSERT INTO parties (id, shop_id, name, phone, current_balance, type) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("walkin", SHOP_ID, "Walk-in Customer", null, 0, "customer");

  db.prepare(`
    INSERT INTO company_details (id, shop_id, name, phone, address, website, license_no)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    "comp-ar",
    SHOP_ID,
    "Falcon Swift PVT. LTD. of Companies",
    "03261527022",
    "Chak No. 102/15-L, Mian Channu, Punjab",
    "",
    "NTN-MC-102/15L-2026"
  );

  db.prepare(`
    INSERT INTO print_settings (id, shop_id, receipt_page_size, receipt_font, receipt_font_size)
    VALUES (?, ?, 'MM80', 'Arial', 12)
  `).run("print-ar", SHOP_ID);

  console.log("[SQLite] Database initialized successfully at", path.join(process.cwd(), "data", "argroup.db"));
}

function seedDefaultRolesAndNotifications() {
  const existingRole = db.prepare("SELECT id FROM roles WHERE shop_id = ?").get(SHOP_ID);
  if (!existingRole) {
    const defaultRoles = [
      {
        id: "role-superadmin",
        name: "Super Admin (مکمل رسائی)",
        description: "Full master control across all operations, user management, audit logs, and settings.",
        is_system: 1,
        permissions: JSON.stringify({
          panels: {
            dashboard: true, pos: true, sales: true, products: true, categories: true,
            brands: true, units: true, purchase: true, returns: true, expenses: true,
            khata: true, registers: true, accounts: true, reports: true, pharmacy_expiry: true,
            pharmacy_formulas: true, staff: true, roles: true, settings: true
          },
          actions: {
            view: true, create: true, edit: true, delete: true,
            edit_bill: true, delete_bill: true, edit_account: true, delete_account: true,
            allow_wholesale: true, allow_discounts: true, view_cost: true, manage_settings: true
          }
        })
      },
      {
        id: "role-manager",
        name: "Store Manager (اسٹور منیجر)",
        description: "Operational management of sales, billing, inventory, procurement, and daily registers.",
        is_system: 1,
        permissions: JSON.stringify({
          panels: {
            dashboard: true, pos: true, sales: true, products: true, categories: true,
            brands: true, units: true, purchase: true, returns: true, expenses: true,
            khata: true, registers: true, accounts: true, reports: true, pharmacy_expiry: true,
            pharmacy_formulas: true, staff: false, roles: false, settings: false
          },
          actions: {
            view: true, create: true, edit: true, delete: false,
            edit_bill: true, delete_bill: false, edit_account: true, delete_account: false,
            allow_wholesale: true, allow_discounts: true, view_cost: true, manage_settings: false
          }
        })
      },
      {
        id: "role-cashier",
        name: "Cashier / POS Operator (کیشیئر)",
        description: "Front-desk counter sales, checkout invoices, returns, and daily shift cash registers.",
        is_system: 1,
        permissions: JSON.stringify({
          panels: {
            dashboard: true, pos: true, sales: true, products: false, categories: false,
            brands: false, units: false, purchase: false, returns: true, expenses: false,
            khata: true, registers: true, accounts: false, reports: false, pharmacy_expiry: false,
            pharmacy_formulas: false, staff: false, roles: false, settings: false
          },
          actions: {
            view: true, create: true, edit: false, delete: false,
            edit_bill: false, delete_bill: false, edit_account: false, delete_account: false,
            allow_wholesale: false, allow_discounts: true, view_cost: false, manage_settings: false
          }
        })
      },
      {
        id: "role-pharmacist",
        name: "Pharmacist / Stock Keeper (فارماسسٹ)",
        description: "Catalog management, medicine batch tracking, expiry monitoring, and purchase intake.",
        is_system: 1,
        permissions: JSON.stringify({
          panels: {
            dashboard: true, pos: false, sales: false, products: true, categories: true,
            brands: true, units: true, purchase: true, returns: true, expenses: false,
            khata: false, registers: false, accounts: false, reports: false, pharmacy_expiry: true,
            pharmacy_formulas: true, staff: false, roles: false, settings: false
          },
          actions: {
            view: true, create: true, edit: true, delete: false,
            edit_bill: false, delete_bill: false, edit_account: false, delete_account: false,
            allow_wholesale: false, allow_discounts: false, view_cost: true, manage_settings: false
          }
        })
      },
      {
        id: "role-accountant",
        name: "Accountant / Auditor (اکاؤنٹنٹ)",
        description: "Financial ledgers, customer credit khata, daily expenses, audit logs, and PDF reports.",
        is_system: 1,
        permissions: JSON.stringify({
          panels: {
            dashboard: true, pos: false, sales: true, products: false, categories: false,
            brands: false, units: false, purchase: true, returns: true, expenses: true,
            khata: true, registers: true, accounts: true, reports: true, pharmacy_expiry: false,
            pharmacy_formulas: false, staff: false, roles: false, settings: false
          },
          actions: {
            view: true, create: true, edit: true, delete: false,
            edit_bill: false, delete_bill: false, edit_account: true, delete_account: false,
            allow_wholesale: false, allow_discounts: false, view_cost: true, manage_settings: false
          }
        })
      }
    ];

    const roleStmt = db.prepare("INSERT INTO roles (id, shop_id, name, description, is_system, permissions) VALUES (?, ?, ?, ?, ?, ?)");
    for (const r of defaultRoles) {
      roleStmt.run(r.id, SHOP_ID, r.name, r.description, r.is_system, r.permissions);
    }
  }

  // Seed default welcome notifications if empty
  const notifCount = db.prepare("SELECT COUNT(*) as count FROM notifications WHERE shop_id = ?").get(SHOP_ID) as { count: number };
  if (!notifCount || notifCount.count === 0) {
    const initialNotifs = [
      {
        id: "notif-init-1",
        shop_id: SHOP_ID,
        actor_name: "System Security",
        actor_role: "System",
        type: "system",
        module: "staff",
        title: "Role-Based Access Control (RBAC) Active",
        message: "Granular Role-based permissions and audit logs are active for all staff members.",
        severity: "success",
        metadata: JSON.stringify({ info: "RBAC Initialized" }),
        is_read: 0,
      },
      {
        id: "notif-init-2",
        shop_id: SHOP_ID,
        actor_name: "Audit Engine",
        actor_role: "Audit",
        type: "audit_edit",
        module: "settings",
        title: "System Ready & Protected",
        message: "All transaction summaries and user modifications will be logged and notified in real-time.",
        severity: "info",
        metadata: JSON.stringify({ status: "healthy" }),
        is_read: 0,
      }
    ];

    const notifStmt = db.prepare(`
      INSERT INTO notifications (id, shop_id, actor_name, actor_role, type, module, title, message, severity, metadata, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const n of initialNotifs) {
      notifStmt.run(n.id, n.shop_id, n.actor_name, n.actor_role, n.type, n.module, n.title, n.message, n.severity, n.metadata, n.is_read);
    }
  }
}

function seedSecuritySettingsAndBackups() {
  const existingSec = db.prepare("SELECT id FROM security_settings WHERE shop_id = ?").get(SHOP_ID);
  if (!existingSec) {
    db.prepare(`
      INSERT INTO security_settings (
        id, shop_id, session_timeout_mins, single_session_only,
        min_password_length, require_uppercase, require_numbers, require_special_chars,
        password_expiry_days, max_failed_attempts, lockout_duration_mins, two_factor_enabled,
        auto_backup_enabled, auto_backup_interval, retention_days
      ) VALUES (
        'sec-setting-001', ?, 60, 0,
        8, 0, 1, 0,
        0, 5, 15, 0,
        1, 'daily', 14
      )
    `).run(SHOP_ID);
  }

  const activeCount = db.prepare("SELECT COUNT(*) as count FROM active_sessions WHERE shop_id = ?").get(SHOP_ID) as { count: number };
  if (!activeCount || activeCount.count === 0) {
    db.prepare(`
      INSERT INTO active_sessions (
        id, shop_id, user_id, user_name, user_role, email, token, ip_address, user_agent, device_info, status
      ) VALUES (
        'sess-admin-01', ?, 'ar-admin-001', 'Admin Owner', 'superadmin', 'admin', 'db_active_admin', '127.0.0.1 (Localhost)', 'Next.js Desktop App', 'Windows 11 / Chrome 124', 'active'
      )
    `).run(SHOP_ID);
  }

  const logCount = db.prepare("SELECT COUNT(*) as count FROM login_audit_logs WHERE shop_id = ?").get(SHOP_ID) as { count: number };
  if (!logCount || logCount.count === 0) {
    db.prepare(`
      INSERT INTO login_audit_logs (
        id, shop_id, user_id, email, status, failure_reason, ip_address, user_agent
      ) VALUES (
        'log-init-01', ?, 'ar-admin-001', 'admin', 'SUCCESS', NULL, '127.0.0.1', 'Desktop Application / Local Browser'
      )
    `).run(SHOP_ID);
  }
}

let sqliteInitialized = false;

export function initArGroupDb() {
  if (process.env.DATABASE_URL) return;
  if (sqliteInitialized) return;
  const sqlite = getSqliteDb();
  runFullSchema(sqlite);
  seedArGroupData();
  seedDefaultRolesAndNotifications();
  seedSecuritySettingsAndBackups();
  migrateExistingShopToPharmacy();
  sqliteInitialized = true;
}
