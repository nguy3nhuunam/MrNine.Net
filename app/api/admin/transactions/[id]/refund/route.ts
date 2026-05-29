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
import { auth } from "@/auth";
import { notifyRefund } from "@/lib/notify/discord";
import { fireWebhook } from "@/lib/notify/user-webhook";
import { recordAudit } from "@/lib/audit";

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
      .returning({ balance: users.balanceMicroUsd, email: users.email });

    const newBalance = Number(updated[0]?.balance ?? 0);
    const userEmail = updated[0]?.email ?? "unknown";

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

    const session = await auth();
    notifyRefund({
      adminEmail: session?.user?.email ?? null,
      userEmail,
      amountVnd: txn.amountVnd,
      amountMicroUsd: txn.amountMicroUsd,
      providerRef: txn.providerRef,
    });
    fireWebhook(txn.userId, "refund_issued", {
      transaction_id: txn.id,
      provider_ref: txn.providerRef,
      amount_vnd: txn.amountVnd,
      amount_micro_usd: txn.amountMicroUsd,
      new_balance_micro_usd: newBalance,
    });
    recordAudit({
      actorEmail: session?.user?.email ?? null,
      action: "transaction.refund",
      targetType: "transaction",
      targetId: txn.id,
      metadata: { amount_vnd: txn.amountVnd, amount_micro_usd: txn.amountMicroUsd, user_email: userEmail },
    });
  });

  return NextResponse.json({ ok: true, refunded_micro_usd: txn.amountMicroUsd });
}
