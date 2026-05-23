import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const YUNWU_BASE_URL = "https://yunwu.ai/v1";
const YUNWU_VISION_MODEL = "gpt-5.5";
const MAX_INPUT_CHARS = 40_000;

const TARGET_LANGUAGES: Record<string, { en: string; vi: string }> = {
  vi: { en: "Vietnamese", vi: "Tiếng Việt" },
  en: { en: "English", vi: "Tiếng Anh" },
  zh: { en: "Simplified Chinese", vi: "Tiếng Trung giản thể" },
  ja: { en: "Japanese", vi: "Tiếng Nhật" },
  ko: { en: "Korean", vi: "Tiếng Hàn" },
  fr: { en: "French", vi: "Tiếng Pháp" },
  de: { en: "German", vi: "Tiếng Đức" },
  es: { en: "Spanish", vi: "Tiếng Tây Ban Nha" },
  th: { en: "Thai", vi: "Tiếng Thái" },
  id: { en: "Indonesian", vi: "Tiếng Indonesia" },
};

async function loadYunwuApiKey() {
  if (process.env.YUNWU_API_KEY) return process.env.YUNWU_API_KEY;
  const secretsPath = join(process.cwd(), ".webai-inkos", ".inkos", "secrets.json");
  const raw = await readFile(secretsPath, "utf8");
  const secrets = JSON.parse(raw) as { services?: Record<string, { apiKey?: string }> };
  return secrets.services?.["custom:Yunwu ChatGPT"]?.apiKey;
}

function clip(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return `${text.slice(0, MAX_INPUT_CHARS)}\n\n[truncated]`;
}

async function callChat(apiKey: string, messages: unknown[], temperature = 0.2, maxTokens = 1800) {
  const response = await fetch(`${YUNWU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: YUNWU_VISION_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: text };
  }
  if (!response.ok) {
    throw new Error(
      `LLM trả lỗi (${response.status}): ${
        typeof (json as { error?: { message?: string } })?.error === "string"
          ? (json as { error: string }).error
          : (json as { error?: { message?: string } })?.error?.message ?? text.slice(0, 200)
      }`,
    );
  }
  const data = json as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function _handler_POST(request: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  let body: { imageUrl?: string; text?: string; targetLang?: string; ui?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ" }, { status: 400 });
  }

  const imageUrl = (body.imageUrl ?? "").trim();
  const rawText = (body.text ?? "").trim();
  const targetLangCode = body.targetLang && TARGET_LANGUAGES[body.targetLang] ? body.targetLang : "vi";
  const ui = body.ui === "en" ? "en" : "vi";
  const targetLanguage = TARGET_LANGUAGES[targetLangCode];

  if (!imageUrl && !rawText) {
    return NextResponse.json({ error: "Cần ảnh hoặc văn bản đầu vào" }, { status: 400 });
  }

  const apiKey = await loadYunwuApiKey().catch(() => undefined);
  if (!apiKey) {
    return NextResponse.json({ error: "API key chưa được cấu hình" }, { status: 500 });
  }

  let extractedText = rawText;
  if (imageUrl) {
    const ocrSystem =
      ui === "en"
        ? "You are a precise OCR engine. Extract every visible text from the image, preserving line breaks, columns, bullet points, and tables. Output raw text only — no commentary, no Markdown fences."
        : "Bạn là engine OCR chính xác. Trích xuất toàn bộ chữ trong ảnh, giữ nguyên xuống dòng, cột, bullet và bảng. Chỉ trả về text gốc — không bình luận, không Markdown code fence.";

    try {
      extractedText = await callChat(
        apiKey,
        [
          { role: "system", content: ocrSystem },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  ui === "en"
                    ? "Read every word in this image and return them as plain text."
                    : "Đọc toàn bộ chữ trong ảnh và trả về dưới dạng text thuần.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        0.0,
        2400,
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "OCR thất bại" },
        { status: 502 },
      );
    }

    if (!extractedText) {
      return NextResponse.json({ error: "Không trích xuất được text từ ảnh" }, { status: 422 });
    }
  }

  const clipped = clip(extractedText);

  const translateSystem =
    ui === "en"
      ? `You are a professional translator. Translate the user's text into ${targetLanguage.en}. Preserve original line breaks, lists, and tables. Keep proper nouns. Do not add commentary.`
      : `Bạn là một biên dịch viên chuyên nghiệp. Dịch văn bản của người dùng sang ${targetLanguage.vi}. Giữ nguyên xuống dòng, danh sách và bảng. Giữ danh từ riêng. Không bình luận thêm.`;

  let translation = "";
  try {
    translation = await callChat(
      apiKey,
      [
        { role: "system", content: translateSystem },
        { role: "user", content: clipped },
      ],
      0.2,
      2400,
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dịch thất bại" },
      { status: 502 },
    );
  }

  if (!translation) {
    return NextResponse.json({ error: "Bản dịch rỗng" }, { status: 502 });
  }

  return NextResponse.json({
    extracted: extractedText,
    translation,
    targetLang: targetLangCode,
    truncated: extractedText.length > MAX_INPUT_CHARS,
  });
}

export const POST = safeJsonRoute(_handler_POST);
