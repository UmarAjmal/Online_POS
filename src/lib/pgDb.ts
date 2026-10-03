import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString,
      max: 30,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export function toPgSql(sql: string, params: unknown[] = []) {
  let index = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++index}`);
  return { sql: pgSql, params };
}

export const pgDb = {
  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const q = toPgSql(sql, params);
    const result = await getPool().query(q.sql, q.params);
    return result.rows as T[];
  },

  async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.all<T>(sql, params);
    return rows[0] ?? null;
  },

  async run(sql: string, params: unknown[] = []) {
    const q = toPgSql(sql, params);
    await getPool().query(q.sql, q.params);
  },
};

export function isPostgresMode() {
  return Boolean(process.env.DATABASE_URL);
}

/** SQLite and PostgreSQL schemas use INTEGER 0/1 for booleans. */
export function normalizeDbValue(val: unknown): unknown {
  if (val === true) return 1;
  if (val === false) return 0;
  if (Array.isArray(val)) return val.map(normalizeDbValue);
  return val;
}

export function normalizeDbRecord(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = normalizeDbValue(value);
  }
  return out;
}
