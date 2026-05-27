import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getSessionUserId } from "@/lib/user-state";
import { chargeCredits, refundCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const YUNWU_BASE_URL = "https://yunwu.ai/v1";
const YUNWU_MODEL = process.env.YUNWU_MODEL || "gpt-4.1-mini";

type GeneratedCard = {
  kind: "basic" | "cloze";
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
};

const SYSTEM_PROMPT = `You generate Anki-style flashcards from study material. Output ONLY a JSON object with this shape — no markdown fences:

{
  "cards": [
    {
      "kind": "basic" | "cloze",
      "front": "string",
      "back": "string (empty for cloze)",
      "hint": "optional string",
      "tags": ["optional", "tags"]
    }
  ]
}

Rules:
- For "basic" cards: front = clear question, back = concise answer (1-3 sentences max).
- For "cloze" cards: front uses Anki syntax {{c1::answer}} or {{c1::answer::hint}}. back must be empty string.
- Aim for 5-12 cards depending on density. Skip trivial details.
- One concept per card. Avoid yes/no questions.
- Match the language of the source material in your output.
- Use cloze for definitions, dates, key terms, formulas. Use basic for "explain why" questions.`;

export async function POST(request: NextRequest) {
  const blocked = await requireAuth();
  if (blocked) return blocked;
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "auth" }, { status: 401 });

  const apiKey = process.env.YUNWU_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI key chưa được cấu hình." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    instruction?: string;
  };
  const source = (body.source ?? "").trim();
  if (source.length < 12) {
    return NextResponse.json(
      { error: "Cần ít nhất 12 ký tự nội dung nguồn." },
      { status: 400 },
    );
  }
  if (source.length > 12_000) {
    return NextResponse.json({ error: "Nội dung quá dài (>12k)." }, { status: 400 });
  }

  const result = await chargeCredits(userId, "story-write");
  if (!result.ok) {
    return NextResponse.json({ error: "Hết credit. Thử lại sau." }, { status: 402 });
  }
  const charged = result.charged;

  const userPrompt = body.instruction
    ? `${body.instruction.trim()}\n\n---\n\nMaterial:\n${source}`
    : `Generate flashcards from this material:\n\n${source}`;

  try {
    const response = await fetch(`${YUNWU_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: YUNWU_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2400,
        stream: false,
      }),
      signal: AbortSignal.timeout(50_000),
    });
    const text = await response.text();
    if (!response.ok) {
      await refundCredits(userId, charged);
      return NextResponse.json(
        { error: `LLM trả lỗi (${response.status})`, detail: text.slice(0, 400) },
        { status: 502 },
      );
    }
    const json = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    let parsed: { cards?: GeneratedCard[] } | null = null;
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
    if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      await refundCredits(userId, charged);
      return NextResponse.json(
        { error: "AI không trả về cards hợp lệ.", raw: raw.slice(0, 240) },
        { status: 502 },
      );
    }

    const sanitized = parsed.cards
      .filter((c) => c && typeof c === "object" && typeof c.front === "string" && c.front.trim())
      .slice(0, 20)
      .map((c) => ({
        kind: c.kind === "cloze" ? "cloze" : "basic",
        front: c.front.trim(),
        back: typeof c.back === "string" ? c.back.trim() : "",
        hint: typeof c.hint === "string" ? c.hint.trim() : undefined,
        tags: Array.isArray(c.tags)
          ? c.tags.filter((t) => typeof t === "string").slice(0, 6)
          : [],
      }));

    return NextResponse.json({ cards: sanitized });
  } catch (error) {
    await refundCredits(userId, charged);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generate failed" },
      { status: 503 },
    );
  }
}
