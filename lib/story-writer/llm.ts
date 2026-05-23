// LLM client for Story Writer.
// Default provider: Yunwu (gpt-5.5).
// Per-book override: user can plug a custom OpenAI-compatible endpoint.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { LlmConfig } from "@/lib/story-writer/store";

const DEFAULT_BASE_URL = "https://yunwu.ai/v1";
const DEFAULT_MODEL = "gpt-5.5";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CallOptions = {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
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

function effectiveConfig(book?: LlmConfig | null): {
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
  return {
    baseUrl: DEFAULT_BASE_URL,
    model: book?.model && book.provider === "yunwu" ? book.model : DEFAULT_MODEL,
    apiKeyPromise: loadDefaultKey(),
  };
}

export async function callLlm(
  messages: ReadonlyArray<ChatMessage>,
  options: CallOptions = {},
  bookConfig?: LlmConfig | null,
): Promise<string> {
  const cfg = effectiveConfig(bookConfig);
  const apiKey = await cfg.apiKeyPromise;

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2400,
    stream: false,
  };
  if (options.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`LLM trả lỗi (${response.status}): ${text.slice(0, 200)}`);
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
  const raw = await callLlm(
    messages,
    { ...options, responseFormat: "json_object" },
    bookConfig,
  );
  // Strip markdown code fence if model adds one despite json_object.
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch (error) {
    throw new Error(
      `LLM trả về JSON không hợp lệ: ${error instanceof Error ? error.message : "?"}\n${raw.slice(0, 240)}`,
    );
  }
}

export type { ChatMessage };
