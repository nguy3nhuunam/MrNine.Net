/**
 * Cron — reset monthly spend usage cho tất cả API key.
 * Vercel Cron: 0 1 1 * * (00:00 ngày 1 hằng tháng UTC = 7h sáng ngày 1 VN).
 */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { apiKeys } from "@/lib/pg/schema";

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
  const result = await db
    .update(apiKeys)
    .set({
      monthlySpendUsedMicroUsd: 0,
      periodStart: sql`date_trunc('month', now())`,
    })
    .returning({ id: apiKeys.id });
  return NextResponse.json({ ok: true, reset: result.length });
}
