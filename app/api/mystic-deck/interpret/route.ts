import { NextResponse } from "next/server";
import { guardedRoute, type GuardContext } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const YUNWU_BASE_URL = "https://yunwu.ai/v1";
const YUNWU_MODEL = "gpt-5.5";

type Kind = "ziwei" | "tarot" | "numerology";

async function loadYunwuApiKey() {
  return process.env.YUNWU_API_KEY;
}

function buildSystemPrompt(kind: Kind, language: string): string {
  const lang = language === "en" ? "tiếng Anh" : "tiếng Việt";
  const baseTone = `Bạn là một chuyên gia luận giải huyền học tại MrNine. Trả lời bằng ${lang}, văn phong điềm tĩnh, có cấu trúc rõ ràng, không mê tín cực đoan, ưu tiên lời khuyên thực tế.`;

  if (kind === "ziwei") {
    return `${baseTone}

Bạn nhận một lá số Tử Vi Đẩu Số (Zi Wei Dou Shu) gồm thông tin sinh, mệnh/thân/cục, và 12 cung với sao chính, sao phụ, sao tạp, độ sáng, tứ hoá, đại hạn.

Yêu cầu output (markdown ngắn gọn, mỗi mục 2-4 câu):
1. **Tổng quan** — phong cách, tinh thần chủ đạo của lá số.
2. **Cung Mệnh** — sao chính + ý nghĩa cốt lõi.
3. **Cung Thân** — bổ trợ ra sao.
4. **Sự nghiệp & Tài bạch** — đọc cung Quan Lộc và Tài Bạch.
5. **Tình duyên & Phu Thê** — đọc cung Phu Thê + Phúc Đức.
6. **Sức khoẻ & Cảnh báo** — cung Tật Ách + tứ hoá xấu nếu có.
7. **Đại vận hiện tại** — đại hạn đang chạy nói gì, dùng tuổi user nếu suy ra được.
8. **Lời khuyên** — 3 gạch đầu dòng hành động cụ thể.

Không bịa thêm sao không có trong dữ liệu. Nếu thông tin thiếu, ghi rõ "không đủ dữ liệu".`;
  }

  if (kind === "tarot") {
    return `${baseTone}

Bạn nhận một trải bài 3 lá Past / Present / Future với tên lá, hướng (xuôi/ngược) và ý nghĩa cốt lõi.

Yêu cầu output (markdown):
1. **Quá khứ** — đọc lá đầu trong context "điều đã định hình hiện tại". 2-3 câu.
2. **Hiện tại** — đọc lá thứ hai, nêu vấn đề / cơ hội đang xảy ra. 2-3 câu.
3. **Tương lai** — đọc lá thứ ba như xu hướng, không phải định mệnh. 2-3 câu.
4. **Câu chuyện chung** — gắn 3 lá thành một mạch (1 đoạn).
5. **Lời khuyên** — 3 gạch đầu dòng hành động trong 30 ngày tới.

Tôn trọng hướng (reversed thì đọc theo nghĩa ngược).`;
  }

  return `${baseTone}

Bạn nhận một bộ chỉ số thần số học Pythagore: Life Path, Birthday, Expression, Soul Urge, Personality. Có thể có master numbers (11, 22, 33).

Yêu cầu output (markdown):
1. **Đường đời (Life Path)** — bản chất con đường. 2-3 câu.
2. **Số sinh nhật** — món quà bẩm sinh. 1-2 câu.
3. **Biểu hiện** — cách thể hiện ra ngoài (nếu có). 1-2 câu.
4. **Linh hồn** — động lực sâu (nếu có). 1-2 câu.
5. **Nhân cách** — ấn tượng đầu (nếu có). 1-2 câu.
6. **Tổng hợp** — gắn các số thành một bức tranh.
7. **Lời khuyên** — 3 gạch đầu dòng hành động.

Bỏ qua mục nào thiếu dữ liệu.`;
}

function asKind(value: unknown): Kind | null {
  return value === "ziwei" || value === "tarot" || value === "numerology" ? value : null;
}

async function _handler_POST(request: Request, _ctx: GuardContext) {
  void _ctx;
  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    payload?: unknown;
    language?: unknown;
  } | null;

  const kind = asKind(body?.kind);
  if (!kind) {
    return NextResponse.json({ error: "Trường 'kind' phải là ziwei | tarot | numerology." }, { status: 400 });
  }
  if (!body?.payload) {
    return NextResponse.json({ error: "Thiếu payload dữ liệu để luận giải." }, { status: 400 });
  }

  const language = typeof body.language === "string" ? body.language : "vi";

  const apiKey = await loadYunwuApiKey().catch(() => undefined);
  if (!apiKey) {
    return NextResponse.json({ error: "Yunwu API key chưa cấu hình." }, { status: 500 });
  }

  const system = buildSystemPrompt(kind, language);
  const userContent = `Dữ liệu (JSON):\n\n\`\`\`json\n${JSON.stringify(body.payload, null, 2)}\n\`\`\`\n\nLuận giải theo cấu trúc đã yêu cầu.`;

  const response = await fetch(`${YUNWU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: YUNWU_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature: 0.6,
      max_tokens: 1600,
      stream: false,
    }),
  });

  const json = (await response.json().catch(async () => ({ error: await response.text().catch(() => "") }))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: unknown;
  };

  if (!response.ok) {
    return NextResponse.json({ error: "Yunwu API thất bại.", detail: json }, { status: response.status });
  }

  const content = json.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "Mô hình trả về kết quả rỗng." }, { status: 502 });
  }

  return NextResponse.json({ reading: content, model: YUNWU_MODEL });
}

export const POST = guardedRoute(
  { route: "mystic-interpret", requireUser: true, charge: "mystic-interpret" },
  _handler_POST,
);
