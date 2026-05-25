import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { safeJsonRoute } from "@/lib/safe-json-route";
import { SITE_KNOWLEDGE_PROMPT } from "@/lib/site-knowledge";
import { getSessionUserId } from "@/lib/user-state";
import { chargeCredits, refundCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const YUNWU_BASE_URL = "https://yunwu.ai/v1";
const YUNWU_MODEL = process.env.YUNWU_MODEL || "gpt-4.1-mini";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function loadYunwuApiKey() {
  if (process.env.YUNWU_API_KEY) {
    return process.env.YUNWU_API_KEY;
  }

  const secretsPath = join(process.cwd(), ".webai-inkos", ".inkos", "secrets.json");
  const raw = await readFile(secretsPath, "utf8");
  const secrets = JSON.parse(raw) as {
    services?: Record<string, { apiKey?: string }>;
  };

  return secrets.services?.["custom:Yunwu ChatGPT"]?.apiKey;
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((message) => {
      if (!message || typeof message !== "object") {
        return null;
      }

      const candidate = message as { role?: unknown; content?: unknown };
      const role = candidate.role;
      const content = typeof candidate.content === "string" ? candidate.content.trim() : "";

      if ((role === "user" || role === "assistant") && content) {
        return { role, content };
      }

      return null;
    })
    .filter((message): message is ChatMessage => Boolean(message))
    .slice(-12);
}

function extractAssistantText(json: unknown) {
  const response = json as {
    choices?: Array<{
      finish_reason?: string;
      message?: {
        content?: string | Array<{ text?: string; content?: string; type?: string }> | null;
        reasoning_content?: string | null;
        refusal?: string | null;
      };
    }>;
  };
  const choice = response.choices?.[0];
  const message = choice?.message;
  const content = message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => part.text || part.content || "")
      .join("")
      .trim();
    if (joined) return joined;
  }

  // Some providers (DeepSeek-R1, gpt-5 reasoning variants on Yunwu) put the
  // visible answer in reasoning_content when content is empty.
  if (typeof message?.reasoning_content === "string" && message.reasoning_content.trim()) {
    return message.reasoning_content.trim();
  }

  if (typeof message?.refusal === "string" && message.refusal.trim()) {
    return message.refusal.trim();
  }

  return "";
}

function extractFinishReason(json: unknown) {
  const response = json as { choices?: Array<{ finish_reason?: string }> };
  return response.choices?.[0]?.finish_reason ?? "unknown";
}

async function _handler_POST(request: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const messages = normalizeMessages((body as { messages?: unknown } | null)?.messages);

  if (messages.length === 0) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const userId = await getSessionUserId();
  let charge = 0;
  if (userId) {
    const result = await chargeCredits(userId, "ask-anything");
    if (!result.ok) {
      if (result.reason === "insufficient") {
        return NextResponse.json(
          { error: "Hết credits chu kỳ này. Hãy đợi reset hoặc dùng coupon." },
          { status: 402 },
        );
      }
    } else {
      charge = result.charged;
    }
  }

  const apiKey = await loadYunwuApiKey().catch(() => undefined);

  if (!apiKey) {
    if (userId && charge > 0) await refundCredits(userId, charge);
    return NextResponse.json({ error: "Yunwu API key is not configured." }, { status: 500 });
  }

  const response = await fetch(`${YUNWU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: YUNWU_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Bạn là MrNine, trợ lý AI điều phối của mrnine.net. Trả lời ngắn gọn, đúng trọng tâm. Match ngôn ngữ user.\n\n" +
            "Khi user yêu cầu một việc khớp với một module có sẵn (tạo ảnh/video, sửa ảnh, tóm tắt, dịch tài liệu, viết truyện, lập lá số, tarot, thần số), hãy:\n" +
            "1. Trả lời tự nhiên 1-2 câu xác nhận sẽ làm gì.\n" +
            "2. Cuối câu trả lời thêm khối JSON action gói trong marker chính xác:\n" +
            "<<ACTION>>{\"type\":\"navigate\",\"label\":\"Mở Photo Fix\",\"href\":\"/photo-fix\",\"reason\":\"Xoá nền ảnh dùng Photo Fix\"}<<END>>\n\n" +
            "Loại action hỗ trợ:\n" +
            "- navigate: { type, label, href, reason } — đưa user đến route phù hợp.\n" +
            "  Ví dụ href: /ai-playground?capability=text-to-image&model=flux-2-pro , /photo-fix , /smart-recap , /docsense , /story-writer , /mystic-deck , /voice-studio , /video-studio , /markets.\n" +
            "- compose: { type, label, steps:[{label,href}], reason } — workflow nhiều bước.\n\n" +
            "Chỉ phát ACTION khi user thực sự muốn LÀM (ví dụ 'tạo ảnh sunset', 'tóm tắt video này', 'xem giá vàng/bitcoin'). Đừng phát khi user chỉ hỏi nói chuyện thông thường hoặc chỉ hỏi cách dùng. Một câu trả lời tối đa một ACTION.\n\n" +
            "Khi user hỏi về tính năng/cách dùng/module/model của trang, dùng kiến thức website cung cấp dưới đây thay vì đoán.\n\n" +
            SITE_KNOWLEDGE_PROMPT,
        },
        ...messages,
      ],
      max_tokens: 4096,
      max_completion_tokens: 4096,
      temperature: 0.7,
      stream: false,
    }),
  });

  const json = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));

  if (!response.ok) {
    if (userId && charge > 0) await refundCredits(userId, charge);
    return NextResponse.json(
      { error: "Yunwu API request failed.", detail: json },
      { status: response.status },
    );
  }

  const text = extractAssistantText(json);
  const finishReason = extractFinishReason(json);

  if (!text) {
    if (userId && charge > 0) await refundCredits(userId, charge);
    // Log raw response so the next failure has a paper trail in server logs.
    try {
      console.error("[ask-anything] empty content from Yunwu:", JSON.stringify(json).slice(0, 1500));
    } catch {
      // ignore
    }
    const message =
      finishReason === "length"
        ? "Model bị cắt do quá dài. Hãy thử câu hỏi ngắn hơn."
        : finishReason === "content_filter"
        ? "Câu trả lời bị bộ lọc nội dung chặn. Hãy thử cách diễn đạt khác."
        : "Model returned an empty response.";
    return NextResponse.json({ error: message, finishReason, model: YUNWU_MODEL }, { status: 502 });
  }

  // Parse the optional action marker so the client doesn't have to.
  const match = text.match(/<<ACTION>>([\s\S]*?)<<END>>/);
  let action: unknown = null;
  let cleaned = text;
  if (match) {
    cleaned = text.replace(match[0], "").trim();
    try {
      action = JSON.parse(match[1].trim());
    } catch {
      action = null;
    }
  }

  return NextResponse.json({ message: cleaned, model: YUNWU_MODEL, action });
}

export const POST = safeJsonRoute(_handler_POST);
