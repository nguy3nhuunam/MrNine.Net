/**
 * SePay webhook — credit balance khi user chuyển khoản.
 *
 * Auth: Bearer token shared secret (SEPAY_WEBHOOK_SECRET).
 *  - Cấu hình ở SePay dashboard: webhook URL = https://mrnine.net/api/billing/sepay/webhook,
 *    Authorization Header = Bearer <SEPAY_WEBHOOK_SECRET>.
 *
 * Payload SePay (rút gọn):
 * {
 *   "id": 1234, "gateway": "MBBank", "transactionDate": "...",
 *   "accountNumber": "...", "subAccount": "...", "code": null,
 *   "content": "DT MR-AB12CD34 chuyen khoan",
 *   "transferType": "in",
 *   "transferAmount": 100000,
 *   "referenceCode": "FT2412...",
 *   "description": "..."
 * }
 *
 * Idempotent: dùng providerRef (MR-XXXX) trong content để khoá. Nếu Transaction
 * đã `completed` thì 200 ok và bỏ qua.
 */
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { balanceLedger, transactions, users } from "@/lib/pg/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REF_RE = /\bMR-[A-F0-9]{8}\b/i;

export async function POST(req: Request) {
  const expected = process.env.SEPAY_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Chỉ xử lý chuyển khoản đến.
  const direction = String(body.transferType ?? "").toLowerCase();
  if (direction !== "in") {
    return NextResponse.json({ ok: true, ignored: "not_inbound" });
  }

  const amount = Number(body.transferAmount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: true, ignored: "invalid_amount" });
  }

  const content = String(body.content ?? body.description ?? "");
  const m = content.match(REF_RE);
  if (!m) {
    return NextResponse.json({ ok: true, ignored: "no_ref_in_content" });
  }
  const providerRef = m[0].toUpperCase();

  // Lookup pending transaction.
  const txn = (
    await db.select().from(transactions).where(eq(transactions.providerRef, providerRef)).limit(1)
  )[0];
  if (!txn) {
    return NextResponse.json({ ok: true, ignored: "ref_not_found" });
  }
  if (txn.status === "completed") {
    return NextResponse.json({ ok: true, ignored: "already_completed" });
  }
  if (txn.amountVnd !== amount) {
    // Số tiền không khớp → đánh dấu pending kèm raw_payload, admin xử lý tay.
    await db
      .update(transactions)
      .set({ status: "pending", rawPayload: { ...body, mismatch_amount: amount } })
      .where(eq(transactions.id, txn.id));
    return NextResponse.json({ ok: true, ignored: "amount_mismatch", expected: txn.amountVnd, got: amount });
  }

  // Atomic credit: trong transaction, update balance + insert ledger + finalize txn.
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({
        balanceMicroUsd: sql`${users.balanceMicroUsd} + ${txn.amountMicroUsd}`,
        lifetimeTopupMicroUsd: sql`${users.lifetimeTopupMicroUsd} + ${txn.amountMicroUsd}`,
      })
      .where(eq(users.id, txn.userId))
      .returning({ balance: users.balanceMicroUsd });

    const newBalance = Number(updated[0]?.balance ?? 0);

    await tx.insert(balanceLedger).values({
      userId: txn.userId,
      kind: "topup",
      deltaMicroUsd: txn.amountMicroUsd,
      balanceAfterMicroUsd: newBalance,
      requestId: providerRef,
      note: `SePay topup ${txn.amountVnd.toLocaleString("vi-VN")}đ`,
      metadataJson: { provider: "sepay", reference_code: body.referenceCode ?? null },
    });

    await tx
      .update(transactions)
      .set({ status: "completed", completedAt: new Date(), rawPayload: body })
      .where(eq(transactions.id, txn.id));
  });

  // Hydrate Redis nếu gateway đang chạy chung infra (best-effort fire-and-forget).
  hydrateGatewayBalance(txn.userId).catch(() => undefined);

  return NextResponse.json({ ok: true, credited_micro_usd: txn.amountMicroUsd });
}

async function hydrateGatewayBalance(userId: string): Promise<void> {
  const url = process.env.GATEWAY_BASE_URL;
  const secret = process.env.GATEWAY_INTERNAL_SECRET;
  if (!url || !secret) return;
  // Gateway sẽ tự refresh balance từ Postgres trong vòng 60s qua cache TTL.
  // Endpoint hydrate explicit là optional — không cần block webhook.
  void userId;
}
