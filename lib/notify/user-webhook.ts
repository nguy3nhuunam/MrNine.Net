/**
 * User webhook fan-out — fire-and-forget với HMAC sig.
 *
 * Header: `X-MrNine-Signature: t=<unix>,v1=<hex_hmac_sha256>`
 *   value = HMAC_SHA256(secret, `${t}.${rawBody}`)
 *
 * Lưu lastStatus/lastError best-effort. Không retry — webhook là best-effort.
 */
import { createHmac, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { userWebhooks } from "@/lib/pg/schema";

export type WebhookEvent =
  | "topup_completed"
  | "balance_low"
  | "coupon_redeemed"
  | "refund_issued";

export function generateWebhookSecret(): string {
  return "whsec_" + randomBytes(24).toString("hex");
}

function sign(secret: string, ts: number, body: string): string {
  return createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
}

async function deliver(
  hookId: string,
  url: string,
  secret: string,
  payload: object,
): Promise<void> {
  const ts = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);
  const sig = sign(secret, ts, body);
  let lastStatus: number | null = null;
  let lastError: string | null = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MrNine-Webhook/1",
        "X-MrNine-Signature": `t=${ts},v1=${sig}`,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    lastStatus = res.status;
    if (!res.ok) lastError = `http ${res.status}`;
  } catch (e: unknown) {
    lastError = e instanceof Error ? e.message : String(e);
  }
  try {
    await db
      .update(userWebhooks)
      .set({ lastFiredAt: new Date(), lastStatus, lastError })
      .where(eq(userWebhooks.id, hookId));
  } catch {
    // ignore — webhook delivery state is best-effort
  }
}

export function fireWebhook(userId: string, event: WebhookEvent, data: object): void {
  // Run async, never block caller.
  void (async () => {
    try {
      const hooks = await db
        .select()
        .from(userWebhooks)
        .where(eq(userWebhooks.userId, userId));
      const matches = hooks.filter(
        (h) => h.enabled && Array.isArray(h.events) && h.events.includes(event),
      );
      for (const h of matches) {
        const payload = {
          event,
          data,
          created_at: new Date().toISOString(),
          webhook_id: h.id,
        };
        void deliver(h.id, h.url, h.secret, payload);
      }
    } catch (e) {
      console.error("[webhook] fire failed", e);
    }
  })();
}
