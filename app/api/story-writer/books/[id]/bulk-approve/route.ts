import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, chaptersCol, toId, type SwBook } from "@/lib/story-writer/store";
import {
  runComposer,
  runReflector,
  runReviser,
  runWriter,
  detectAiTellHeuristic,
} from "@/lib/story-writer/agents";
import {
  applyTruthDelta,
  countWords,
  loadBookForUser,
  loadRecentSummaries,
  loadTruthMap,
} from "@/lib/story-writer/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const bookId = toId(id);
  const book = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const list = await (await chaptersCol())
    .find({ bookId, userId, status: { $in: ["drafted", "audited"] as const } })
    .sort({ number: 1 })
    .toArray();

  if (!list.length) return NextResponse.json({ ok: true, processed: 0, results: [] });

  const results: Array<{ chapterId: string; number: number; status: string; deltaApplied?: boolean; error?: string }> = [];

  for (const ch of list) {
    try {
      const draft = ch.draft || "";
      if (!draft) {
        results.push({ chapterId: String(ch._id), number: ch.number, status: "skipped" });
        continue;
      }
      const truth = await loadTruthMap(bookId, userId);
      const recent = await loadRecentSummaries(bookId, userId, ch.number);
      const composed = runComposer({ book: book as SwBook, chapterNumber: ch.number, truth, recentSummaries: recent });
      const delta = await runReflector({
        book: book as SwBook,
        chapterNumber: ch.number,
        finalText: draft,
        composed,
      });
      await applyTruthDelta(bookId, userId, delta);
      await (await chaptersCol()).updateOne(
        { _id: ch._id, userId },
        {
          $set: {
            finalText: draft,
            status: "approved",
            wordCount: countWords(draft),
            updatedAt: new Date(),
          },
        },
      );
      results.push({ chapterId: String(ch._id), number: ch.number, status: "approved", deltaApplied: true });
    } catch (error) {
      results.push({
        chapterId: String(ch._id),
        number: ch.number,
        status: "error",
        error: error instanceof Error ? error.message : "?",
      });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
  void runWriter;
  void runReviser;
  void detectAiTellHeuristic;
}
