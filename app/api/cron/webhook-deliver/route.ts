/**
 * Cron — process pending webhook deliveries.
 * Vercel Cron mỗi phút.
 */
import { NextResponse } from "next/server";

import { processPendingDeliveries } from "@/lib/notify/user-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const stats = await processPendingDeliveries(100);
  return NextResponse.json({ ok: true, ...stats });
}
