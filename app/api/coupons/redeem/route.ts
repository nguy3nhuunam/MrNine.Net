/**
 * POST /api/coupons/redeem  — body: { code }
 * - Auth required (NextAuth user)
 * - Idempotent qua unique (coupon_id, user_id) ở coupon_redemptions
 * - Credit balance + ledger kind=adjust note "Coupon <CODE>"
 */
import { NextResponse } from "next/server";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { balanceLedger, couponRedemptions, coupons, users } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";
import { notifyCouponRedeemed } from "@/lib/notify/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VND_RATE = parseInt(process.env.USD_VND_RATE ?? "25500", 10);

export async function POST(req: Request) {
  const me = await requireUser();
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = (body.code ?? "").toString().trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });

  const c = (
    await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, code),
          or(isNull(coupons.expiresAt), gt(coupons.expiresAt, new Date())),
        ),
      )
      .limit(1)
  )[0];

  if (!c) return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });
  if (c.redeemedCount >= c.maxRedemptions) {
    return NextResponse.json({ error: "exhausted" }, { status: 409 });
  }

  const credit =
    c.kind === "fixed_vnd"
      ? Math.round((c.valueMicroUsd / VND_RATE) * 1_000_000)
      : c.valueMicroUsd;

  try {
    return await db.transaction(async (tx) => {
      await tx.insert(couponRedemptions).values({
        couponId: c.id,
        userId: me.id,
        creditedMicroUsd: credit,
      });

      const updated = await tx
        .update(coupons)
        .set({ redeemedCount: sql`${coupons.redeemedCount} + 1` })
        .where(and(eq(coupons.id, c.id), sql`${coupons.redeemedCount} < ${coupons.maxRedemptions}`))
        .returning({ count: coupons.redeemedCount });
      if (updated.length === 0) {
        throw new Error("exhausted");
      }

      const u = await tx
        .update(users)
        .set({
          balanceMicroUsd: sql`${users.balanceMicroUsd} + ${credit}`,
          lowBalanceNotifiedAt: null,
        })
        .where(eq(users.id, me.id))
        .returning({ balance: users.balanceMicroUsd });

      const newBal = Number(u[0]?.balance ?? 0);

      await tx.insert(balanceLedger).values({
        userId: me.id,
        kind: "adjust",
        deltaMicroUsd: credit,
        balanceAfterMicroUsd: newBal,
        requestId: `coupon-${c.code}`,
        note: `Coupon ${c.code}`,
        metadataJson: { coupon_id: c.id, code: c.code, kind: c.kind },
      });

      notifyCouponRedeemed({
        email: me.email,
        code: c.code,
        creditedMicroUsd: credit,
      });

      return NextResponse.json({
        ok: true,
        credited_micro_usd: credit,
        new_balance_micro_usd: newBal,
      });
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("uq_coupon_redemptions_user")) {
      return NextResponse.json({ error: "already_redeemed" }, { status: 409 });
    }
    if (msg === "exhausted") {
      return NextResponse.json({ error: "exhausted" }, { status: 409 });
    }
    console.error("[coupon] redeem failed", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
