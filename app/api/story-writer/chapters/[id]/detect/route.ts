import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { detectAiTellHeuristic } from "@/lib/story-writer/agents";
import { callLlmJson, type ChatMessage } from "@/lib/story-writer/llm";
import { loadBookForUser } from "@/lib/story-writer/pipeline";
import { chaptersCol, toId } from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

type DetectReport = {
  rate: number; // 0-1, model-estimated overall AI-tell rate
  flagged: Array<{
    sentence: string;
    reason: string;
    severity: "low" | "medium" | "high";
  }>;
  recommendation: string;
};

async function _handler_POST(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const ch = await (await chaptersCol()).findOne({ _id: toId(id), userId });
  if (!ch) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  const text = ch.finalText || ch.draft || "";
  if (!text) return NextResponse.json({ error: "Chương chưa có nội dung" }, { status: 412 });

  const book = await loadBookForUser(ch.bookId, userId);
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const heuristic = detectAiTellHeuristic(text);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia dò văn AI. Đọc văn bản, đánh dấu các câu nghi là AI viết. Trả DUY NHẤT JSON. Tiếng Việt.",
    },
    {
      role: "user",
      content: `Văn bản (chương ${ch.number}):
${text.slice(0, 14000)}

Trả JSON:
{
  "rate": number (0-1, ước lượng tỉ lệ AI-tell tổng thể),
  "flagged": Array<{ "sentence": string (trích nguyên văn ≤220 ký tự), "reason": string (vì sao có vẻ AI), "severity": "low"|"medium"|"high" }>,
  "recommendation": string (gợi ý sửa, 80-200 chữ)
}

Tập trung vào: từ AI hay dùng (suy cho cùng, không thể phủ nhận, một cách khéo léo, đầy nghệ thuật, không hề ngạc nhiên, đáng kinh ngạc, đầy ấn tượng), câu công thức, lặp cấu trúc, cảm thán giả tạo, mô tả thiếu chi tiết giác quan. Bỏ qua văn tự nhiên.`,
    },
  ];

  try {
    const llm = await callLlmJson<DetectReport>(messages, { temperature: 0.2, maxTokens: 2400 }, book.llm ?? null);
    return NextResponse.json({
      heuristic,
      llm,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Detect thất bại", heuristic },
      { status: 502 },
    );
  }
}

export const POST = safeJsonRoute(_handler_POST);
