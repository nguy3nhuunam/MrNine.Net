import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { userWebhooks, webhookDeliveries } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";
import { DeliveriesTable } from "@/components/dashboard/DeliveriesTable";

export const metadata = { title: "Webhook deliveries · MrNine" };
export const dynamic = "force-dynamic";

export default async function DeliveriesPage() {
  const me = await requireUser();

  const rows = await db
    .select({
      id: webhookDeliveries.id,
      webhookId: webhookDeliveries.webhookId,
      url: userWebhooks.url,
      event: webhookDeliveries.event,
      status: webhookDeliveries.status,
      attempts: webhookDeliveries.attempts,
      nextRetryAt: webhookDeliveries.nextRetryAt,
      lastStatus: webhookDeliveries.lastStatus,
      lastError: webhookDeliveries.lastError,
      createdAt: webhookDeliveries.createdAt,
      completedAt: webhookDeliveries.completedAt,
    })
    .from(webhookDeliveries)
    .innerJoin(userWebhooks, eq(userWebhooks.id, webhookDeliveries.webhookId))
    .where(eq(userWebhooks.userId, me.id))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(200);

  return (
    <DeliveriesTable
      initial={rows.map((r) => ({
        id: r.id,
        webhookId: r.webhookId,
        url: r.url,
        event: r.event,
        status: r.status,
        attempts: r.attempts,
        nextRetryAt: r.nextRetryAt?.toISOString() ?? null,
        lastStatus: r.lastStatus,
        lastError: r.lastError,
        createdAt: r.createdAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
      }))}
    />
  );
}
