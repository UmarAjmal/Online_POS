import { NextResponse } from "next/server";
import { ensureServerDbReady, isServerDbReady } from "@/lib/serverDbInit";
import { isPostgresMode } from "@/lib/pgDb";
import { dbClient } from "@/lib/dbClient";

export async function GET() {
  try {
    await ensureServerDbReady();

    const shop = await dbClient.get<{ id: string; name: string }>(
      "SELECT id, name FROM shops LIMIT 1"
    );
    const users = await dbClient.get<{ count: number }>(
      isPostgresMode()
        ? "SELECT COUNT(*)::int AS count FROM user_profiles"
        : "SELECT COUNT(*) AS count FROM user_profiles"
    );

    return NextResponse.json({
      ok: true,
      db: isPostgresMode() ? "postgres" : "sqlite",
      ready: isServerDbReady(),
      shop: shop?.name || null,
      users: users?.count ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
