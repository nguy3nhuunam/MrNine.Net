import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const YUNWU_BASE_URL = "https://yunwu.ai/v1";
const YUNWU_MODEL = "gpt-5.5";
const MAX_INPUT_CHARS = 40_000;
const MAX_FETCH_BYTES = 8 * 1024 * 1024;

async function loadYunwuApiKey() {
  if (process.env.YUNWU_API_KEY) return process.env.YUNWU_API_KEY;
  const secretsPath = join(process.cwd(), ".webai-inkos", ".inkos", "secrets.json");
  const raw = await readFile(secretsPath, "utf8");
  const secrets = JSON.parse(raw) as { services?: Record<string, { apiKey?: string }> };
  return secrets.services?.["custom:Yunwu ChatGPT"]?.apiKey;
}

function getYouTubeId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1) || null;
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] ?? null;
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

async function fetchYouTubeTranscript(videoId: string): Promise<{ text: string; lang?: string; title?: string }> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const watchRes = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 MrNine/1.0",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    },
  });
  if (!watchRes.ok) {
    throw new Error(`Không tải được trang YouTube (${watchRes.status})`);
  }
  const html = await watchRes.text();
  const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
  const title = titleMatch ? decodeHtml(titleMatch[1]) : undefined;

  const captionsMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!captionsMatch) {
    throw new Error("Video này không có phụ đề khả dụng");
  }
  let tracks: Array<{ baseUrl?: string; languageCode?: string; kind?: string }> = [];
  try {
    tracks = JSON.parse(captionsMatch[1]);
  } catch {
    throw new Error("Không đọc được danh sách phụ đề");
  }
  if (!tracks.length) throw new Error("Video này không có phụ đề khả dụng");
  const preferred =
    tracks.find((track) => track.languageCode === "vi") ||
    tracks.find((track) => track.languageCode === "en") ||
    tracks[0];
  if (!preferred?.baseUrl) throw new Error("Không tìm thấy track phụ đề hợp lệ");

  const xmlRes = await fetch(preferred.baseUrl);
  if (!xmlRes.ok) throw new Error(`Tải phụ đề thất bại (${xmlRes.status})`);
  const xml = await xmlRes.text();
  const parts = Array.from(xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g));
  const text = parts
    .map(([, inner]) => decodeHtml(inner.replace(/<[^>]+>/g, "")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) throw new Error("Phụ đề rỗng");
  return { text, lang: preferred.languageCode, title };
}

async function fetchPageText(url: string): Promise<{ text: string; title?: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MrNineRecap/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Không tải được URL (${res.status})`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("URL không trả về nội dung");
  let received = 0;
  const chunks: Uint8Array[] = [];
  while (received < MAX_FETCH_BYTES) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
  }
  await reader.cancel().catch(() => undefined);
  const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const html = buffer.toString("utf8");
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtml(titleMatch[1]).trim() : undefined;
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const text = decodeHtml(stripped).replace(/\s+/g, " ").trim();
  if (!text) throw new Error("URL không có nội dung văn bản");
  return { text, title };
}

function clip(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return `${text.slice(0, MAX_INPUT_CHARS)}\n\n[truncated]`;
}

async function _handler_POST(request: Request) {
  const blocked = await requireAuth();
  if (blocked) return blocked;

  let body: { input?: string; mode?: string; language?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ" }, { status: 400 });
  }
  const input = (body.input ?? "").trim();
  if (!input) {
    return NextResponse.json({ error: "Cần nhập nội dung hoặc URL" }, { status: 400 });
  }
  const language = body.language === "en" ? "en" : "vi";

  let sourceText = input;
  let sourceLabel = "text";
  let sourceTitle: string | undefined;

  // Detect URL vs raw text
  const looksLikeUrl = /^https?:\/\//i.test(input) && input.split(/\s/).length === 1;
  if (looksLikeUrl) {
    try {
      const youtubeId = getYouTubeId(input);
      if (youtubeId) {
        const transcript = await fetchYouTubeTranscript(youtubeId);
        sourceText = transcript.text;
        sourceLabel = "youtube";
        sourceTitle = transcript.title;
      } else {
        const page = await fetchPageText(input);
        sourceText = page.text;
        sourceLabel = "url";
        sourceTitle = page.title;
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Không lấy được nội dung từ URL" },
        { status: 422 },
      );
    }
  }

  if (!sourceText) {
    return NextResponse.json({ error: "Nội dung trống" }, { status: 400 });
  }

  const apiKey = await loadYunwuApiKey().catch(() => undefined);
  if (!apiKey) {
    return NextResponse.json({ error: "API key chưa được cấu hình" }, { status: 500 });
  }

  const systemPrompt =
    language === "en"
      ? "You are a meticulous content summarizer. Always respond in English using clean Markdown."
      : "Bạn là trợ lý tóm tắt nội dung tỉ mỉ. Luôn trả lời bằng tiếng Việt, dùng Markdown sạch.";
  const userPrompt = `Hãy tóm tắt nội dung sau thành Markdown gồm 4 phần đúng theo định dạng:
## TL;DR
1-2 câu tóm tắt cô đọng nhất.

## Điểm chính
- 5–7 bullet, mỗi bullet 1 câu
- Giữ con số / dữ kiện gốc nếu có

## Trích dẫn / dữ kiện đáng nhớ
- Tối đa 5 trích dẫn ngắn (đặt trong dấu ngoặc kép)

## Việc cần làm
- Action item rõ ràng, bắt đầu bằng động từ. Bỏ qua phần này nếu nội dung không có hành động.

Nội dung:
"""
${clip(sourceText)}
"""`;

  const response = await fetch(`${YUNWU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: YUNWU_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1600,
      stream: false,
    }),
  });

  const json = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
  if (!response.ok) {
    return NextResponse.json({ error: "LLM trả lỗi", detail: json }, { status: response.status });
  }
  const data = json as { choices?: Array<{ message?: { content?: string } }> };
  const summary = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!summary) {
    return NextResponse.json({ error: "Model trả về rỗng" }, { status: 502 });
  }

  return NextResponse.json({
    summary,
    sourceLabel,
    sourceTitle,
    sourceLength: sourceText.length,
    truncated: sourceText.length > MAX_INPUT_CHARS,
  });
}

export const POST = safeJsonRoute(_handler_POST);
