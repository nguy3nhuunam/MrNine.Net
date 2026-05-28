/**
 * Cron route — poll Gmail biên lai MB Bank, credit balance.
 *
 * Trigger:
 *   - Vercel Cron mỗi 1 phút (hoặc chạy độc lập qua external cron pinger)
 *   - Hoặc gọi manual: GET /api/billing/gmail/poll?key=$CRON_SECRET
 *
 * Idempotent: dedup qua email_events.message_id.
 */
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import {
  balanceLedger,
  emailEvents,
  transactions,
  users,
} from "@/lib/pg/schema";
import { listBankInbox, parseBankEmail } from "@/lib/billing/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("key") ?? req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.GMAIL_REFRESH_TOKEN) {
    return NextResponse.json({ ok: true, skipped: "gmail_not_configured" });
  }

  const days = Number(url.searchParams.get("days") ?? "1");
  const max = Number(url.searchParams.get("max") ?? "30");

  let messages;
  try {
    messages = await listBankInbox({ days, max });
  } catch (e) {
    return NextResponse.json(
      { error: "gmail_fetch_failed", message: (e as Error).message },
      { status: 500 },
    );
  }

  const result = {
    fetched: messages.length,
    parsed: 0,
    credited: 0,
    skipped: [] as Array<{ messageId: string; reason: string }>,
  };

  for (const m of messages) {
    // Dedup
    const seen = (
      await db.select().from(emailEvents).where(eq(emailEvents.messageId, m.messageId)).limit(1)
    )[0];
    if (seen) {
      result.skipped.push({ messageId: m.messageId, reason: `seen_${seen.status}` });
      continue;
    }

    const parsed = parseBankEmail(m.body);
    if (!parsed) {
      await db.insert(emailEvents).values({
        messageId: m.messageId,
        status: "no_match",
        note: `subject: ${m.subject.slice(0, 200)}`,
      });
      result.skipped.push({ messageId: m.messageId, reason: "no_ref_or_amount" });
      continue;
    }
    result.parsed += 1;

    if (parsed.direction !== "in") {
      await db.insert(emailEvents).values({
        messageId: m.messageId,
        parsedRef: parsed.ref,
        parsedAmountVnd: parsed.amountVnd,
        direction: parsed.direction,
        status: "outbound_ignored",
      });
      result.skipped.push({ messageId: m.messageId, reason: "not_inbound" });
      continue;
    }

    // Lookup pending Transaction theo ref
    const txn = (
      await db.select().from(transactions).where(eq(transactions.providerRef, parsed.ref)).limit(1)
    )[0];
    if (!txn) {
      await db.insert(emailEvents).values({
        messageId: m.messageId,
        parsedRef: parsed.ref,
        parsedAmountVnd: parsed.amountVnd,
        direction: parsed.direction,
        status: "ref_not_found",
      });
      result.skipped.push({ messageId: m.messageId, reason: "ref_not_found" });
      continue;
    }
    if (txn.status === "completed") {
      await db.insert(emailEvents).values({
        messageId: m.messageId,
        parsedRef: parsed.ref,
        parsedAmountVnd: parsed.amountVnd,
        direction: parsed.direction,
        status: "txn_already_completed",
      });
      result.skipped.push({ messageId: m.messageId, reason: "already_completed" });
      continue;
    }
    if (txn.amountVnd !== parsed.amountVnd) {
      await db.insert(emailEvents).values({
        messageId: m.messageId,
        parsedRef: parsed.ref,
        parsedAmountVnd: parsed.amountVnd,
        direction: parsed.direction,
        status: "amount_mismatch",
        note: `expected ${txn.amountVnd}, got ${parsed.amountVnd}`,
      });
      result.skipped.push({
        messageId: m.messageId,
        reason: `amount_mismatch ${txn.amountVnd}!=${parsed.amountVnd}`,
      });
      continue;
    }

    // Atomic credit
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
        requestId: parsed.ref,
        note: `MB Bank topup ${txn.amountVnd.toLocaleString("vi-VN")}đ`,
        metadataJson: { provider: "mbbank-gmail", message_id: m.messageId },
      });

      await tx
        .update(transactions)
        .set({
          status: "completed",
          completedAt: new Date(),
          rawPayload: { source: "gmail", subject: m.subject, parsed },
        })
        .where(eq(transactions.id, txn.id));

      await tx.insert(emailEvents).values({
        messageId: m.messageId,
        parsedRef: parsed.ref,
        parsedAmountVnd: parsed.amountVnd,
        direction: parsed.direction,
        status: "credited",
      });
    });

    result.credited += 1;
  }

  return NextResponse.json(result);
}
