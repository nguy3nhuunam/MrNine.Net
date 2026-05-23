import { NextResponse } from "next/server";
import { getModelById } from "@/lib/fal-models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAL_QUEUE_BASE = "https://queue.fal.run";
const EMBEDDED_FAL_KEY = "d3ed1c4c-b8aa-40aa-926e-4b82ba599ae6:cae3e2004fd04235f9805226a5f96464";

function getKey() {
  const key = process.env.FAL_KEY || process.env.FAL_API_KEY || EMBEDDED_FAL_KEY;
  if (!key) {
    throw new Error("FAL_KEY chưa được cấu hình");
  }
  return key;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const modelId = url.searchParams.get("modelId") ?? "";
  const requestId = url.searchParams.get("requestId") ?? "";
  const mode = url.searchParams.get("mode") ?? "status";

  if (!modelId || !requestId) {
    return NextResponse.json({ error: "Thiếu modelId hoặc requestId" }, { status: 400 });
  }

  const model = getModelById(modelId);
  if (!model) {
    return NextResponse.json({ error: `Model không hỗ trợ: ${modelId}` }, { status: 400 });
  }

  let key: string;
  try {
    key = getKey();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Thiếu FAL_KEY" },
      { status: 500 },
    );
  }

  const tail = mode === "result" ? "" : "/status";
  const target = `${FAL_QUEUE_BASE}/${model.endpoint}/requests/${requestId}${tail}`;

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
      { error: "FAL trả lỗi khi truy vấn", status: response.status, detail: parsed },
      { status: response.status },
    );
  }

  return NextResponse.json({ mode, data: parsed });
}
