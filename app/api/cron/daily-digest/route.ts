/**
 * Cron — daily digest. Vercel Cron 02:00 UTC (= 09:00 Asia/Ho_Chi_Minh).
 *
 * Gửi cho user `digest_enabled=true` AND có request trong 24h qua AND chưa
 * nhận digest trong 18h gần nhất (chống dup).
 */
import { NextResponse } from "next/server";
import { and, eq, gte, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { requests, users } from "@/lib/pg/schema";
import { dailyDigestEmail, sendMail } from "@/lib/email/resend";

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

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cooldown = new Date(Date.now() - 18 * 60 * 60 * 1000);

  // Aggregate per user trong 24h.
  const agg = await db
    .select({
      userId: requests.userId,
      requests24h: sql<number>`count(*)`,
      cost: sql<number>`coalesce(sum(${requests.costUserMicroUsd}), 0)`,
      topModel: sql<string | null>`(
        SELECT public_model FROM ${requests} r2
        WHERE r2.user_id = ${requests.userId} AND r2.created_at >= ${since}
        GROUP BY public_model ORDER BY count(*) DESC LIMIT 1
      )`,
    })
    .from(requests)
    .where(gte(requests.createdAt, since))
    .groupBy(requests.userId);

  if (agg.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, sent: 0 });
  }

  const userIds = agg.map((a) => a.userId).filter((id): id is string => Boolean(id));
  if (userIds.length === 0) return NextResponse.json({ ok: true, candidates: 0, sent: 0 });

  const recipients = await db
    .select({
      id: users.id,
      email: users.email,
      balance: users.balanceMicroUsd,
      digestEnabled: users.digestEnabled,
      lastDigestAt: users.lastDigestAt,
    })
    .from(users)
    .where(
      and(
        eq(users.status, "active"),
        eq(users.digestEnabled, true),
        or(isNull(users.lastDigestAt), lt(users.lastDigestAt, cooldown)),
      ),
    );

  const map = new Map(agg.map((a) => [a.userId, a]));
  let sent = 0;
  let failed = 0;

  for (const u of recipients) {
    const a = map.get(u.id);
    if (!a) continue;
    const r = await sendMail(
      dailyDigestEmail({
        email: u.email,
        balanceMicroUsd: Number(u.balance),
        costMicroUsd24h: Number(a.cost),
        requests24h: Number(a.requests24h),
        topModel: a.topModel,
      }),
    );
    if (r.ok) {
      sent++;
      await db
        .update(users)
        .set({ lastDigestAt: new Date() })
        .where(eq(users.id, u.id));
    } else {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, candidates: recipients.length, sent, failed });
}
