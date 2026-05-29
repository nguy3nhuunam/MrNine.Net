/**
 * GET /api/admin/export/usage.csv?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Aggregate from `requests` per user × day × public_model.
 */
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { requests, users } from "@/lib/pg/schema";
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

  const to = toQ ? new Date(toQ) : new Date();
  const from = fromQ ? new Date(fromQ) : new Date(Date.now() - 30 * 86400_000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return new Response("invalid date", { status: 400 });
  }

  const day = sql<string>`date_trunc('day', ${requests.createdAt})`;

  const rows = await db
    .select({
      day,
      email: users.email,
      publicModel: requests.publicModel,
      ok: sql<number>`sum(case when ${requests.statusCode} < 400 then 1 else 0 end)`,
      err: sql<number>`sum(case when ${requests.statusCode} >= 400 then 1 else 0 end)`,
      promptTokens: sql<number>`sum(${requests.promptTokens})`,
      completionTokens: sql<number>`sum(${requests.completionTokens})`,
      totalTokens: sql<number>`sum(${requests.totalTokens})`,
      costUserMicroUsd: sql<number>`sum(${requests.costUserMicroUsd})`,
      profitMicroUsd: sql<number>`sum(${requests.profitMicroUsd})`,
    })
    .from(requests)
    .leftJoin(users, eq(users.id, requests.userId))
    .where(and(gte(requests.createdAt, from), lte(requests.createdAt, to)))
    .groupBy(day, users.email, requests.publicModel)
    .orderBy(asc(day))
    .limit(50000);

  const header = [
    "day", "email", "public_model",
    "requests_ok", "requests_err",
    "prompt_tokens", "completion_tokens", "total_tokens",
    "cost_user_usd", "profit_usd",
  ].join(",");

  const lines = rows.map((r) =>
    [
      csv(String(r.day).slice(0, 10)),
      csv(r.email),
      csv(r.publicModel),
      csv(Number(r.ok)),
      csv(Number(r.err)),
      csv(Number(r.promptTokens)),
      csv(Number(r.completionTokens)),
      csv(Number(r.totalTokens)),
      csv((Number(r.costUserMicroUsd) / 1_000_000).toFixed(6)),
      csv((Number(r.profitMicroUsd) / 1_000_000).toFixed(6)),
    ].join(","),
  );

  const body = "﻿" + header + "\n" + lines.join("\n") + "\n";
  const filename = `usage_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
