/**
 * POST /api/admin/transactions/[id]/refund
 *
 * Hoàn tiền 1 transaction completed:
 *   - Trừ user balance (= amountMicroUsd)
 *   - Trừ lifetime_topup
 *   - Insert ledger kind=refund (delta âm)
 *   - Set transaction.status=refunded
 *
 * Idempotent: nếu txn đã refunded → 200 ok ignored.
 * Chống âm: nếu balance hiện tại < amountMicroUsd → 409 (admin phải xử lý tay).
 */
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { balanceLedger, transactions, users } from "@/lib/pg/schema";
import { requireAdmin } from "@/lib/admin-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const txn = (
    await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)
  )[0];
  if (!txn) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (txn.status === "refunded") {
    return NextResponse.json({ ok: true, ignored: "already_refunded" });
  }
  if (txn.status !== "completed") {
    return NextResponse.json(
      { error: "not_completed", status: txn.status },
      { status: 409 },
    );
  }

  const userRow = (
    await db.select({ balance: users.balanceMicroUsd }).from(users).where(eq(users.id, txn.userId)).limit(1)
  )[0];
  if (!userRow) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  if (Number(userRow.balance) < txn.amountMicroUsd) {
    return NextResponse.json(
      {
        error: "insufficient_balance",
        balance: Number(userRow.balance),
        need: txn.amountMicroUsd,
      },
      { status: 409 },
    );
  }

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({
        balanceMicroUsd: sql`${users.balanceMicroUsd} - ${txn.amountMicroUsd}`,
        lifetimeTopupMicroUsd: sql`${users.lifetimeTopupMicroUsd} - ${txn.amountMicroUsd}`,
      })
      .where(eq(users.id, txn.userId))
      .returning({ balance: users.balanceMicroUsd });

    const newBalance = Number(updated[0]?.balance ?? 0);

    await tx.insert(balanceLedger).values({
      userId: txn.userId,
      kind: "refund",
      deltaMicroUsd: -txn.amountMicroUsd,
      balanceAfterMicroUsd: newBalance,
      requestId: txn.providerRef ?? `refund-${txn.id}`,
      note: `Refund ${txn.amountVnd.toLocaleString("vi-VN")}đ`,
      metadataJson: { provider: txn.provider, original_txn: txn.id },
    });

    await tx
      .update(transactions)
      .set({ status: "refunded" })
      .where(eq(transactions.id, txn.id));
  });

  return NextResponse.json({ ok: true, refunded_micro_usd: txn.amountMicroUsd });
}
