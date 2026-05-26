import { NextResponse } from "next/server";
import { getStats, requireAdmin } from "@/lib/admin-config";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function _GET() {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const stats = await getStats();
  return NextResponse.json(stats);
}

export const GET = safeJsonRoute(_GET);
