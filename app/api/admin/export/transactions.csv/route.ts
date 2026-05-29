/**
 * GET /api/admin/export/transactions.csv?from=YYYY-MM-DD&to=YYYY-MM-DD&status=
 *
 * Streaming CSV. Default range: 30 ngày gần nhất.
 */
import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { transactions, users } from "@/lib/pg/schema";
import { requireAdmin } from "@/lib/admin-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csv(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;

  const url = new URL(req.url);
  const fromQ = url.searchParams.get("from");
  const toQ = url.searchParams.get("to");
  const statusQ = url.searchParams.get("status");

  const to = toQ ? new Date(toQ) : new Date();
  const from = fromQ ? new Date(fromQ) : new Date(Date.now() - 30 * 86400_000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return new Response("invalid date", { status: 400 });
  }

  const conds = [gte(transactions.createdAt, from), lte(transactions.createdAt, to)];
  if (statusQ === "pending" || statusQ === "completed" || statusQ === "failed" || statusQ === "refunded") {
    conds.push(eq(transactions.status, statusQ));
  }

  const rows = await db
    .select({
      id: transactions.id,
      providerRef: transactions.providerRef,
      provider: transactions.provider,
      email: users.email,
      amountVnd: transactions.amountVnd,
      amountMicroUsd: transactions.amountMicroUsd,
      fxRate: transactions.fxRate,
      status: transactions.status,
      createdAt: transactions.createdAt,
      completedAt: transactions.completedAt,
    })
    .from(transactions)
    .leftJoin(users, eq(users.id, transactions.userId))
    .where(and(...conds))
    .orderBy(asc(transactions.createdAt))
    .limit(50000);

  const header = [
    "id", "provider_ref", "provider", "email",
    "amount_vnd", "amount_usd", "fx_rate",
    "status", "created_at", "completed_at",
  ].join(",");

  const lines = rows.map((r) =>
    [
      csv(r.id),
      csv(r.providerRef),
      csv(r.provider),
      csv(r.email),
      csv(r.amountVnd),
      csv((r.amountMicroUsd / 1_000_000).toFixed(6)),
      csv(r.fxRate),
      csv(r.status),
      csv(r.createdAt ? r.createdAt.toISOString() : ""),
      csv(r.completedAt ? r.completedAt.toISOString() : ""),
    ].join(","),
  );

  const body = "﻿" + header + "\n" + lines.join("\n") + "\n"; // BOM cho Excel
  const filename = `transactions_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
