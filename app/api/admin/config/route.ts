import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSiteConfig, recordAudit, requireAdmin, saveSiteConfig } from "@/lib/admin-config";
import { rateLimitedRoute } from "@/lib/safe-json-route";

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
  const session = await auth();
  await recordAudit("config:update", session?.user?.email ?? "unknown", body);
  return NextResponse.json(next);
}

export const GET = rateLimitedRoute("admin-config", _GET);
export const PUT = rateLimitedRoute("admin-config", _PUT);
