import { NextResponse } from "next/server";
import { trackVisit } from "@/lib/admin-config";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function _POST(request: Request) {
  const body = await request.json().catch(() => null);
  const moduleName = (body as { module?: string } | null)?.module;
  if (!moduleName || typeof moduleName !== "string" || moduleName.length > 64) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await trackVisit(moduleName);
  return NextResponse.json({ ok: true });
}

export const POST = safeJsonRoute(_POST);
