import { NextResponse } from "next/server";
import { guardedRoute, type GuardContext } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMBEDDED_FAL_KEY = "d3ed1c4c-b8aa-40aa-926e-4b82ba599ae6:cae3e2004fd04235f9805226a5f96464";
const ALLOWED_HOSTS = new Set(["queue.fal.run", "fal.run", "rest.alpha.fal.ai"]);

function getKey() {
  const key = process.env.FAL_KEY || process.env.FAL_API_KEY || EMBEDDED_FAL_KEY;
  if (!key) {
    throw new Error("API key chưa được cấu hình");
  }
  return key;
}

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

async function _handler_GET(request: Request, _guard: GuardContext) {
  void _guard;
  const url = new URL(request.url);
  const target = url.searchParams.get("url") ?? "";
  const mode = url.searchParams.get("mode") ?? "status";

  if (!target) {
    return NextResponse.json({ error: "Thiếu tham số url" }, { status: 400 });
  }
  if (!isAllowedUrl(target)) {
    return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 });
  }

  let key: string;
  try {
    key = getKey();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Thiếu API key" },
      { status: 500 },
    );
  }

  const response = await fetch(target, {
    method: "GET",
    headers: { Authorization: `Key ${key}` },
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "Truy vấn thất bại", status: response.status, detail: parsed },
      { status: response.status },
    );
  }

  return NextResponse.json({ mode, data: parsed });
}

// status is the polling endpoint — UI hits it every ~2s while waiting for
// FAL. Crank the per-minute ceiling so a single in-flight job doesn't trip.
export const GET = guardedRoute(
  {
    route: "ai-playground-status",
    requireUser: true,
    rate: { user: { perMinute: 120, perHour: 1500 } },
  },
  _handler_GET,
);
