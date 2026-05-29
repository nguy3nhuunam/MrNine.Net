/**
 * PATCH /api/keys/[id]
 * body: { allowedModels: string[] | null, name?: string }
 *
 * null = cho phép tất cả models. [] = không cho dùng model nào (key bị "freeze").
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { apiKeys } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await requireUser();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    allowedModels?: string[] | null;
    name?: string;
  };

  const patch: Record<string, unknown> = {};
  if (body.allowedModels === null) {
    patch.allowedModels = null;
  } else if (Array.isArray(body.allowedModels)) {
    const arr = body.allowedModels
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0 && s.length < 120);
    patch.allowedModels = arr;
  }
  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 120);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const updated = await db
    .update(apiKeys)
    .set(patch)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, me.id)))
    .returning();
  if (updated.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, key: updated[0] });
}
