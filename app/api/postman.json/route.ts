/**
 * GET /api/postman.json — generate Postman v2.1 collection từ gateway OpenAPI.
 *
 * Đọc spec từ GATEWAY_OPENAPI_URL, convert paths × methods → Postman items.
 * Cache 1h.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const GATEWAY_OPENAPI_URL =
  process.env.GATEWAY_OPENAPI_URL ?? "https://api.mrnine.net/_openapi.json";
const GATEWAY_BASE = process.env.GATEWAY_BASE_URL ?? "https://api.mrnine.net";

type OpenAPIOp = {
  summary?: string;
  description?: string;
  requestBody?: { content?: Record<string, { example?: unknown }> };
};

type OpenAPI = {
  paths?: Record<string, Record<string, OpenAPIOp>>;
};

export async function GET() {
  let spec: OpenAPI | null = null;
  try {
    const res = await fetch(GATEWAY_OPENAPI_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) spec = (await res.json()) as OpenAPI;
  } catch {
    // ignore
  }

  const url = new URL(GATEWAY_BASE);
  const items: unknown[] = [];

  if (spec?.paths) {
    for (const [path, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        const upper = method.toUpperCase();
        if (!["GET", "POST", "DELETE", "PATCH", "PUT"].includes(upper)) continue;

        const segments = path.split("/").filter(Boolean);
        const exampleBody =
          (op.requestBody?.content?.["application/json"]?.example as object | undefined) ?? null;

        items.push({
          name: `${upper} ${path}`,
          request: {
            method: upper,
            header: [
              { key: "Authorization", value: "Bearer {{API_KEY}}" },
              ...(upper === "GET" ? [] : [{ key: "Content-Type", value: "application/json" }]),
            ],
            url: {
              raw: `{{BASE_URL}}${path}`,
              host: ["{{BASE_URL}}"],
              path: segments,
            },
            ...(upper !== "GET"
              ? {
                  body: {
                    mode: "raw",
                    raw: JSON.stringify(exampleBody ?? {}, null, 2),
                    options: { raw: { language: "json" } },
                  },
                }
              : {}),
            description: op.summary || op.description || "",
          },
          response: [],
        });
      }
    }
  }

  // Fallback nếu OpenAPI fetch fail.
  if (items.length === 0) {
    items.push({
      name: "POST /v1/chat/completions",
      request: {
        method: "POST",
        header: [
          { key: "Authorization", value: "Bearer {{API_KEY}}" },
          { key: "Content-Type", value: "application/json" },
        ],
        url: { raw: `{{BASE_URL}}/v1/chat/completions`, host: ["{{BASE_URL}}"], path: ["v1", "chat", "completions"] },
        body: {
          mode: "raw",
          raw: JSON.stringify(
            {
              model: "gpt-5.4",
              messages: [{ role: "user", content: "Hello" }],
            },
            null,
            2,
          ),
          options: { raw: { language: "json" } },
        },
      },
      response: [],
    });
  }

  const collection = {
    info: {
      name: "MrNine Gateway",
      description: `OpenAI-compatible API gateway tại ${url.origin}.\n\nThiết lập variables \`API_KEY\` (sk-mrnine-...) và \`BASE_URL\` (${url.origin}) trước khi chạy.`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      { key: "BASE_URL", value: url.origin, type: "string" },
      { key: "API_KEY", value: "sk-mrnine-replace-me", type: "string" },
    ],
    item: items,
  };

  return new NextResponse(JSON.stringify(collection, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mrnine.postman_collection.json"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
