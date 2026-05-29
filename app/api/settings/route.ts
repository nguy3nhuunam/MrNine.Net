/**
 * PATCH /api/settings — toggle user preferences (digest, etc).
 * body: { digestEnabled?: boolean }
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { users } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const me = await requireUser();
  const body = (await req.json().catch(() => ({}))) as {
    digestEnabled?: boolean;
  };
  const patch: Record<string, unknown> = {};
  if (typeof body.digestEnabled === "boolean") patch.digestEnabled = body.digestEnabled;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }
  await db.update(users).set(patch).where(eq(users.id, me.id));
  return NextResponse.json({ ok: true });
}
