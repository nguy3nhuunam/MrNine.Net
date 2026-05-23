import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  booksCol,
  chaptersCol,
  toId,
  TRUTH_KINDS,
  truthCol,
  type TruthKind,
} from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "Thiếu q" }, { status: 400 });
  if (q.length < 2) return NextResponse.json({ error: "Tối thiểu 2 ký tự" }, { status: 400 });

  const bookId = toId(id);
  const book = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const needle = q.toLowerCase();

  function locate(text: string, max = 6): Array<{ excerpt: string; offset: number }> {
    const matches: Array<{ excerpt: string; offset: number }> = [];
    if (!text) return matches;
    const lower = text.toLowerCase();
    let from = 0;
    while (matches.length < max) {
      const at = lower.indexOf(needle, from);
      if (at === -1) break;
      const start = Math.max(0, at - 60);
      const end = Math.min(text.length, at + needle.length + 60);
      matches.push({
        excerpt: `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`,
        offset: at,
      });
      from = at + needle.length;
    }
    return matches;
  }

  const meta: Array<{ field: string; matches: Array<{ excerpt: string }> }> = [];
  for (const field of ["storyBible", "bookRules", "volumeOutline", "authorIntent", "currentFocus", "brief"] as const) {
    const value = book[field];
    if (typeof value === "string" && value) {
      const m = locate(value);
      if (m.length) meta.push({ field, matches: m });
    }
  }

  const truthDocs = await (await truthCol()).find({ bookId, userId }).toArray();
  const truthHits: Array<{ kind: TruthKind; matches: Array<{ excerpt: string }> }> = [];
  for (const kind of TRUTH_KINDS) {
    const doc = truthDocs.find((t) => t.kind === kind);
    if (doc?.content) {
      const m = locate(doc.content);
      if (m.length) truthHits.push({ kind, matches: m });
    }
  }

  const chapters = await (await chaptersCol()).find({ bookId, userId }).sort({ number: 1 }).toArray();
  const chapterHits = chapters
    .map((ch) => {
      const text = ch.finalText || ch.draft || "";
      const m = locate(text);
      return m.length
        ? {
            chapterId: String(ch._id),
            number: ch.number,
            title: ch.title,
            status: ch.status,
            matches: m,
          }
        : null;
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  return NextResponse.json({
    query: q,
    meta,
    truth: truthHits,
    chapters: chapterHits,
    totalChapters: chapters.length,
  });
}
