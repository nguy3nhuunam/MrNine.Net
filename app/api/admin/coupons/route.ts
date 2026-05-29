/**
 * GET  /api/admin/coupons       — list 200 mới nhất
 * POST /api/admin/coupons       — body: { code, kind, value, maxRedemptions?, expiresAt?, note? }
 *   value = số (USD nếu kind=fixed_micro_usd, VND nếu kind=fixed_vnd)
 * DELETE /api/admin/coupons?id=  — xoá (chỉ khi redeemed_count=0)
 */
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/pg/db";
import { coupons, users } from "@/lib/pg/schema";
import { requireAdmin } from "@/lib/admin-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = await requireAdmin();
  if (blocked) return blocked;

  const rows = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      kind: coupons.kind,
      valueMicroUsd: coupons.valueMicroUsd,
      maxRedemptions: coupons.maxRedemptions,
      redeemedCount: coupons.redeemedCount,
      expiresAt: coupons.expiresAt,
      note: coupons.note,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .orderBy(desc(coupons.createdAt))
    .limit(200);

  return NextResponse.json({ coupons: rows });
}

export async function POST(req: Request) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;

  const session = await auth();
  const adminEmail = session?.user?.email?.toLowerCase() ?? null;
  const adminRow = adminEmail
    ? (await db.select({ id: users.id }).from(users).where(eq(users.email, adminEmail)).limit(1))[0]
    : null;

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    kind?: "fixed_micro_usd" | "fixed_vnd";
    value?: number;
    maxRedemptions?: number;
    expiresAt?: string | null;
    note?: string | null;
  };

  const code = (body.code ?? "").toString().trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return NextResponse.json({ error: "invalid_code_format" }, { status: 400 });
  }
  if (body.kind !== "fixed_micro_usd" && body.kind !== "fixed_vnd") {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }
  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }
  // Lưu cùng đơn vị: fixed_micro_usd → micro USD, fixed_vnd → VND raw
  const valueMicroUsd =
    body.kind === "fixed_micro_usd" ? Math.round(value * 1_000_000) : Math.round(value);

  const maxRedemptions = Math.max(1, Math.floor(Number(body.maxRedemptions ?? 1)));
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "invalid_expires_at" }, { status: 400 });
  }

  try {
    const inserted = await db
      .insert(coupons)
      .values({
        code,
        kind: body.kind,
        valueMicroUsd,
        maxRedemptions,
        expiresAt,
        note: body.note ?? null,
        createdBy: adminRow?.id ?? null,
      })
      .returning();
    return NextResponse.json({ ok: true, coupon: inserted[0] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ix_coupons_code")) {
      return NextResponse.json({ error: "code_exists" }, { status: 409 });
    }
    console.error("[admin/coupons] create failed", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const c = (await db.select().from(coupons).where(eq(coupons.id, id)).limit(1))[0];
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (c.redeemedCount > 0) {
    return NextResponse.json({ error: "already_redeemed", count: c.redeemedCount }, { status: 409 });
  }
  await db.delete(coupons).where(eq(coupons.id, id));
  return NextResponse.json({ ok: true });
}
