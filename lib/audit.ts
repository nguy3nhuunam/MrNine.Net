/**
 * Audit log helper — fire-and-forget. Best-effort, không throw.
 */
import "server-only";

import { db } from "@/lib/pg/db";
import { auditLog } from "@/lib/pg/schema";

export type AuditAction =
  | "user.promote"
  | "user.demote"
  | "user.adjust_balance"
  | "user.toggle_status"
  | "transaction.refund"
  | "coupon.create"
  | "coupon.delete"
  | "model_map.upsert"
  | "model_map.delete"
  | "model_map.toggle"
  | "provider_key.create"
  | "provider_key.delete"
  | "config.update";

export function recordAudit(opts: {
  actorEmail: string | null | undefined;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: object;
  ip?: string | null;
}): void {
  void (async () => {
    try {
      await db.insert(auditLog).values({
        actorEmail: opts.actorEmail ?? null,
        action: opts.action,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        metadata: (opts.metadata as object) ?? null,
        ip: opts.ip ?? null,
      });
    } catch (e) {
      console.error("[audit] insert failed", e);
    }
  })();
}
