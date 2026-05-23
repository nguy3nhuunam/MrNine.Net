// LLM client for Story Writer.
// Default provider: Yunwu (gpt-5.5).
// Per-book override: user can plug a custom OpenAI-compatible endpoint.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { LlmConfig } from "@/lib/story-writer/store";

const DEFAULT_BASE_URL = "https://yunwu.ai/v1";
const DEFAULT_MODEL = "gpt-5.5";
// A faster fallback for short structured-JSON tasks where gpt-5.5's high
// latency causes Vercel function timeouts. Architect / Suggest / short tools
// pass `tier: "fast"` to opt into this. Probed with curl on 2026-05-23:
// gpt-3.5-turbo ≈ 6s for 200-token output, gpt-4o-mini ≈ 13s, gpt-5.5 ≈ 40s.
const FAST_MODEL = "gpt-3.5-turbo";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CallOptions = {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
  /** Abort the upstream call after this many ms. Default 45s — keeps Vercel happy. */
  timeoutMs?: number;
  /**
   * Tier hint. "fast" => gpt-4o-mini on Yunwu (5-8s for ~1500 token output,
   * vs 30-45s for gpt-5.5). Used by structured-JSON agents (Architect,
   * Auditor, Reflector) where the schema matters more than prose nuance.
   * Custom-provider books always use the user-configured model verbatim.
   */
  tier?: "default" | "fast";
};

async function loadDefaultKey(): Promise<string> {
  if (process.env.YUNWU_API_KEY) return process.env.YUNWU_API_KEY;
  const secretsPath = join(process.cwd(), ".webai-inkos", ".inkos", "secrets.json");
  try {
    const raw = await readFile(secretsPath, "utf8");
    const secrets = JSON.parse(raw) as { services?: Record<string, { apiKey?: string }> };
    const key = secrets.services?.["custom:Yunwu ChatGPT"]?.apiKey;
    if (key) return key;
  } catch {
    // ignore
  }
  throw new Error("YUNWU_API_KEY chưa được cấu hình");
}

function effectiveConfig(book?: LlmConfig | null, tier?: "default" | "fast"): {
  baseUrl: string;
  model: string;
  apiKeyPromise: Promise<string>;
} {
  if (book?.provider === "custom" && book.apiKey && book.baseUrl && book.model) {
    return {
      baseUrl: book.baseUrl.replace(/\/+$/, ""),
      model: book.model,
      apiKeyPromise: Promise.resolve(book.apiKey),
    };
  }
  const fallback = tier === "fast" ? FAST_MODEL : DEFAULT_MODEL;
  return {
    baseUrl: DEFAULT_BASE_URL,
    model: book?.model && book.provider === "yunwu" ? book.model : fallback,
    apiKeyPromise: loadDefaultKey(),
  };
}

export async function callLlm(
  messages: ReadonlyArray<ChatMessage>,
  options: CallOptions = {},
  bookConfig?: LlmConfig | null,
): Promise<string> {
  const cfg = effectiveConfig(bookConfig, options.tier);
  const apiKey = await cfg.apiKeyPromise;

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2400,
    stream: false,
  };
  // NOTE: deliberately do NOT pass response_format=json_object even when the
  // caller asked for JSON. Some Yunwu/OpenAI-compatible providers stall on
  // that flag (response can take 60s+ even for small prompts). Instead we
  // ask for JSON in the system prompt and parse the text manually in
  // callLlmJson — that path is rock-solid and 2-4x faster on Yunwu.
  void options.responseFormat;

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 45_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if ((error as Error)?.name === "AbortError") {
      throw new Error(`LLM trả quá chậm (>${Math.round(timeoutMs / 1000)}s). Thử lại — provider có thể đang nghẽn.`);
    }
    throw error;
  }
  clearTimeout(timer);

  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`LLM trả không phải JSON (${response.status}): ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    const data = json as { error?: { message?: string } | string };
    const message =
      typeof data.error === "string"
        ? data.error
        : data.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`LLM trả lỗi: ${message}`);
  }

  const data = json as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("LLM trả về rỗng");
  }
  return content;
}

export async function callLlmJson<T>(
  messages: ReadonlyArray<ChatMessage>,
  options: CallOptions = {},
  bookConfig?: LlmConfig | null,
): Promise<T> {
  // We do NOT use response_format=json_object — see callLlm for the reason.
  // Instead we just nudge the model in the system prompt and parse the
  // returned text. The model usually wraps the JSON in a ```json fence,
  // so we strip that before parsing. As a last resort we look for the
  // first { ... } object in the body.
  const raw = await callLlm(messages, options, bookConfig);
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // ignore — try the second strategy below.
  }
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = stripped.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice) as T;
    } catch (error) {
      throw new Error(
        `LLM trả về JSON không hợp lệ: ${error instanceof Error ? error.message : "?"}\n${raw.slice(0, 240)}`,
      );
    }
  }
  throw new Error(`LLM không trả về JSON: ${raw.slice(0, 240)}`);
}

export type { ChatMessage };
