/**
 * GET    /api/webhooks         — list user's webhooks
 * POST   /api/webhooks         — { url, events[] } → tạo (auto sinh secret)
 * DELETE /api/webhooks?id=     — xoá
 */
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { userWebhooks } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";
import { generateWebhookSecret, type WebhookEvent } from "@/lib/notify/user-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EVENTS: WebhookEvent[] = [
  "topup_completed",
  "balance_low",
  "coupon_redeemed",
  "refund_issued",
];

export async function GET() {
  const me = await requireUser();
  const rows = await db
    .select()
    .from(userWebhooks)
    .where(eq(userWebhooks.userId, me.id))
    .orderBy(desc(userWebhooks.createdAt));
  return NextResponse.json({
    webhooks: rows.map((r) => ({
      ...r,
      secret: r.secret.slice(0, 12) + "…", // mask
      lastFiredAt: r.lastFiredAt?.toISOString() ?? null,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const me = await requireUser();
  const body = (await req.json().catch(() => ({}))) as {
    url?: string;
    events?: string[];
  };
  const url = String(body.url ?? "").trim();
  if (!/^https?:\/\/.+/i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  const events = Array.isArray(body.events)
    ? Array.from(new Set(body.events.filter((e): e is WebhookEvent => VALID_EVENTS.includes(e as WebhookEvent))))
    : [];
  if (events.length === 0) {
    return NextResponse.json({ error: "no_events", valid: VALID_EVENTS }, { status: 400 });
  }

  const existing = await db
    .select({ id: userWebhooks.id })
    .from(userWebhooks)
    .where(eq(userWebhooks.userId, me.id));
  if (existing.length >= 10) {
    return NextResponse.json({ error: "too_many_webhooks" }, { status: 409 });
  }

  const secret = generateWebhookSecret();
  const inserted = await db
    .insert(userWebhooks)
    .values({ userId: me.id, url, events, secret })
    .returning();
  // Trả về secret plaintext 1 lần — sau đó list sẽ mask.
  return NextResponse.json({ ok: true, webhook: inserted[0] });
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const deleted = await db
    .delete(userWebhooks)
    .where(and(eq(userWebhooks.id, id), eq(userWebhooks.userId, me.id)))
    .returning({ id: userWebhooks.id });
  if (deleted.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
