import { initArGroupDb } from "./db";
import { isPostgresMode, pgDb } from "./pgDb";

let ready = false;
let initPromise: Promise<void> | null = null;

/** Ensures database schema + seed data exist. Safe to call multiple times. */
export async function ensureServerDbReady(): Promise<void> {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (isPostgresMode()) {
      await pgDb.get("SELECT 1 AS ok");
    } else {
      initArGroupDb();
    }
    ready = true;
  })();

  try {
    await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

export function isServerDbReady() {
  return ready;
}
