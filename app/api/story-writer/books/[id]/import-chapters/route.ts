import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { callLlmJson, type ChatMessage } from "@/lib/story-writer/llm";
import {
  applyTruthDelta,
  countWords,
  loadBookForUser,
  loadTruthMap,
} from "@/lib/story-writer/pipeline";
import { booksCol, chaptersCol, toId, type SwChapter } from "@/lib/story-writer/store";
import type { TruthDelta } from "@/lib/story-writer/agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const MAX_BODY = 200_000; // ~200k chars per request
const HEADER_RE = /^(?:第\s*[一二三四五六七八九十百千零\d]+\s*章|chương\s*\d+|Chương\s*\d+|CHƯƠNG\s*\d+)\b[^\n]*$/im;

function splitChapters(raw: string, customSplit?: string): Array<{ number: number; title: string; body: string }> {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const splitterRe = customSplit
    ? new RegExp(`^(?:${customSplit})[^\n]*$`, "gim")
    : /^(?:第\s*[一二三四五六七八九十百千零\d]+\s*章[^\n]*|Ch(?:ư|ư)?ơng\s*\d+[^\n]*|CHƯƠNG\s*\d+[^\n]*)$/gim;

  const parts: Array<{ headerLine: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = splitterRe.exec(text)) !== null) {
    parts.push({ headerLine: m[0], index: m.index });
  }
  if (!parts.length) {
    return [{ number: 1, title: "Chương 1", body: text.trim() }];
  }
  parts.push({ headerLine: "", index: text.length });

  const out: Array<{ number: number; title: string; body: string }> = [];
  for (let i = 0; i < parts.length - 1; i += 1) {
    const start = parts[i];
    const end = parts[i + 1];
    const block = text.slice(start.index, end.index).trim();
    if (!block) continue;
    const headerMatch = block.match(HEADER_RE);
    const headerText = headerMatch ? headerMatch[0] : `Chương ${i + 1}`;
    const numberMatch = headerText.match(/(\d+)/);
    const number = numberMatch ? Number.parseInt(numberMatch[1], 10) : i + 1;
    const titleMatch = headerText.match(/[:。.\-\s—]+(.*)$/);
    const title = (titleMatch?.[1] ?? "").trim() || `Chương ${number}`;
    const body = block.replace(HEADER_RE, "").trim();
    out.push({ number, title: title.slice(0, 200), body });
  }
  return out;
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: { text?: string; customSplit?: string; reflect?: boolean } = {};
  try {
    body = await request.json();
  } catch {}
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Cần văn bản" }, { status: 400 });
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: "Văn bản quá dài (>200k ký tự)" }, { status: 413 });
  }

  const bookId = toId(id);
  const book = await loadBookForUser(bookId, userId);
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const chunks = splitChapters(text, body.customSplit);
  if (!chunks.length) {
    return NextResponse.json({ error: "Không tìm thấy chương nào" }, { status: 400 });
  }

  const chapters = await chaptersCol();
  const now = new Date();

  const inserted: Array<{ id: string; number: number; title: string; words: number }> = [];
  for (const chunk of chunks) {
    const exist = await chapters.findOne({ bookId, userId, number: chunk.number });
    if (exist) continue;
    const doc: SwChapter = {
      bookId,
      userId,
      number: chunk.number,
      title: chunk.title,
      status: "approved",
      contextBrief: "",
      finalText: chunk.body,
      draft: chunk.body,
      wordCount: countWords(chunk.body),
      snapshots: [],
      createdAt: now,
      updatedAt: now,
    };
    const result = await chapters.insertOne(doc);
    inserted.push({
      id: String(result.insertedId),
      number: chunk.number,
      title: chunk.title,
      words: doc.wordCount ?? 0,
    });
  }

  // Reverse-engineer truth files from the imported corpus, capped to 14k chars
  // for the LLM. Skipped if reflect=false.
  if (body.reflect !== false) {
    try {
      const corpus = chunks
        .map((c) => `## Chương ${c.number}: ${c.title}\n${c.body}`)
        .join("\n\n")
        .slice(0, 14_000);
      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "Bạn là Reflector. Đọc nguyên loạt chương đã có sẵn, suy ra trạng thái thế giới, hooks, subplot, cảm xúc, ma trận nhân vật. Trả DUY NHẤT JSON. Toàn văn từng truth file mới (đã merge), bỏ field nào không có thay đổi. chapterSummaryAppend là tóm tắt toàn bộ corpus 400–600 chữ.",
        },
        { role: "user", content: `Truyện đã có:\n${corpus}` },
      ];
      const truthMap = await loadTruthMap(bookId, userId);
      const seedHints = `Hiện tại pending_hooks:\n${truthMap.pending_hooks?.content ?? "(trống)"}\nHiện tại current_state:\n${truthMap.current_state?.content ?? "(trống)"}`;
      messages.push({ role: "user", content: seedHints });
      const delta = await callLlmJson<TruthDelta>(messages, { temperature: 0.4, maxTokens: 4000 }, book.llm ?? null);
      await applyTruthDelta(bookId, userId, delta);
    } catch (error) {
      // Soft-fail — chapters are imported, only truth seeding failed.
      void error;
    }
  }

  await (await booksCol()).updateOne({ _id: bookId, userId }, { $set: { updatedAt: now } });

  return NextResponse.json({
    inserted,
    skipped: chunks.length - inserted.length,
  });
}
