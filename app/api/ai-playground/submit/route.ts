import { NextResponse } from "next/server";
import { getModelById } from "@/lib/fal-models";
import { guardedRoute, type GuardContext } from "@/lib/api-guard";
import { chargeCredits } from "@/lib/credits";

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

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

async function _handler_POST(request: Request, ctx: GuardContext) {
  let modelId = "";
  let payload: Record<string, unknown> = {};

  try {
    const body = await request.json();
    modelId = String(body?.modelId ?? "");
    payload = (body?.payload ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ" }, { status: 400 });
  }

  const model = getModelById(modelId);
  if (!model) {
    return NextResponse.json({ error: `Model không hỗ trợ: ${modelId}` }, { status: 400 });
  }

  // Charge based on output kind. Image=10, video=25 (matches COST_TABLE).
  if (ctx.userId) {
    const chargeKind = model.outputKind === "video" ? "playground-video" : "playground-image";
    const result = await chargeCredits(ctx.userId, chargeKind);
    if (!result.ok && result.reason === "insufficient") {
      return NextResponse.json(
        {
          code: "insufficient_credits",
          error: "Hết credits chu kỳ này. Hãy đợi reset hoặc nhập coupon.",
        },
        { status: 402 },
      );
    }
    if (result.ok) ctx.charged += result.charged;
  }

  const promptValue = typeof payload[model.promptKey] === "string" ? (payload[model.promptKey] as string).trim() : "";
  if (!promptValue) {
    return NextResponse.json({ error: "Prompt không được để trống" }, { status: 400 });
  }

  const input: Record<string, unknown> = {};

  if (model.imageKey) {
    const raw = payload[model.imageKey];
    const url = typeof raw === "string" ? raw.trim() : Array.isArray(raw) && typeof raw[0] === "string" ? raw[0].trim() : "";
    if (!url) {
      return NextResponse.json({ error: "Model này cần ảnh đầu vào (URL)" }, { status: 400 });
    }
    if (model.imageIsArray) {
      input[model.imageKey] = [url];
    } else {
      input[model.imageKey] = url;
    }
  }

  if (model.promptKey !== model.imageKey) {
    input[model.promptKey] = promptValue;
  }

  for (const spec of model.params) {
    if (!(spec.key in payload)) continue;
    const raw = payload[spec.key];
    if (raw === "" || raw === null || raw === undefined) continue;

    if (spec.type === "boolean") {
      input[spec.key] = Boolean(raw);
    } else if (spec.type === "number") {
      const n = coerceNumber(raw);
      if (n !== undefined) input[spec.key] = n;
    } else if (spec.type === "select" || spec.type === "string" || spec.type === "textarea") {
      input[spec.key] = String(raw);
    }
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

  const submitUrl = `${FAL_QUEUE_BASE}/${model.endpoint}`;

  const response = await fetch(submitUrl, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
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
      { error: "Yêu cầu bị từ chối", status: response.status, detail: parsed },
      { status: response.status },
    );
  }

  const data = parsed as {
    request_id?: string;
    status?: string;
    status_url?: string;
    response_url?: string;
    cancel_url?: string;
  };

  if (!data?.request_id) {
    return NextResponse.json(
      { error: "Hệ thống không trả về request_id", detail: parsed },
      { status: 502 },
    );
  }

  return NextResponse.json({
    requestId: data.request_id,
    status: data.status ?? "IN_QUEUE",
    endpoint: model.endpoint,
    outputKind: model.outputKind,
    statusUrl: data.status_url,
    responseUrl: data.response_url,
    cancelUrl: data.cancel_url,
  });
}

export const POST = guardedRoute(
  { route: "ai-playground-submit", requireUser: true },
  _handler_POST,
);
