export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureServerDbReady } = await import("./lib/serverDbInit");
    try {
      await ensureServerDbReady();
      console.log("[DB] Server database initialized");
    } catch (err) {
      console.error("[DB] Server database init failed:", err);
    }
  }
}
