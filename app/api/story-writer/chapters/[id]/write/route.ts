import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runComposer, runWriter } from "@/lib/story-writer/agents";
import { countWords, loadBookForUser, loadRecentSummaries, loadTruthMap } from "@/lib/story-writer/pipeline";
import { chaptersCol, toId } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const chapters = await chaptersCol();
  const ch = await chapters.findOne({ _id: toId(id), userId });
  if (!ch) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  const book = await loadBookForUser(ch.bookId, userId);
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  if (!ch.intent) {
    return NextResponse.json({ error: "Cần chạy Plan trước khi viết" }, { status: 412 });
  }

  // Always recompose so the writer sees the latest truth state.
  const truth = await loadTruthMap(ch.bookId, userId);
  const recent = await loadRecentSummaries(ch.bookId, userId, ch.number);
  const composed = runComposer({ book, chapterNumber: ch.number, truth, recentSummaries: recent });

  try {
    const draft = await runWriter({ book, chapterNumber: ch.number, intent: ch.intent, composed });
    const wordCount = countWords(draft);
    const titleMatch = draft.match(/^##\s*[Cc]hương\s*\d+\s*[:.\-]\s*(.+)$/m);
    const newTitle = titleMatch ? titleMatch[1].trim().slice(0, 200) : ch.title;

    const snapshots = ch.snapshots ?? [];
    snapshots.unshift({ at: new Date(), text: draft, label: "writer-draft" });

    await chapters.updateOne(
      { _id: ch._id, userId },
      {
        $set: {
          draft,
          context: composed.selected,
          ruleStack: composed.ruleStack,
          trace: composed.trace,
          status: "drafted",
          title: newTitle,
          wordCount,
          snapshots: snapshots.slice(0, 12),
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({ draft, wordCount, title: newTitle });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Writer thất bại" },
      { status: 502 },
    );
  }
}
