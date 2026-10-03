import { clientCache } from "./clientCache";

type Filter = { col: string; op: string; val: unknown };

export type SelectPayload = {
  table: string;
  select: string;
  selectOptions: { count?: string; head?: boolean } | null;
  filters: Filter[];
  orderBy: { column: string; ascending: boolean } | null;
  limit: number | null;
  single: boolean;
  maybeSingle: boolean;
};

type QueryResult = { data: unknown; error: Error | null; count?: number };

type Pending = {
  payload: SelectPayload;
  key: string;
  resolve: (value: QueryResult) => void;
};

let queue: Pending[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const BATCH_MS = 2;

async function runOne(payload: SelectPayload, key: string): Promise<QueryResult> {
  return clientCache.dedupe(key, async () => {
    const res = await fetch("/api/sqlite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "select", ...payload }),
    });
    const json = await res.json();
    const result = {
      data: json.data,
      error: json.error ? new Error(json.error) : null,
      count: json.count,
    };
    if (!result.error && clientCache.isCacheable(payload.table)) {
      clientCache.set(key, result.data, [payload.table], result.count);
    }
    return result;
  });
}

async function flush() {
  flushTimer = null;
  const batch = queue.splice(0);
  if (!batch.length) return;

  if (batch.length === 1) {
    batch[0].resolve(await runOne(batch[0].payload, batch[0].key));
    return;
  }

  try {
    const res = await fetch("/api/sqlite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "batch",
        queries: batch.map((b) => ({ action: "select", ...b.payload })),
      }),
    });
    const json = await res.json();
    const results: { data: unknown; error: string | null; count?: number }[] = json.results || [];

    batch.forEach((item, i) => {
      const r = results[i] ?? { data: null, error: "Missing batch result" };
      const qResult = {
        data: r.data,
        error: r.error ? new Error(r.error) : null,
        count: r.count,
      };
      if (!qResult.error && clientCache.isCacheable(item.payload.table)) {
        clientCache.set(item.key, qResult.data, [item.payload.table], qResult.count);
      }
      item.resolve(qResult);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Batch query failed";
    batch.forEach((item) => item.resolve({ data: null, error: new Error(message) }));
  }
}

export function enqueueSelect(payload: SelectPayload): Promise<QueryResult> {
  const key = clientCache.generateKey(payload);

  // Check client in-memory cache for instant 0ms response
  const cached = clientCache.get(key);
  if (cached && !cached.isStale) {
    return Promise.resolve({
      data: cached.data,
      error: null,
      count: cached.count,
    });
  }

  return new Promise((resolve) => {
    // If we have stale cache, we can resolve immediately with cached data
    // while scheduling background revalidation!
    if (cached && cached.data !== undefined) {
      resolve({
        data: cached.data,
        error: null,
        count: cached.count,
      });
      // Fire background revalidation to keep cache fresh
      void runOne(payload, key);
      return;
    }

    queue.push({ payload, key, resolve });
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        void flush();
      }, BATCH_MS);
    }
  });
}

/** Run pending selects immediately (for writes that must not wait). */
export function flushSelectBatch() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length) void flush();
}

