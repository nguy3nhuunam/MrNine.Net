/**
 * @mrnine/sdk — typed wrapper cho MrNine gateway.
 *
 * Endpoint: https://api.mrnine.net/v1 (OpenAI-compatible)
 *
 * @example
 * ```ts
 * import { MrNine } from "@mrnine/sdk";
 *
 * const client = new MrNine({ apiKey: process.env.MRNINE_API_KEY! });
 *
 * // Chat completion (non-stream)
 * const res = await client.chat.completions.create({
 *   model: "gpt-5.4",
 *   messages: [{ role: "user", content: "hi" }],
 * });
 * console.log(res.choices[0]?.message?.content);
 *
 * // Stream
 * for await (const chunk of client.chat.completions.stream({
 *   model: "gpt-5.4",
 *   messages: [{ role: "user", content: "đếm từ 1 đến 5" }],
 * })) {
 *   process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
 * }
 *
 * // Account usage
 * const me = await client.usage.me();
 * console.log("Balance:", me.balance_usd);
 * ```
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  [extra: string]: unknown;
}

export interface ChatCompletionChoice {
  index: number;
  message: { role: "assistant"; content: string };
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { role?: ChatRole; content?: string };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface UsageMeResponse {
  balance_micro_usd: number;
  balance_usd: number;
  lifetime_topup_micro_usd: number;
  lifetime_spend_micro_usd: number;
  window: { from: string; to: string; days: number };
  usage_30d: {
    requests_total: number;
    requests_ok: number;
    requests_err: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
  limits: { rpm: number; tpm: number; daily_tokens: number };
}

export interface MrNineOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class MrNineError extends Error {
  status: number;
  type?: string;
  code?: string;
  constructor(status: number, message: string, type?: string, code?: string) {
    super(message);
    this.name = "MrNineError";
    this.status = status;
    this.type = type;
    this.code = code;
  }
}

export class MrNine {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: MrNineOptions) {
    if (!opts.apiKey) throw new Error("MrNine: apiKey required");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.mrnine.net").replace(/\/+$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private async parseError(res: Response): Promise<MrNineError> {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const err = (body as { error?: { message?: string; type?: string; code?: string } })?.error;
    return new MrNineError(
      res.status,
      err?.message ?? `HTTP ${res.status}`,
      err?.type,
      err?.code,
    );
  }

  readonly chat = {
    completions: {
      create: async (req: ChatCompletionRequest): Promise<ChatCompletionResponse> => {
        const res = await this.fetchImpl(`${this.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({ ...req, stream: false }),
        });
        if (!res.ok) throw await this.parseError(res);
        return (await res.json()) as ChatCompletionResponse;
      },
      stream: async function* (
        this: MrNine,
        req: ChatCompletionRequest,
      ): AsyncGenerator<ChatCompletionChunk, void, void> {
        const res = await this.fetchImpl(`${this.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({ ...req, stream: true }),
        });
        if (!res.ok) throw await this.parseError(res);
        if (!res.body) throw new MrNineError(500, "no response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const t = line.trim();
              if (!t || !t.startsWith("data:")) continue;
              const data = t.slice(5).trim();
              if (data === "[DONE]") return;
              try {
                yield JSON.parse(data) as ChatCompletionChunk;
              } catch {
                // skip malformed line
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      },
    },
  };

  /** Account info — balance + 30d usage. */
  readonly usage = {
    me: async (): Promise<UsageMeResponse> => {
      const res = await this.fetchImpl(`${this.baseUrl}/v1/usage/me`, {
        method: "GET",
        headers: this.headers(),
      });
      if (!res.ok) throw await this.parseError(res);
      return (await res.json()) as UsageMeResponse;
    },
  };

  /** Models list — public names. */
  async models(): Promise<{ id: string; object: "model"; created: number; owned_by: string }[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/models`, {
      method: "GET",
      headers: this.headers(),
    });
    if (!res.ok) throw await this.parseError(res);
    const body = (await res.json()) as {
      data: { id: string; object: "model"; created: number; owned_by: string }[];
    };
    return body.data;
  }
}

// Bind chat.completions.stream method correctly when destructured.
// (Generator functions referencing `this` need to be class methods; we attach above.)
