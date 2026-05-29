/**
 * GET — list public models user có thể chọn cho API key.
 */
import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";

import { db } from "@/lib/pg/db";
import { modelMap } from "@/lib/pg/schema";
import { requireUser } from "@/lib/pg/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireUser();
  const rows = await db
    .select({ publicName: modelMap.publicName, provider: modelMap.provider })
    .from(modelMap)
    .where(eq(modelMap.enabled, true))
    .orderBy(asc(modelMap.publicName));
  return NextResponse.json({ models: rows.map((r) => r.publicName) });
}
