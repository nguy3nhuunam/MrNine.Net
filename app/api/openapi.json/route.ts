/**
 * GET /api/openapi.json — proxy gateway OpenAPI spec với download header.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const GATEWAY_OPENAPI_URL =
  process.env.GATEWAY_OPENAPI_URL ?? "https://api.mrnine.net/_openapi.json";

export async function GET() {
  try {
    const res = await fetch(GATEWAY_OPENAPI_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "gateway_unavailable", status: res.status },
        { status: 503 },
      );
    }
    const text = await res.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mrnine.openapi.json"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "fetch_failed", message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
