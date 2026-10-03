"use client";

/**
 * High-Performance Client-Side Cache Layer with SWR (Stale-While-Revalidate)
 * and Request Deduplication (Single-Flight Pattern).
 * Delivers 0ms instant UI responses for repeated queries and eliminates server round-trips.
 */

type CacheEntry = {
  data: any;
  count?: number;
  tables: string[];
  timestamp: number;
  ttlMs: number;
};

class ClientQueryCache {
  private memoryCache = new Map<string, CacheEntry>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private tableToKeys = new Map<string, Set<string>>();

  // Tables to cache on the client side with default TTLs (ms)
  private cacheableTableTTLs: Record<string, number> = {
    shops: 60000,
    system_settings: 60000,
    roles: 60000,
    categories: 45000,
    brands: 45000,
    units: 45000,
    formulations: 45000,
    security_settings: 30000,
    user_profiles: 30000,
    products: 20000,
    parties: 20000,
    cash_accounts: 20000,
  };

  public isCacheable(table: string): boolean {
    return !!this.cacheableTableTTLs[table.toLowerCase()];
  }

  public getTTL(table: string): number {
    return this.cacheableTableTTLs[table.toLowerCase()] || 20000;
  }

  public generateKey(payload: {
    table: string;
    select?: string;
    selectOptions?: any;
    filters?: any[];
    orderBy?: any;
    limit?: number | null;
    single?: boolean;
    maybeSingle?: boolean;
  }): string {
    const parts = [
      payload.table,
      payload.select || "*",
      JSON.stringify(payload.filters || []),
      JSON.stringify(payload.orderBy || {}),
      payload.limit || "all",
      payload.single ? "s" : "",
      payload.maybeSingle ? "ms" : "",
      payload.selectOptions?.count || "",
      payload.selectOptions?.head ? "h" : "",
    ];
    return parts.join("::");
  }

  public get(key: string): { data: any; count?: number; isStale: boolean } | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const isStale = age > entry.ttlMs;

    // Hard expiry after 3x TTL
    if (age > entry.ttlMs * 3) {
      this.deleteKey(key);
      return null;
    }

    return {
      data: entry.data,
      count: entry.count,
      isStale,
    };
  }

  public set(
    key: string,
    data: any,
    tables: string[],
    count?: number,
    customTtlMs?: number
  ): void {
    const primaryTable = tables[0]?.toLowerCase() || "default";
    const ttlMs = customTtlMs || this.getTTL(primaryTable);

    this.memoryCache.set(key, {
      data,
      count,
      tables,
      timestamp: Date.now(),
      ttlMs,
    });

    tables.forEach((t) => {
      const lower = t.toLowerCase();
      if (!this.tableToKeys.has(lower)) {
        this.tableToKeys.set(lower, new Set());
      }
      this.tableToKeys.get(lower)!.add(key);
    });
  }

  private deleteKey(key: string): void {
    const entry = this.memoryCache.get(key);
    if (entry) {
      entry.tables.forEach((t) => {
        this.tableToKeys.get(t.toLowerCase())?.delete(key);
      });
      this.memoryCache.delete(key);
    }
  }

  public invalidateTable(...tables: string[]): void {
    tables.forEach((t) => {
      const lower = t.toLowerCase();
      const keys = this.tableToKeys.get(lower);
      if (keys) {
        keys.forEach((k) => this.memoryCache.delete(k));
        this.tableToKeys.delete(lower);
      }
    });
  }

  public clearAll(): void {
    this.memoryCache.clear();
    this.tableToKeys.clear();
    this.inFlightRequests.clear();
  }

  /**
   * Request Deduplication (Single-Flight): If an identical query is already in-flight,
   * share the same promise rather than sending multiple duplicate HTTP requests.
   */
  public async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const promise = fetcher().finally(() => {
      this.inFlightRequests.delete(key);
    });

    this.inFlightRequests.set(key, promise);
    return promise;
  }
}

export const clientCache = new ClientQueryCache();
