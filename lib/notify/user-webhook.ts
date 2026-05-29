/**
 * User webhook fan-out với retry queue.
 *
 * Header: `X-MrNine-Signature: t=<unix>,v1=<hex_hmac_sha256>`
 *   value = HMAC_SHA256(secret, `${t}.${rawBody}`)
 *
 * Flow:
 *   1. fireWebhook() → enqueue row vào webhook_deliveries (status=pending, attempts=0)
 *   2. Cron `/api/cron/webhook-deliver` mỗi phút → pull pending where next_retry_at <= now
 *   3. POST tới URL với HMAC sig. Thành công (2xx) → status=succeeded.
 *      Fail → attempts++, nếu attempts < 3 → schedule retry exponential (30s/2min/10min),
 *      nếu attempts >= 3 → status=failed.
 *
 * Best-effort: nếu enqueue fail (DB down) → log + drop, không throw.
 */
import { createHmac, randomBytes } from "node:crypto";
import { and, eq, lte, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { userWebhooks, webhookDeliveries } from "@/lib/pg/schema";

export type WebhookEvent =
  | "topup_completed"
  | "balance_low"
  | "coupon_redeemed"
  | "refund_issued";

const RETRY_DELAYS_SEC = [30, 120, 600]; // attempt 1 fail → 30s, 2 → 2min, 3 → 10min (then fail)
const MAX_ATTEMPTS = 3;

export function generateWebhookSecret(): string {
  return "whsec_" + randomBytes(24).toString("hex");
}

function sign(secret: string, ts: number, body: string): string {
  return createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
}

/** Enqueue webhook deliveries cho user. Non-blocking. */
export function fireWebhook(userId: string, event: WebhookEvent, data: object): void {
  void (async () => {
    try {
      const hooks = await db
        .select({ id: userWebhooks.id, events: userWebhooks.events })
        .from(userWebhooks)
        .where(and(eq(userWebhooks.userId, userId), eq(userWebhooks.enabled, true)));

      const matches = hooks.filter(
        (h) => Array.isArray(h.events) && h.events.includes(event),
      );
      if (matches.length === 0) return;

      const payload = {
        event,
        data,
        created_at: new Date().toISOString(),
      };

      await db.insert(webhookDeliveries).values(
        matches.map((h) => ({
          webhookId: h.id,
          event,
          payload,
        })),
      );
    } catch (e) {
      console.error("[webhook] enqueue failed", e);
    }
  })();
}

/**
 * Process pending deliveries. Gọi từ cron route.
 * Returns counts: picked / succeeded / requeued / failed.
 */
export async function processPendingDeliveries(limit = 50): Promise<{
  picked: number;
  succeeded: number;
  requeued: number;
  failed: number;
}> {
  const now = new Date();
  const claimed = await db
    .update(webhookDeliveries)
    .set({ nextRetryAt: new Date(now.getTime() + 60_000) }) // 60s lock
    .where(
      and(
        eq(webhookDeliveries.status, "pending"),
        lte(webhookDeliveries.nextRetryAt, now),
      ),
    )
    .returning();

  const batch = claimed.slice(0, limit);
  if (batch.length === 0) return { picked: 0, succeeded: 0, requeued: 0, failed: 0 };

  let succeeded = 0;
  let requeued = 0;
  let failed = 0;

  await Promise.all(
    batch.map(async (d) => {
      const hook = (
        await db.select().from(userWebhooks).where(eq(userWebhooks.id, d.webhookId)).limit(1)
      )[0];
      if (!hook || !hook.enabled) {
        await db
          .update(webhookDeliveries)
          .set({ status: "failed", lastError: "webhook_disabled_or_deleted", completedAt: new Date() })
          .where(eq(webhookDeliveries.id, d.id));
        failed++;
        return;
      }

      const ts = Math.floor(Date.now() / 1000);
      const body = JSON.stringify(d.payload);
      const sig = sign(hook.secret, ts, body);

      let status: number | null = null;
      let error: string | null = null;
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "MrNine-Webhook/1",
            "X-MrNine-Signature": `t=${ts},v1=${sig}`,
          },
          body,
          signal: AbortSignal.timeout(8000),
        });
        status = res.status;
        if (!res.ok) error = `http ${res.status}`;
      } catch (e: unknown) {
        error = e instanceof Error ? e.message : String(e);
      }

      const newAttempts = d.attempts + 1;
      const success = status !== null && status >= 200 && status < 300;

      if (success) {
        await db.transaction(async (tx) => {
          await tx
            .update(webhookDeliveries)
            .set({
              status: "succeeded",
              attempts: newAttempts,
              lastStatus: status,
              lastError: null,
              completedAt: new Date(),
            })
            .where(eq(webhookDeliveries.id, d.id));
          await tx
            .update(userWebhooks)
            .set({ lastFiredAt: new Date(), lastStatus: status, lastError: null })
            .where(eq(userWebhooks.id, hook.id));
        });
        succeeded++;
        return;
      }

      // Failure path.
      await db
        .update(userWebhooks)
        .set({ lastFiredAt: new Date(), lastStatus: status, lastError: error })
        .where(eq(userWebhooks.id, hook.id));

      if (newAttempts >= MAX_ATTEMPTS) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "failed",
            attempts: newAttempts,
            lastStatus: status,
            lastError: error,
            completedAt: new Date(),
          })
          .where(eq(webhookDeliveries.id, d.id));
        failed++;
      } else {
        const delay = RETRY_DELAYS_SEC[newAttempts - 1] ?? 600;
        await db
          .update(webhookDeliveries)
          .set({
            status: "pending",
            attempts: newAttempts,
            lastStatus: status,
            lastError: error,
            nextRetryAt: new Date(Date.now() + delay * 1000),
          })
          .where(eq(webhookDeliveries.id, d.id));
        requeued++;
      }
    }),
  );

  return { picked: batch.length, succeeded, requeued, failed };
}
