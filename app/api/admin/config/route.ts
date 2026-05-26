import { NextResponse } from "next/server";
import { getSiteConfig, requireAdmin, saveSiteConfig } from "@/lib/admin-config";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function _GET() {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const cfg = await getSiteConfig(true);
  return NextResponse.json(cfg);
}

async function _PUT(request: Request) {
  const blocked = await requireAdmin();
  if (blocked) return blocked;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const next = await saveSiteConfig(body);
  return NextResponse.json(next);
}

export const GET = safeJsonRoute(_GET);
export const PUT = safeJsonRoute(_PUT);
