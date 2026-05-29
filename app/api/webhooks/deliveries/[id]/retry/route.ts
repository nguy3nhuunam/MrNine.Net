/**
 * POST /api/webhooks/deliveries/[id]/retry
 *
 * Reset delivery về pending, attempts=0, next_retry_at=now → cron tick tới
 * sẽ thử lại. Chỉ owner của webhook mới retry được.
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { userWebhooks, webhookDeliveries } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await requireUser();
  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const row = (
    await db
      .select({
        id: webhookDeliveries.id,
        webhookId: webhookDeliveries.webhookId,
        userId: userWebhooks.userId,
      })
      .from(webhookDeliveries)
      .innerJoin(userWebhooks, eq(userWebhooks.id, webhookDeliveries.webhookId))
      .where(eq(webhookDeliveries.id, id))
      .limit(1)
  )[0];

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.userId !== me.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      attempts: 0,
      nextRetryAt: new Date(),
      lastError: null,
      lastStatus: null,
      completedAt: null,
    })
    .where(eq(webhookDeliveries.id, id));

  return NextResponse.json({ ok: true });
}
