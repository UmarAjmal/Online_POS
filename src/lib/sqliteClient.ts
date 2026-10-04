"use client";

import { enqueueSelect, flushSelectBatch } from "./sqliteBatcher";
import { clientCache } from "./clientCache";

const SESSION_KEY = "argroup_user";
const TOKEN_KEY = "argroup_session";

type Filter = { col: string; op: string; val: any };

class QueryBuilder {
  private table: string;
  private selectedFields = "*";
  private selectOptions: { count?: string; head?: boolean } | null = null;
  private filters: Filter[] = [];
  private orderByConfig: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields = "*", options?: { count?: string; head?: boolean }) {
    this.selectedFields = fields;
    this.selectOptions = options || null;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  like(col: string, pattern: string) {
    this.filters.push({ col, op: "like", val: pattern });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.filters.push({ col, op: "ilike", val: pattern });
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push({ col, op: "gte", val });
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push({ col, op: "lte", val });
    return this;
  }

  gt(col: string, val: any) {
    this.filters.push({ col, op: "gt", val });
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push({ col, op: "lt", val });
    return this;
  }

  is(col: string, val: any) {
    this.filters.push({ col, op: "is", val });
    return this;
  }

  not(col: string, op: string, val: any) {
    this.filters.push({ col, op: `not_${op}`, val });
    return this;
  }

  in(col: string, values: any[]) {
    this.filters.push({ col, op: "in", val: values });
    return this;
  }

  order(column: string, config: { ascending?: boolean } = { ascending: true }) {
    this.orderByConfig = { column, ascending: config.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  insert(records: any) {
    flushSelectBatch();
    const table = this.table;

    const runInsert = async (single = false, maybeSingle = false) => {
      try {
        const res = await fetch("/api/sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "insert", table, data: records }),
        });
        const json = await res.json();
        if (json.error) {
          return { data: null, error: new Error(json.error) };
        }

        clientCache.invalidateTable(table);

        let data = json.data;
        if (single || maybeSingle) {
          data = Array.isArray(data) ? data[0] ?? null : data ?? null;
        }
        return { data, error: null };
      } catch (e: any) {
        return { data: null, error: e };
      }
    };

    const chain = {
      select: (_fields = "*") => ({
        single: () => ({
          then: (resolve: (value: { data: any; error: any }) => void) =>
            runInsert(true, false).then(resolve),
        }),
        maybeSingle: () => ({
          then: (resolve: (value: { data: any; error: any }) => void) =>
            runInsert(false, true).then(resolve),
        }),
        then: (resolve: (value: { data: any; error: any }) => void) =>
          runInsert(false, false).then(resolve),
      }),
      then: (resolve: (value: { data: any; error: any }) => void) =>
        runInsert(false, false).then(resolve),
    };

    return chain;
  }

  upsert(records: any) {
    flushSelectBatch();
    const table = this.table;

    const runUpsert = async (single = false, maybeSingle = false) => {
      try {
        const res = await fetch("/api/sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "upsert", table, data: records }),
        });
        const json = await res.json();
        if (json.error) {
          return { data: null, error: new Error(json.error) };
        }

        clientCache.invalidateTable(table);

        let data = json.data;
        if (single || maybeSingle) {
          data = Array.isArray(data) ? data[0] ?? null : data ?? null;
        }
        return { data, error: null };
      } catch (e: any) {
        return { data: null, error: e };
      }
    };

    const chain = {
      select: (_fields = "*") => ({
        single: () => ({
          then: (resolve: (value: { data: any; error: any }) => void) =>
            runUpsert(true, false).then(resolve),
        }),
        maybeSingle: () => ({
          then: (resolve: (value: { data: any; error: any }) => void) =>
            runUpsert(false, true).then(resolve),
        }),
        then: (resolve: (value: { data: any; error: any }) => void) =>
          runUpsert(false, false).then(resolve),
      }),
      then: (resolve: (value: { data: any; error: any }) => void) =>
        runUpsert(false, false).then(resolve),
    };

    return chain;
  }

  private buildMutationChain(filters: Filter[], run: () => Promise<{ data: any; error: any }>) {
    const chain = {
      eq: (col: string, val: any) => {
        filters.push({ col, op: "eq", val });
        return chain;
      },
      in: (col: string, val: any[]) => {
        filters.push({ col, op: "in", val });
        return chain;
      },
      then: (resolve: (value: { data: any; error: any }) => void) => run().then(resolve),
    };
    return chain;
  }

  update(data: any) {
    const filters = [...this.filters];
    const runUpdate = async () => {
      flushSelectBatch();
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", table: this.table, data, filters }),
      });
      const json = await res.json();
      if (!json.error) {
        clientCache.invalidateTable(this.table);
      }
      return { data: json.data, error: json.error ? new Error(json.error) : null };
    };

    return this.buildMutationChain(filters, runUpdate);
  }

  delete() {
    const filters = [...this.filters];
    const runDelete = async () => {
      flushSelectBatch();
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", table: this.table, filters }),
      });
      const json = await res.json();
      if (!json.error) {
        clientCache.invalidateTable(this.table);
      }
      return { data: json.data, error: json.error ? new Error(json.error) : null };
    };

    return this.buildMutationChain(filters, runDelete);
  }

  async then(resolve: (value: { data: any; error: any; count?: number }) => void) {
    try {
      const result = await enqueueSelect({
        table: this.table,
        select: this.selectedFields,
        selectOptions: this.selectOptions,
        filters: this.filters,
        orderBy: this.orderByConfig,
        limit: this.limitCount,
        single: this.isSingle,
        maybeSingle: this.isMaybeSingle,
      });
      resolve(result);
    } catch (e: any) {
      resolve({ data: null, error: e });
    }
  }
}

export const sqliteClient = {
  from(table: string) {
    return new QueryBuilder(table);
  },

  async rpc(fn: string, args: Record<string, unknown> = {}) {
    flushSelectBatch();
    try {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rpc", fn, args }),
      });
      const json = await res.json();
      if (json.error) {
        return { data: null, error: new Error(json.error) };
      }
      return { data: json.data, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  channel(_name?: string) {
    const ch = {
      on(_event?: string, _config?: unknown, _callback?: () => void) {
        return ch;
      },
      subscribe(callback?: (status: string) => void) {
        if (callback) {
          setTimeout(() => callback("SUBSCRIBED"), 0);
        }
        return { unsubscribe: () => {} };
      },
    };
    return ch;
  },

  removeChannel() {},

  storage: {
    from() {
      return {
        upload: async () => ({ data: null, error: new Error("File storage is not available in SQLite mode") }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      };
    },
  },

  auth: {
    async signUp(params: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      businessName: string;
      industryType?: string;
      businessPhone?: string;
      address?: string;
      footerNote?: string;
      currency?: string;
      themePreset?: string;
    }) {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          ...params,
        }),
      });

      const json = await res.json();
      if (json.error) {
        return { data: null, error: new Error(json.error) };
      }

      return { data: json.data, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      const res = await fetch("/api/sqlite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: email.trim(),
          password: (password || "").trim(),
        }),
      });

      const json = await res.json();
      if (json.error) {
        return { data: null, error: new Error(json.error) };
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(json.data.user));
        localStorage.setItem(TOKEN_KEY, JSON.stringify(json.data.session));
      }

      return { data: json.data, error: null };
    },

    async getUser() {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(SESSION_KEY);
        if (cached) {
          try {
            return { data: { user: JSON.parse(cached) }, error: null };
          } catch {
            localStorage.removeItem(SESSION_KEY);
          }
        }
      }

      return { data: { user: null }, error: null };
    },

    async signOut() {
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
      return { error: null };
    },
  },
};

export { clientCache };
export function invalidateClientCache(table?: string) {
  if (table) {
    clientCache.invalidateTable(table);
  } else {
    clientCache.clearAll();
  }
}

