import { NextResponse } from "next/server";
import { getModelById, type FalModel } from "@/lib/fal-models";
import { guardedRoute, type GuardContext } from "@/lib/api-guard";
import { chargeCredits } from "@/lib/credits";
import { getFalKey } from "@/lib/fal-key";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAL_QUEUE_BASE = "https://queue.fal.run";

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asUrlList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v): v is string => Boolean(v));
  }
  if (typeof raw === "string" && raw.trim()) {
    // Allow comma-separated string from textarea fallback.
    return raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Charge kind picker — when model.pricing is present we still bucket into
// the existing COST_TABLE entries (image/video/motion). Future work: charge
// proportionally to pricing.perUnitUsd × duration. For now we keep it
// simple but use a higher tier for video > 5s and reference-to-video.
function pickChargeKind(model: FalModel, payload: Record<string, unknown>): "playground-image" | "playground-video" | "playground-motion" {
  if (model.outputKind === "image") return "playground-image";
  // Reference-to-video / motion-control are pricier; bucket as motion.
  if (model.audiosKey || model.videosKey || model.capability === "motion-control") {
    return "playground-motion";
  }
  return "playground-video";
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

  // Charge before talking to FAL so a flood of submits can't bypass quota.
  if (ctx.userId) {
    const chargeKind = pickChargeKind(model, payload);
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

  // 1. Single-image legacy field (imageKey) — kept for backwards compat.
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

  // 2. Multi-modal slots — each gets a list of URLs from payload.
  if (model.imagesKey) {
    const urls = asUrlList(payload[model.imagesKey]);
    const limit = model.inputLimits?.images?.maxFiles;
    if (limit !== undefined && urls.length > limit) {
      return NextResponse.json({ error: `Quá số ảnh tối đa: ${limit}` }, { status: 400 });
    }
    if (urls.length) input[model.imagesKey] = urls;
  }
  if (model.videosKey) {
    const urls = asUrlList(payload[model.videosKey]);
    const limit = model.inputLimits?.videos?.maxFiles;
    if (limit !== undefined && urls.length > limit) {
      return NextResponse.json({ error: `Quá số video tối đa: ${limit}` }, { status: 400 });
    }
    if (urls.length) input[model.videosKey] = urls;
  }
  if (model.audiosKey) {
    const urls = asUrlList(payload[model.audiosKey]);
    const limit = model.inputLimits?.audios?.maxFiles;
    if (limit !== undefined && urls.length > limit) {
      return NextResponse.json({ error: `Quá số audio tối đa: ${limit}` }, { status: 400 });
    }
    if (urls.length) input[model.audiosKey] = urls;
  }

  // 3. Cross-modal cap (Seedance 2.0 reference: ≤12 total files).
  const totalCap = model.inputLimits?.totalFiles;
  if (totalCap !== undefined) {
    const count =
      (Array.isArray(input[model.imagesKey ?? ""]) ? (input[model.imagesKey ?? ""] as string[]).length : 0) +
      (Array.isArray(input[model.videosKey ?? ""]) ? (input[model.videosKey ?? ""] as string[]).length : 0) +
      (Array.isArray(input[model.audiosKey ?? ""]) ? (input[model.audiosKey ?? ""] as string[]).length : 0);
    if (count > totalCap) {
      return NextResponse.json(
        { error: `Tổng số file vượt giới hạn ${totalCap} (hiện ${count})` },
        { status: 400 },
      );
    }
  }

  // 4. Audio inputs require at least one image or video (Seedance 2.0 ref).
  if (
    model.audiosKey &&
    Array.isArray(input[model.audiosKey]) &&
    (input[model.audiosKey] as string[]).length > 0
  ) {
    const hasVisual =
      (model.imagesKey && Array.isArray(input[model.imagesKey]) && (input[model.imagesKey] as string[]).length > 0) ||
      (model.videosKey && Array.isArray(input[model.videosKey]) && (input[model.videosKey] as string[]).length > 0);
    if (!hasVisual) {
      return NextResponse.json(
        { error: "Cần ít nhất 1 ảnh hoặc video khi gửi audio reference" },
        { status: 400 },
      );
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
    key = getFalKey();
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
