/**
 * High-Performance Server-Side In-Memory LRU Query Cache with Table-Aware Invalidation.
 * Dramatically reduces disk I/O and query execution time for repeated reads.
 */

type CacheEntry = {
  data: any;
  count?: number;
  tables: string[];
  expiresAt: number;
};

class ServerQueryCache {
  private cache = new Map<string, CacheEntry>();
  private tableToKeys = new Map<string, Set<string>>();
  private maxEntries = 1000;
  private defaultTtlMs = 25000; // 25 seconds

  // Tables that should be cached aggressively
  private cacheableTables = new Set([
    "shops",
    "system_settings",
    "roles",
    "categories",
    "brands",
    "units",
    "formulations",
    "user_profiles",
    "security_settings",
    "products",
    "accounts",
    "parties",
    "customers",
  ]);

  public isCacheable(table: string): boolean {
    return this.cacheableTables.has(table);
  }

  public get(key: string): { data: any; count?: number } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.deleteKey(key);
      return null;
    }

    return { data: entry.data, count: entry.count };
  }

  public set(key: string, data: any, tables: string[], count?: number, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest 10% entries
      const keys = Array.from(this.cache.keys());
      for (let i = 0; i < Math.floor(this.maxEntries * 0.1); i++) {
        this.deleteKey(keys[i]);
      }
    }

    const expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);
    this.cache.set(key, { data, count, tables, expiresAt });

    tables.forEach((t) => {
      const lower = t.toLowerCase();
      if (!this.tableToKeys.has(lower)) {
        this.tableToKeys.set(lower, new Set());
      }
      this.tableToKeys.get(lower)!.add(key);
    });
  }

  private deleteKey(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.tables.forEach((t) => {
        this.tableToKeys.get(t.toLowerCase())?.delete(key);
      });
      this.cache.delete(key);
    }
  }

  public invalidateTables(...tables: string[]): void {
    tables.forEach((t) => {
      const lower = t.toLowerCase();
      const keys = this.tableToKeys.get(lower);
      if (keys) {
        keys.forEach((k) => this.cache.delete(k));
        this.tableToKeys.delete(lower);
      }
    });
  }

  public clearAll(): void {
    this.cache.clear();
    this.tableToKeys.clear();
  }

  public getStats() {
    return {
      cachedEntries: this.cache.size,
      trackedTables: this.tableToKeys.size,
    };
  }
}

export const serverCache = new ServerQueryCache();
