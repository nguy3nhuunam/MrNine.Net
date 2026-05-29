/**
 * Cron — low balance alert.
 *
 * Chạy mỗi giờ. Tìm user có:
 *   balance < LOW_BALANCE_THRESHOLD_MICRO_USD (default 0.5 USD = 500_000 micro)
 *   AND (low_balance_notified_at IS NULL OR cách đây > 7 ngày)
 *   AND lifetime_topup > 0  (chỉ alert user đã từng nạp, tránh spam free tier)
 *
 * Sau khi gửi mail set low_balance_notified_at = now() để chống spam.
 * Webhook topup tự reset cột này về NULL → cảnh báo lại sau khi balance tụt tiếp.
 *
 * Bảo mật: header `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron tự gắn)
 */
import { NextResponse } from "next/server";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { users } from "@/lib/pg/schema";
import { sendMail, lowBalanceEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THRESHOLD = parseInt(process.env.LOW_BALANCE_THRESHOLD_MICRO_USD ?? "500000", 10);
const COOLDOWN_DAYS = 7;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const cooldown = new Date(Date.now() - COOLDOWN_DAYS * 86400 * 1000);

  const candidates = await db
    .select({
      id: users.id,
      email: users.email,
      balance: users.balanceMicroUsd,
    })
    .from(users)
    .where(
      and(
        eq(users.status, "active"),
        lt(users.balanceMicroUsd, THRESHOLD),
        sql`${users.lifetimeTopupMicroUsd} > 0`,
        or(isNull(users.lowBalanceNotifiedAt), lt(users.lowBalanceNotifiedAt, cooldown)),
      ),
    )
    .limit(100);

  let sent = 0;
  let failed = 0;
  for (const u of candidates) {
    const r = await sendMail(
      lowBalanceEmail({
        email: u.email,
        balanceMicroUsd: Number(u.balance),
        thresholdMicroUsd: THRESHOLD,
      }),
    );
    if (r.ok) {
      sent++;
      await db
        .update(users)
        .set({ lowBalanceNotifiedAt: new Date() })
        .where(eq(users.id, u.id));
    } else {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, sent, failed });
}
