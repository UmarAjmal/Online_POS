import { NextResponse } from "next/server";
import { dbClient } from "@/lib/dbClient";

export async function POST(request: Request) {
  try {
    const { shopId, tier, price } = await request.json();

    if (!shopId || !tier || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const config = await dbClient.get<{ website: string }>(
      `SELECT website FROM company_details WHERE shop_id = ? LIMIT 1`,
      [shopId]
    );

    let safepayApiKey = process.env.SAFEPAY_API_KEY || "";
    let isSandbox = process.env.SAFEPAY_SANDBOX !== "false";

    if (config?.website && config.website.startsWith("{")) {
      try {
        const parsed = JSON.parse(config.website);
        if (parsed.safepay_api_key) safepayApiKey = parsed.safepay_api_key;
        if (parsed.safepay_sandbox !== undefined) isSandbox = parsed.safepay_sandbox;
      } catch {
        /* ignore invalid JSON */
      }
    }

    if (!safepayApiKey) {
      return NextResponse.json({ error: "Payment gateway is not configured" }, { status: 503 });
    }

    const host = isSandbox ? "sandbox.api.getsafepay.com" : "api.getsafepay.com";

    const response = await fetch(`https://${host}/order/v1/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: safepayApiKey,
        amount: Number(price),
        currency: "PKR",
        environment: isSandbox ? "sandbox" : "production",
      }),
    });

    const result = await response.json();

    if (!response.ok || !result?.data?.token) {
      return NextResponse.json(
        { error: "Safepay session initialization failed", details: result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token: result.data.token,
      client: safepayApiKey,
      sandbox: isSandbox,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
