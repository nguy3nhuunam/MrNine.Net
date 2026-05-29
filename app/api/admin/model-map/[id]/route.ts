/**
 * PATCH /api/admin/model-map/[id]
 * body: { enabled?: boolean, inputCost?: number, outputCost?: number, markup?: number }
 *
 * Quick toggle/update không cần fill lại form đầy đủ.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { modelMap } from "@/lib/pg/schema";
import { requireAdmin } from "@/lib/admin-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    inputCost?: number;
    outputCost?: number;
    markup?: number;
  };

  const patch: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (Number.isFinite(body.inputCost)) patch.inputCostPerMtok = String(body.inputCost);
  if (Number.isFinite(body.outputCost)) patch.outputCostPerMtok = String(body.outputCost);
  if (Number.isFinite(body.markup)) patch.markup = String(Math.max(1, Number(body.markup)));

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const updated = await db
    .update(modelMap)
    .set(patch)
    .where(eq(modelMap.id, id))
    .returning();
  if (updated.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, model: updated[0] });
}
