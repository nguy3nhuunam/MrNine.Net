import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { userWebhooks } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";
import { WebhooksPanel } from "@/components/dashboard/WebhooksPanel";

export const metadata = { title: "Webhooks · MrNine" };
export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const me = await requireUser();
  const rows = await db
    .select()
    .from(userWebhooks)
    .where(eq(userWebhooks.userId, me.id))
    .orderBy(desc(userWebhooks.createdAt));

  const initial = rows.map((r) => ({
    id: r.id,
    url: r.url,
    secretMasked: r.secret.slice(0, 12) + "…",
    events: r.events ?? [],
    enabled: r.enabled,
    lastFiredAt: r.lastFiredAt?.toISOString() ?? null,
    lastStatus: r.lastStatus,
    lastError: r.lastError,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));

  return <WebhooksPanel initial={initial} />;
}
