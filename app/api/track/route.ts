import { NextResponse } from "next/server";
import { trackVisit } from "@/lib/admin-config";
import { rateLimitedRoute } from "@/lib/safe-json-route";
import { getCollection } from "@/lib/user-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientErrorDoc = {
  _id?: unknown;
  message: string;
  digest: string | null;
  url: string | null;
  ua: string | null;
  ts: Date;
};

async function _POST(request: Request) {
  const body = await request.json().catch(() => null);
  const event = (body as { event?: string } | null)?.event;

  if (event === "client_error") {
    const message = String((body as { message?: unknown } | null)?.message ?? "").slice(0, 500);
    if (!message) return NextResponse.json({ ok: false }, { status: 400 });
    const col = await getCollection<ClientErrorDoc>("client_errors");
    if (col) {
      await col.insertOne({
        message,
        digest: ((body as { digest?: unknown } | null)?.digest as string | null) ?? null,
        url: ((body as { url?: unknown } | null)?.url as string | null) ?? null,
        ua: request.headers.get("user-agent")?.slice(0, 240) ?? null,
        ts: new Date(),
      });
    }
    return NextResponse.json({ ok: true });
  }

  const moduleName = (body as { module?: string } | null)?.module;
  if (!moduleName || typeof moduleName !== "string" || moduleName.length > 64) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await trackVisit(moduleName);
  return NextResponse.json({ ok: true });
}

export const POST = rateLimitedRoute("track", _POST);
