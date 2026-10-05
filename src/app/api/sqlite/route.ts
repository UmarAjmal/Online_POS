import { NextRequest, NextResponse } from "next/server";
import { ensureServerDbReady } from "@/lib/serverDbInit";
import { isPostgresMode } from "@/lib/pgDb";
import { dbClient, clearStatementCache } from "@/lib/dbClient";
import { attachEmbeds, parseSelect } from "@/lib/queryEmbed";
import { normalizeDbRecord, normalizeDbValue } from "@/lib/pgDb";
import { runDbRpc } from "@/lib/dbRpc";
import { serverCache } from "@/lib/serverCache";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";

function buildWhereClause(filters: any[], params: unknown[]): string {
  if (!filters?.length) return "";

  const clauses = filters.map((f: any) => {
    if (f.op === "eq") {
      params.push(normalizeDbValue(f.val));
      return `${f.col} = ?`;
    }
    if (f.op === "neq") {
      params.push(normalizeDbValue(f.val));
      return `${f.col} != ?`;
    }
    if (f.op === "like" || f.op === "ilike") {
      params.push(f.val);
      return `${f.col} LIKE ?`;
    }
    if (f.op === "gte") {
      params.push(f.val);
      return `${f.col} >= ?`;
    }
    if (f.op === "lte") {
      params.push(f.val);
      return `${f.col} <= ?`;
    }
    if (f.op === "gt") {
      params.push(f.val);
      return `${f.col} > ?`;
    }
    if (f.op === "lt") {
      params.push(f.val);
      return `${f.col} < ?`;
    }
    if (f.op === "is") {
      if (f.val === null) return `${f.col} IS NULL`;
      params.push(normalizeDbValue(f.val));
      return `${f.col} IS ?`;
    }
    if (f.op === "not_is") {
      if (f.val === null) return `${f.col} IS NOT NULL`;
      params.push(normalizeDbValue(f.val));
      return `${f.col} IS NOT ?`;
    }
    if (f.op === "in") {
      const vals = Array.isArray(f.val) ? f.val : [f.val];
      if (!vals.length) return "1=0";
      params.push(...vals.map((v: unknown) => normalizeDbValue(v)));
      return `${f.col} IN (${vals.map(() => "?").join(", ")})`;
    }
    return "1=1";
  });

  return ` WHERE ${clauses.join(" AND ")}`;
}

function serializeValue(val: any) {
  const normalized = normalizeDbValue(val);
  return typeof normalized === "object" && normalized !== null ? JSON.stringify(normalized) : normalized;
}

type SelectBody = {
  table?: string;
  select?: string;
  selectOptions?: { count?: string; head?: boolean };
  filters?: any[];
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
};

async function runSelectQuery(body: SelectBody) {
  const {
    table,
    select = "*",
    selectOptions,
    filters = [],
    orderBy,
    limit,
    single,
    maybeSingle,
  } = body;

  if (!table) return { data: null, error: "Table name required" };

  const isEligible = serverCache.isCacheable(table);
  const cacheKey = isEligible
    ? `${table}:${select}:${JSON.stringify(filters)}:${JSON.stringify(orderBy)}:${limit}:${single}:${maybeSingle}:${selectOptions?.count}:${selectOptions?.head}`
    : null;

  if (cacheKey) {
    const cached = serverCache.get(cacheKey);
    if (cached) {
      return { data: cached.data, count: cached.count, error: null, cached: true };
    }
  }

  const params: unknown[] = [];
  const where = buildWhereClause(filters, params);
  const parsed = parseSelect(select);
  const columns = parsed.columns.join(", ") || "*";

  if (selectOptions?.count === "exact" && selectOptions?.head) {
    const countSql = dbClient.isPostgres
      ? `SELECT COUNT(*)::int as count FROM ${table}${where}`
      : `SELECT COUNT(*) as count FROM ${table}${where}`;
    const countRow = await dbClient.get<{ count: number }>(countSql, params);
    const countVal = countRow?.count || 0;
    if (cacheKey) {
      serverCache.set(cacheKey, null, [table], countVal);
    }
    return { data: null, count: countVal, error: null };
  }

  let sql = `SELECT ${columns} FROM ${table}${where}`;

  if (orderBy?.column) {
    sql += ` ORDER BY ${orderBy.column} ${orderBy.ascending === false ? "DESC" : "ASC"}`;
  }
  if (limit) sql += ` LIMIT ${Number(limit)}`;

  let rows = await dbClient.all(sql, params);
  if (parsed.embeds.length) {
    rows = await attachEmbeds(dbClient.all.bind(dbClient), table, rows, parsed.embeds);
  }

  const resultData = single || maybeSingle ? (rows[0] || null) : rows;

  if (cacheKey) {
    const tables = [table, ...parsed.embeds.map((em) => em.relation)];
    serverCache.set(cacheKey, resultData, tables);
  }

  return { data: resultData, error: null };
}

export async function POST(req: NextRequest) {
  try {
    await ensureServerDbReady();

    const body = await req.json();
    const {
      action,
      table,
      select = "*",
      selectOptions,
      filters = [],
      data,
      orderBy,
      limit,
      single,
      maybeSingle,
    } = body;

    if (action === "init") {
      return NextResponse.json({ data: { ok: true, message: "Database initialized successfully" }, error: null });
    }
    if (action === "signup") {
      const {
        fullName,
        email,
        password,
        phone,
        businessName,
        industryType = "retail",
        businessPhone,
        address,
        footerNote = "Thank you for shopping with us! Please come again.",
        currency = "PKR",
        themePreset = "emerald",
      } = body;

      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanPassword = String(password || "").trim();
      const cleanName = String(fullName || "").trim();
      const cleanBusiness = String(businessName || "").trim();

      if (!cleanName) {
        return NextResponse.json({ error: "Full Name is required." }, { status: 400 });
      }
      if (!cleanEmail) {
        return NextResponse.json({ error: "Email or username is required." }, { status: 400 });
      }
      if (!cleanPassword || cleanPassword.length < 4) {
        return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
      }
      if (!cleanBusiness) {
        return NextResponse.json({ error: "Business / Shop Name is required." }, { status: 400 });
      }

      // Check if email already taken
      const existingUser: any = await dbClient.get(
        "SELECT id FROM user_profiles WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [cleanEmail]
      );

      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email/username already exists. Please sign in." },
          { status: 409 }
        );
      }

      // Generate IDs
      const businessSlug = cleanBusiness
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 20) || "shop";
      const shopId = `shop-${businessSlug}-${Date.now().toString(36)}`;
      const userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nowIso = new Date().toISOString();

      // Full unlocked permissions
      const fullPermissions = JSON.stringify({
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
      });

      // Insert Shop
      await dbClient.run(
        `INSERT INTO shops (
          id, name, industry_type, owner_id, address, phone, email,
          footer_note, currency, subscription_tier,
          allow_negative_stock, has_emi, has_payroll, has_tax, has_assets_rec,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'enterprise', 1, 1, 1, 1, 1, ?, ?)`,
        [
          shopId,
          cleanBusiness,
          industryType,
          userId,
          address || null,
          businessPhone || phone || null,
          cleanEmail,
          footerNote,
          currency,
          nowIso,
          nowIso,
        ]
      );

      // Insert User Profile
      await dbClient.run(
        `INSERT INTO user_profiles (
          id, shop_id, name, role, email, password, phone, permissions, created_at, updated_at
        ) VALUES (?, ?, ?, 'superadmin', ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          shopId,
          cleanName,
          cleanEmail,
          cleanPassword,
          phone || null,
          fullPermissions,
          nowIso,
          nowIso,
        ]
      );

      // Insert Default Roles for this shop
      const rolesToInsert = [
        {
          id: `role-admin-${shopId}`,
          name: "Owner / Superadmin",
          desc: "Full administrative and financial access",
          perms: fullPermissions,
        },
        {
          id: `role-manager-${shopId}`,
          name: "Store Manager",
          desc: "Manages inventory, purchases, and cashier audits",
          perms: fullPermissions,
        },
        {
          id: `role-cashier-${shopId}`,
          name: "Cashier",
          desc: "Counter sales, barcode billing, and receipt printing",
          perms: JSON.stringify({
            panels: { dashboard: true, pos: true, sales: true, registers: true, returns: true },
            actions: { edit_bill: false, delete_bill: false, allow_discounts: true },
          }),
        },
      ];

      for (const r of rolesToInsert) {
        try {
          await dbClient.run(
            `INSERT INTO roles (id, shop_id, name, description, is_system, permissions, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
            [r.id, shopId, r.name, r.desc, r.perms, nowIso, nowIso]
          );
        } catch {}
      }

      // Insert Default Cash Account
      try {
        await dbClient.run(
          `INSERT INTO cash_accounts (id, shop_id, account_name, account_type, current_balance, is_default, created_at)
           VALUES (?, ?, 'Main Cash Register', 'cash', 0, 1, ?)`,
          [`ca-${shopId}`, shopId, nowIso]
        );
      } catch {}

      // Insert Default Common Units for this shop
      const defaultUnits = [
        { name: "Piece", code: "pcs", factor: 1 },
        { name: "Pack", code: "pack", factor: 10 },
        { name: "Box", code: "box", factor: 20 },
        { name: "Carton", code: "ctn", factor: 100 },
        { name: "Kilogram", code: "kg", factor: 1 },
        { name: "Liter", code: "ltr", factor: 1 },
      ];

      for (const u of defaultUnits) {
        try {
          await dbClient.run(
            `INSERT INTO units (id, shop_id, name, code, conversion_factor, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [`unit-${u.code}-${shopId}`, shopId, u.name, u.code, u.factor, nowIso]
          );
        } catch {}
      }

      // Insert Security Settings for this shop
      try {
        await dbClient.run(
          `INSERT INTO security_settings (id, shop_id, session_timeout_mins, single_session_only, max_failed_attempts, lockout_duration_mins, created_at, updated_at)
           VALUES (?, ?, 120, 0, 5, 15, ?, ?)`,
          [`sec-${shopId}`, shopId, nowIso, nowIso]
        );
      } catch {}

      // Insert Welcome Notification
      try {
        await dbClient.run(
          `INSERT INTO notifications (id, shop_id, user_id, actor_name, actor_role, type, module, title, message, created_at)
           VALUES (?, ?, ?, ?, 'System', 'success', 'system', 'Welcome to Falcon Swift POS!', ?, ?)`,
          [
            `notif-${Date.now()}`,
            shopId,
            userId,
            cleanName,
            `Congratulations! Your business "${cleanBusiness}" has been successfully set up. All POS and inventory modules are ready.`,
            nowIso,
          ]
        );
      } catch {}

      // Invalidate server cache
      serverCache.clearAll();

      return NextResponse.json({
        data: {
          ok: true,
          message: "Account and business created successfully!",
          user: {
            id: userId,
            email: cleanEmail,
            name: cleanName,
            role: "superadmin",
            shop_id: shopId,
            shop_name: cleanBusiness,
            industry_type: industryType,
            subscription_tier: "enterprise",
          },
          shop: {
            id: shopId,
            name: cleanBusiness,
          },
        },
        error: null,
      });
    }

    if (action === "login") {
      const { email, password } = body;
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
      const userAgent = req.headers.get("user-agent") || "Browser Client";

      // Check lockout settings
      const secSettings: any = await dbClient.get("SELECT * FROM security_settings LIMIT 1");
      const maxFailed = secSettings?.max_failed_attempts || 5;
      const lockMins = secSettings?.lockout_duration_mins || 15;
      const cutoffTime = new Date(Date.now() - lockMins * 60 * 1000).toISOString();

      // Check recent failed attempts (compatible with both PostgreSQL and SQLite)
      const recentFails: any = await dbClient.get(
        `SELECT COUNT(*) as count FROM login_audit_logs 
         WHERE email = ? AND status = 'FAILED' AND created_at >= ?`,
        [String(email).trim(), cutoffTime]
      );

      if (recentFails && recentFails.count >= maxFailed) {
        const logId = "log-" + Date.now();
        await dbClient.run(
          `INSERT INTO login_audit_logs (id, shop_id, email, status, failure_reason, ip_address, user_agent, created_at)
           VALUES (?, ?, ?, 'LOCKED', 'Exceeded maximum allowed failed attempts', ?, ?, ?)`,
          [logId, "ar-group-shop-001", String(email).trim(), ip, userAgent, new Date().toISOString()]
        );
        return NextResponse.json({
          error: `Account temporarily locked due to ${maxFailed} failed attempts. Please try again in ${lockMins} minutes.`
        }, { status: 429 });
      }

      const user = await dbClient.get(
        `SELECT u.*, s.name as shop_name, s.industry_type, s.subscription_tier
         FROM user_profiles u
         JOIN shops s ON u.shop_id = s.id
         WHERE u.email = ? AND u.password = ?`,
        [String(email).trim(), String(password).trim()]
      );

      if (!user) {
        const logId = "log-" + Date.now();
        await dbClient.run(
          `INSERT INTO login_audit_logs (id, shop_id, email, status, failure_reason, ip_address, user_agent, created_at)
           VALUES (?, ?, ?, 'FAILED', 'Invalid username or password', ?, ?, ?)`,
          [logId, "ar-group-shop-001", String(email).trim(), ip, userAgent, new Date().toISOString()]
        );
        return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
      }

      // Record successful login in audit logs
      const logId = "log-" + Date.now();
      await dbClient.run(
        `INSERT INTO login_audit_logs (id, shop_id, user_id, email, status, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, 'SUCCESS', ?, ?, ?)`,
        [logId, user.shop_id, user.id, user.email, ip, userAgent, new Date().toISOString()]
      );

      // Register session in active_sessions
      const sessToken = "db_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      const sessId = "sess-" + Date.now();
      await dbClient.run(
        `INSERT INTO active_sessions (id, shop_id, user_id, user_name, user_role, email, token, ip_address, user_agent, device_info, status, created_at, last_active_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [sessId, user.shop_id, user.id, user.name, user.role, user.email, sessToken, ip, userAgent, "Desktop / Web Browser", new Date().toISOString(), new Date().toISOString()]
      );

      const permissions =
        typeof user.permissions === "string" ? JSON.parse(user.permissions) : user.permissions;

      return NextResponse.json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            shop_id: user.shop_id,
            shop_name: user.shop_name,
            industry_type: user.industry_type,
            subscription_tier: user.subscription_tier,
            permissions,
          },
          session: {
            access_token: sessToken,
            user: { id: user.id, email: user.email },
          },
        },
        error: null,
      });
    }

    if (action === "db_health") {
      const isPg = isPostgresMode();
      let dbSizeKb = 0;
      let walSizeKb = 0;
      const dbPath = path.join(process.cwd(), "data", "argroup.db");
      const walPath = path.join(process.cwd(), "data", "argroup.db-wal");

      if (fs.existsSync(dbPath)) {
        dbSizeKb = Math.round(fs.statSync(dbPath).size / 1024);
      }
      if (fs.existsSync(walPath)) {
        walSizeKb = Math.round(fs.statSync(walPath).size / 1024);
      }

      let integrity = "ok";
      if (!isPg) {
        const checkRow: any = await dbClient.get("PRAGMA integrity_check");
        integrity = checkRow?.integrity_check || "ok";
      }

      const tableRows = isPg
        ? await dbClient.all<{ name: string }>("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'")
        : await dbClient.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

      const tables: Array<{ name: string; count: number; category: string }> = [];
      let totalRecords = 0;

      for (const t of tableRows) {
        try {
          const cRow: any = await dbClient.get(`SELECT COUNT(*) as count FROM ${t.name}`);
          const cnt = Number(cRow?.count || 0);
          totalRecords += cnt;
          let cat = "Master & Catalog";
          if (["invoices", "invoice_items", "purchase_orders", "purchase_order_items", "credit_transactions", "expenses", "account_transactions", "register_sessions"].includes(t.name)) {
            cat = "Transactions & Sales";
          } else if (["user_profiles", "roles", "active_sessions", "login_audit_logs", "security_settings", "notifications", "database_backups"].includes(t.name)) {
            cat = "Security & Admin";
          }
          tables.push({ name: t.name, count: cnt, category: cat });
        } catch {
          // ignore table
        }
      }

      return NextResponse.json({
        data: {
          engine: isPg ? "PostgreSQL Enterprise" : "SQLite 3 (WAL Mode)",
          status: "Healthy",
          integrity,
          dbSizeKb,
          walSizeKb,
          totalTables: tables.length,
          totalRecords,
          tables,
          lastOptimizedAt: new Date().toISOString(),
        },
        error: null
      });
    }

    if (action === "db_export_sql") {
      const isPg = isPostgresMode();
      const tableRows = isPg
        ? await dbClient.all<{ name: string }>("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'")
        : await dbClient.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

      let shopName = String(body.shopName || "").trim();
      if (!shopName) {
        try {
          const shopRow: any = await dbClient.get("SELECT name FROM shops WHERE id = 'ar-group-shop-001' LIMIT 1");
          shopName = shopRow?.name || "pharmacy";
        } catch {
          shopName = "pharmacy";
        }
      }

      const cleanShopName = shopName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "pharmacy";

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const filename = `backup_${cleanShopName}_${dateStr}.sql`;

      let sqlDump = `-- ========================================================\n`;
      sqlDump += `-- ${shopName} Database SQL Dump\n`;
      sqlDump += `-- Export Date: ${new Date().toISOString()}\n`;
      sqlDump += `-- Engine: ${isPg ? "PostgreSQL" : "SQLite 3"}\n`;
      sqlDump += `-- ========================================================\n\n`;
      sqlDump += `PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n\n`;

      let totalRecs = 0;

      for (const t of tableRows) {
        const rows = await dbClient.all<Record<string, any>>(`SELECT * FROM ${t.name}`);
        if (rows && rows.length > 0) {
          totalRecs += rows.length;
          sqlDump += `-- --------------------------------------------------------\n`;
          sqlDump += `-- Table: ${t.name} (${rows.length} rows)\n`;
          sqlDump += `-- --------------------------------------------------------\n`;
          for (const row of rows) {
            const cols = Object.keys(row);
            const vals = cols.map(c => {
              const v = row[c];
              if (v === null || v === undefined) return "NULL";
              if (typeof v === "number") return v;
              if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            sqlDump += `INSERT OR REPLACE INTO ${t.name} (${cols.join(", ")}) VALUES (${vals.join(", ")});\n`;
          }
          sqlDump += `\n`;
        }
      }

      sqlDump += `COMMIT;\nPRAGMA foreign_keys = ON;\n-- End of Backup Dump\n`;

      const sizeKb = Math.round((Buffer.byteLength(sqlDump, "utf8") / 1024) * 10) / 10;

      // Log in database_backups table
      const backupId = "bk-" + Date.now();
      await dbClient.run(
        `INSERT INTO database_backups (id, shop_id, filename, backup_type, file_size_kb, record_count, status, created_by)
         VALUES (?, ?, ?, 'manual_sql', ?, ?, 'completed', ?)`,
        [backupId, "ar-group-shop-001", filename, sizeKb, totalRecs, String(body.actorName || "Admin")]
      );

      return NextResponse.json({
        data: {
          filename,
          sqlDump,
          sql: sqlDump,
          fileSizeKb: sizeKb,
          recordCount: totalRecs,
          created_at: new Date().toISOString()
        },
        error: null
      });
    }

    if (action === "db_export_json") {
      const isPg = isPostgresMode();
      const tableRows = isPg
        ? await dbClient.all<{ name: string }>("SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'")
        : await dbClient.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

      let shopName = String(body.shopName || "").trim();
      if (!shopName) {
        try {
          const shopRow: any = await dbClient.get("SELECT name FROM shops WHERE id = 'ar-group-shop-001' LIMIT 1");
          shopName = shopRow?.name || "pharmacy";
        } catch {
          shopName = "pharmacy";
        }
      }

      const cleanShopName = shopName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "pharmacy";

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const filename = `snapshot_${cleanShopName}_${dateStr}.json`;

      const dump: Record<string, any[]> = {};
      let totalRecs = 0;

      for (const t of tableRows) {
        const rows = await dbClient.all<Record<string, any>>(`SELECT * FROM ${t.name}`);
        dump[t.name] = rows || [];
        totalRecs += (rows || []).length;
      }

      const payload = {
        app: `${shopName} Management System`,
        version: "2.0.0",
        shop_id: "ar-group-shop-001",
        exported_at: new Date().toISOString(),
        total_records: totalRecs,
        tables: dump
      };

      const jsonString = JSON.stringify(payload, null, 2);
      const sizeKb = Math.round((Buffer.byteLength(jsonString, "utf8") / 1024) * 10) / 10;

      const backupId = "bk-" + Date.now();
      await dbClient.run(
        `INSERT INTO database_backups (id, shop_id, filename, backup_type, file_size_kb, record_count, status, created_by)
         VALUES (?, ?, ?, 'json_snapshot', ?, ?, 'completed', ?)`,
        [backupId, "ar-group-shop-001", filename, sizeKb, totalRecs, String(body.actorName || "Admin")]
      );

      return NextResponse.json({
        data: {
          filename,
          jsonData: payload,
          jsonString,
          fileSizeKb: sizeKb,
          recordCount: totalRecs,
          created_at: new Date().toISOString()
        },
        error: null
      });
    }

    if (action === "db_restore_sql") {
      const sqlContent = String(body.sqlContent || "");
      if (!sqlContent.trim()) {
        return NextResponse.json({ error: "SQL backup script is empty" }, { status: 400 });
      }

      if (!isPostgresMode()) {
        db.exec(sqlContent);
      } else {
        await dbClient.run(sqlContent);
      }

      serverCache.clearAll();
      clearStatementCache();

      return NextResponse.json({
        data: { ok: true, message: "Database restored successfully from SQL script!" },
        error: null
      });
    }

    if (action === "db_restore_json") {
      const jsonInput = body.jsonData;
      const tablesData = jsonInput?.tables || jsonInput;
      if (!tablesData || typeof tablesData !== "object") {
        return NextResponse.json({ error: "Invalid JSON backup data" }, { status: 400 });
      }

      for (const [table, rows] of Object.entries(tablesData)) {
        if (Array.isArray(rows) && rows.length > 0) {
          for (const row of rows) {
            const keys = Object.keys(row);
            const vals = keys.map(k => serializeValue(row[k]));
            await dbClient.run(
              `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})
               ON CONFLICT (id) DO UPDATE SET ${keys.filter(k => k !== "id").map(k => `${k} = EXCLUDED.${k}`).join(", ") || "id = EXCLUDED.id"}`,
              vals
            );
          }
        }
      }

      serverCache.clearAll();
      clearStatementCache();

      return NextResponse.json({
        data: { ok: true, message: "Database snapshot restored successfully!" },
        error: null
      });
    }

    if (action === "db_vacuum") {
      if (!isPostgresMode()) {
        db.exec("PRAGMA optimize; VACUUM; ANALYZE;");
      }
      serverCache.clearAll();
      clearStatementCache();
      return NextResponse.json({
        data: { ok: true, message: "Database defragmented and optimized successfully!" },
        error: null
      });
    }

    if (action === "db_wipe_transactions") {
      const confirmPhrase = String(body.confirmPhrase || "");
      if (confirmPhrase !== "CLEAR-TRANSACTIONS") {
        return NextResponse.json({ error: "Invalid confirmation phrase. Type 'CLEAR-TRANSACTIONS' to confirm." }, { status: 400 });
      }

      await dbClient.run("DELETE FROM invoice_items");
      await dbClient.run("DELETE FROM invoices");
      await dbClient.run("DELETE FROM purchase_order_items");
      await dbClient.run("DELETE FROM purchase_orders");
      await dbClient.run("DELETE FROM expenses");
      await dbClient.run("DELETE FROM credit_transactions");
      await dbClient.run("DELETE FROM account_transactions");
      await dbClient.run("DELETE FROM register_sessions");
      await dbClient.run("DELETE FROM emi_schedules");
      await dbClient.run("UPDATE parties SET current_balance = 0");
      await dbClient.run("UPDATE cash_accounts SET current_balance = 0");

      serverCache.clearAll();
      clearStatementCache();

      return NextResponse.json({
        data: { ok: true, message: "All sales, purchases, and expenses cleared. Catalog & customers are intact." },
        error: null
      });
    }

    if (action === "db_factory_reset") {
      const confirmPhrase = String(body.confirmPhrase || "");
      if (confirmPhrase !== "FACTORY-RESET-CONFIRMED") {
        return NextResponse.json({ error: "Invalid confirmation phrase. Type 'FACTORY-RESET-CONFIRMED' to confirm." }, { status: 400 });
      }

      const tablesToClear = [
        "invoice_items", "invoices", "purchase_order_items", "purchase_orders",
        "expenses", "credit_transactions", "account_transactions", "register_sessions",
        "emi_schedules", "product_imeis", "product_batches", "product_barcodes",
        "product_variants", "products", "units", "brands", "categories",
        "pharmacy_formulas", "formulations", "parties", "cash_accounts", "notifications", "active_sessions"
      ];

      for (const t of tablesToClear) {
        try {
          await dbClient.run(`DELETE FROM ${t}`);
        } catch {}
      }

      serverCache.clearAll();
      clearStatementCache();

      return NextResponse.json({
        data: { ok: true, message: "Factory reset complete." },
        error: null
      });
    }

    if (action === "security_force_logout") {
      const sessionId = body.sessionId;
      if (!sessionId) {
        return NextResponse.json({ error: "Session ID required" }, { status: 400 });
      }
      await dbClient.run("DELETE FROM active_sessions WHERE id = ?", [sessionId]);
      serverCache.invalidateTables("active_sessions");
      return NextResponse.json({ data: { ok: true, message: "User session terminated" }, error: null });
    }

    if (action === "security_clear_logs") {
      await dbClient.run("DELETE FROM login_audit_logs");
      serverCache.invalidateTables("login_audit_logs");
      return NextResponse.json({ data: { ok: true, message: "Login audit logs cleared" }, error: null });
    }

    if (action === "refresh_session") {
      const userId = String(body.userId || "").trim();
      if (!userId) {
        return NextResponse.json({ error: "User id required" }, { status: 400 });
      }

      const user = await dbClient.get(
        `SELECT u.*, s.name as shop_name, s.industry_type, s.subscription_tier
         FROM user_profiles u
         JOIN shops s ON u.shop_id = s.id
         WHERE u.id = ?`,
        [userId]
      );

      if (!user) {
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }

      const permissions =
        typeof user.permissions === "string" ? JSON.parse(user.permissions) : user.permissions;

      return NextResponse.json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            shop_id: user.shop_id,
            shop_name: user.shop_name,
            industry_type: user.industry_type,
            subscription_tier: user.subscription_tier,
            permissions,
          },
        },
        error: null,
      });
    }

    if (action === "batch") {
      const queries: SelectBody[] = body.queries || [];
      const results = await Promise.all(
        queries.map(async (q) => {
          try {
            const result = await runSelectQuery(q);
            if (result.error) return { data: null, error: result.error };
            return { data: result.data, count: result.count, error: null };
          } catch (err: any) {
            return { data: null, error: err.message || "Query failed" };
          }
        })
      );
      return NextResponse.json({ results, error: null });
    }

    if (action === "select") {
      const result = await runSelectQuery({
        table,
        select,
        selectOptions,
        filters,
        orderBy,
        limit,
        single,
        maybeSingle,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ data: result.data, count: result.count, error: null });
    }

    if (action === "insert") {
      if (!table || !data) return NextResponse.json({ error: "Table and data required" }, { status: 400 });

      const records = Array.isArray(data) ? data : [data];
      const insertedRows: any[] = [];

      for (const rec of records) {
        const item = normalizeDbRecord({ ...rec }) as Record<string, unknown>;
        if (!item.id) {
          item.id = "rec-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        }

        if (table === "invoice_items") {
          if (!item.product_name) {
            item.product_name = (item.name as string) || "Product";
          }
          if (item.total_price === undefined) {
            item.total_price = item.subtotal ?? (Number(item.unit_price || 0) * Number(item.quantity || 0));
          }
          if (item.subtotal === undefined) {
            item.subtotal = item.total_price;
          }
        }

        const keys = Object.keys(item);
        const values = keys.map((k) => serializeValue(item[k]));

        await dbClient.run(
          `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
          values
        );
        insertedRows.push(item);
      }

      serverCache.invalidateTables(table);

      return NextResponse.json({
        data: Array.isArray(data) ? insertedRows : insertedRows[0],
        error: null,
      });
    }

    if (action === "upsert") {
      if (!table || !data) return NextResponse.json({ error: "Table and data required" }, { status: 400 });

      const records = Array.isArray(data) ? data : [data];
      const upsertedRows: any[] = [];

      for (const rec of records) {
        const item = normalizeDbRecord({ ...rec }) as Record<string, unknown>;
        if (!item.id) {
          item.id = "rec-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        }

        if (table === "invoice_items") {
          if (!item.product_name) {
            item.product_name = (item.name as string) || "Product";
          }
          if (item.total_price === undefined) {
            item.total_price = item.subtotal ?? (Number(item.unit_price || 0) * Number(item.quantity || 0));
          }
          if (item.subtotal === undefined) {
            item.subtotal = item.total_price;
          }
        }

        const keys = Object.keys(item);
        const values = keys.map((k) => serializeValue(item[k]));

        await dbClient.run(
          `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})
           ON CONFLICT (id) DO UPDATE SET ${keys
             .filter((k) => k !== "id")
             .map((k) => `${k} = EXCLUDED.${k}`)
             .join(", ") || "id = EXCLUDED.id"}`,
          values
        );
        upsertedRows.push(item);
      }

      serverCache.invalidateTables(table);

      return NextResponse.json({
        data: Array.isArray(data) ? upsertedRows : upsertedRows[0],
        error: null,
      });
    }

    if (action === "update") {
      if (!table || !data) return NextResponse.json({ error: "Table and data required" }, { status: 400 });

      const normalized = normalizeDbRecord({ ...data }) as Record<string, unknown>;
      const keys = Object.keys(normalized);
      const values = keys.map((k) => serializeValue(normalized[k]));
      const params = [...values];
      const where = buildWhereClause(filters, params);

      await dbClient.run(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")}${where}`, params);
      serverCache.invalidateTables(table);
      return NextResponse.json({ data, error: null });
    }

    if (action === "delete") {
      if (!table) return NextResponse.json({ error: "Table required" }, { status: 400 });

      const params: unknown[] = [];
      const where = buildWhereClause(filters, params);
      await dbClient.run(`DELETE FROM ${table}${where}`, params);
      serverCache.invalidateTables(table);
      return NextResponse.json({ data: true, error: null });
    }

    if (action === "rpc") {
      const fn = String(body.fn || "");
      if (!fn) return NextResponse.json({ error: "RPC function name required" }, { status: 400 });

      const data = await runDbRpc(dbClient, fn, body.args || {});
      return NextResponse.json({ data, error: null });
    }

    return NextResponse.json({ error: "Unsupported action: " + action }, { status: 400 });
  } catch (err: any) {
    console.error("Database API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
