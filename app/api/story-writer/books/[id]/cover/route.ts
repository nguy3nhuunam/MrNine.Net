import { NextResponse } from "next/server";
import { booksCol, toId } from "@/lib/story-writer/store";
import { guardedRoute, type GuardContext } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
const FAL_QUEUE_BASE = "https://queue.fal.run";
const EMBEDDED_FAL_KEY = "d3ed1c4c-b8aa-40aa-926e-4b82ba599ae6:cae3e2004fd04235f9805226a5f96464";

function getKey() {
  return process.env.FAL_KEY || process.env.FAL_API_KEY || EMBEDDED_FAL_KEY;
}

async function _handler_POST(request: Request, guard: GuardContext, ctx: Ctx) {
  if (!guard.userId) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = guard.userId;

  let body: { prompt?: string; aspectRatio?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "Cần prompt" }, { status: 400 });

  const book = await (await booksCol()).findOne({ _id: toId(id), userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const aspectRatio = ["1:1", "3:4", "4:3", "9:16", "16:9"].includes(body.aspectRatio ?? "")
    ? (body.aspectRatio as string)
    : "3:4";

  const key = getKey();
  if (!key) return NextResponse.json({ error: "FAL_KEY chưa cấu hình" }, { status: 500 });

  // Submit Imagen 4 — solid all-rounder for cover work.
  const submit = await fetch(`${FAL_QUEUE_BASE}/fal-ai/imagen4/preview`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      num_images: 1,
    }),
  });
  const submitJson = await submit.json().catch(() => ({}));
  if (!submit.ok) {
    return NextResponse.json(
      { error: "Image submit thất bại", detail: submitJson },
      { status: submit.status },
    );
  }
  const requestId = (submitJson as { request_id?: string }).request_id;
  const statusUrl = (submitJson as { status_url?: string }).status_url;
  const responseUrl = (submitJson as { response_url?: string }).response_url;
  if (!requestId || !statusUrl || !responseUrl) {
    return NextResponse.json({ error: "FAL không trả về URL", detail: submitJson }, { status: 502 });
  }

  // Poll synchronously up to 50s — page itself caps at maxDuration=60.
  const start = Date.now();
  while (Date.now() - start < 50_000) {
    await new Promise((r) => setTimeout(r, 2200));
    const statusRes = await fetch(statusUrl, { headers: { Authorization: `Key ${key}` }, cache: "no-store" });
    const statusText = await statusRes.text();
    let statusJson: unknown;
    try {
      statusJson = JSON.parse(statusText);
    } catch {
      statusJson = { raw: statusText };
    }
    const queueStatus = String((statusJson as { status?: string }).status ?? "").toUpperCase();
    if (queueStatus === "COMPLETED") {
      const resultRes = await fetch(responseUrl, { headers: { Authorization: `Key ${key}` }, cache: "no-store" });
      const resultJson = await resultRes.json().catch(() => ({}));
      const url =
        (resultJson as { images?: Array<{ url?: string }> }).images?.[0]?.url ||
        (resultJson as { image?: { url?: string } }).image?.url;
      if (!url) return NextResponse.json({ error: "Không có ảnh trả về", detail: resultJson }, { status: 502 });
      return NextResponse.json({ url, requestId, prompt });
    }
    if (queueStatus === "FAILED") {
      return NextResponse.json({ error: "FAL render thất bại", detail: statusJson }, { status: 502 });
    }
  }
  return NextResponse.json({ error: "Render timeout", requestId, statusUrl, responseUrl }, { status: 504 });
}

export const POST = guardedRoute(
  { route: "story-cover", requireUser: true, charge: "story-cover" },
  _handler_POST,
);
