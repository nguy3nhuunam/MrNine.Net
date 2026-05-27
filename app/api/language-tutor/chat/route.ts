import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { chargeCredits, refundCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const YUNWU_BASE_URL = "https://yunwu.ai/v1";
const YUNWU_MODEL = process.env.YUNWU_MODEL || "gpt-4.1-mini";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const LANGUAGES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  zh: "Mandarin Chinese",
  ko: "Korean",
  fr: "French",
  es: "Spanish",
  de: "German",
};

const LEVELS: Record<string, string> = {
  beginner: "A1-A2 (beginner) — short sentences, common vocabulary, slow pace",
  intermediate: "B1-B2 (intermediate) — natural pace, idiomatic phrases when useful",
  advanced: "C1-C2 (advanced) — sophisticated vocabulary, nuance, native-like register",
};

function buildSystemPrompt(targetLang: string, level: string): string {
  const lang = LANGUAGES[targetLang] ?? "English";
  const lvl = LEVELS[level] ?? LEVELS.intermediate;
  return `You are MrNine Language Tutor, a patient bilingual coach helping a Vietnamese learner study ${lang} at ${lvl}.

For EVERY user message, respond with JSON only (no markdown fences) in this shape:
{
  "correction": {
    "hasError": boolean,
    "originalText": "what the user wrote, verbatim",
    "fixedText": "the corrected version in ${lang} — empty string if no error",
    "explanationVi": "1–3 sentences in Vietnamese explaining the mistake and the fix; empty if no error"
  },
  "reply": "your conversational reply in ${lang}, written at ${lvl}",
  "replyTranslationVi": "Vietnamese translation of your reply",
  "vocab": [
    { "term": "key word/phrase from your reply", "ipa": "IPA or pinyin/romaji if relevant, else empty", "vi": "Vietnamese meaning" }
  ]
}

Rules:
- Always check the user's message for grammar, vocabulary, or naturalness issues. If the user wrote in Vietnamese, treat it as a translation request and gently encourage them to try in ${lang} next time, while still providing a model sentence.
- Keep "reply" to 1–3 sentences so the learner doesn't get overwhelmed.
- Pick 2–4 vocab items from your reply that are most useful for the learner. Skip trivial words.
- Never output anything outside the JSON object.`;
}

export async function POST(request: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const apiKey = process.env.YUNWU_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI key chưa được cấu hình." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    messages?: unknown;
    targetLanguage?: string;
    level?: string;
  };

  const targetLanguage = typeof body.targetLanguage === "string" && LANGUAGES[body.targetLanguage] ? body.targetLanguage : "en";
  const level = typeof body.level === "string" && LEVELS[body.level] ? body.level : "intermediate";

  const history: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
        .map((m) => {
          if (!m || typeof m !== "object") return null;
          const c = m as { role?: unknown; content?: unknown };
          const content = typeof c.content === "string" ? c.content.trim() : "";
          if ((c.role === "user" || c.role === "assistant") && content) return { role: c.role, content };
          return null;
        })
        .filter((m): m is ChatMessage => Boolean(m))
        .slice(-10)
    : [];

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Tin nhắn không hợp lệ." }, { status: 400 });
  }

  const userId = await getSessionUserId();
  let charged = 0;
  if (userId) {
    const result = await chargeCredits(userId, "language-tutor");
    if (!result.ok) {
      return NextResponse.json({ error: "Hết credit hôm nay. Thử lại sau." }, { status: 402 });
    }
    charged = result.charged;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(targetLanguage, level) },
    ...history,
  ];

  try {
    const response = await fetch(`${YUNWU_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: YUNWU_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 900,
        stream: false,
      }),
      signal: AbortSignal.timeout(50_000),
    });

    const text = await response.text();
    if (!response.ok) {
      if (userId && charged > 0) await refundCredits(userId, charged);
      return NextResponse.json(
        { error: `LLM trả lỗi (${response.status}).`, detail: text.slice(0, 400) },
        { status: 502 },
      );
    }

    const json = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      if (userId && charged > 0) await refundCredits(userId, charged);
      return NextResponse.json({ error: "LLM trả về rỗng." }, { status: 502 });
    }

    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      const first = stripped.indexOf("{");
      const last = stripped.lastIndexOf("}");
      if (first !== -1 && last > first) {
        try {
          parsed = JSON.parse(stripped.slice(first, last + 1));
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed !== "object") {
      if (userId && charged > 0) await refundCredits(userId, charged);
      return NextResponse.json({ error: "LLM trả không phải JSON.", raw: raw.slice(0, 240) }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (userId && charged > 0) await refundCredits(userId, charged);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tutor unreachable" },
      { status: 503 },
    );
  }
}
