import { db } from "./db";
import { isPostgresMode, pgDb } from "./pgDb";

const statementCache = new Map<string, any>();
const MAX_STMT_CACHE = 500;

function getCachedStatement(sql: string) {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    if (statementCache.size >= MAX_STMT_CACHE) {
      const firstKey = statementCache.keys().next().value;
      if (firstKey) statementCache.delete(firstKey);
    }
    stmt = db.prepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
}

export function clearStatementCache() {
  statementCache.clear();
}

export const dbClient = {
  isPostgres: isPostgresMode(),

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (isPostgresMode()) return pgDb.all<T>(sql, params);
    return getCachedStatement(sql).all(...params) as T[];
  },

  async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    if (isPostgresMode()) return pgDb.get<T>(sql, params);
    return (getCachedStatement(sql).get(...params) as T) ?? null;
  },

  async run(sql: string, params: unknown[] = []) {
    if (isPostgresMode()) return pgDb.run(sql, params);
    return getCachedStatement(sql).run(...params);
  },
};

