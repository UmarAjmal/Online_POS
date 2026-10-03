import { NextResponse } from "next/server";
import { dbClient } from "@/lib/dbClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");
    const tier = searchParams.get("tier");
    const billing = searchParams.get("billing") || "monthly";

    if (!shopId || !tier) {
      return new NextResponse("Missing parameters", { status: 400 });
    }

    const expiry = new Date();
    if (billing === "yearly") {
      expiry.setDate(expiry.getDate() + 365);
    } else {
      expiry.setDate(expiry.getDate() + 30);
    }

    await dbClient.run(
      `UPDATE shops SET subscription_tier = ?, subscription_expires_at = ? WHERE id = ?`,
      [tier, expiry.toISOString(), shopId]
    );

    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/dashboard?payment_success=true&tier=${tier}`);
  } catch (err: any) {
    return new NextResponse("Callback error: " + err.message, { status: 505 });
  }
}
