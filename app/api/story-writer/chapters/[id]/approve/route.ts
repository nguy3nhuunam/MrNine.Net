import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runComposer, runReflector } from "@/lib/story-writer/agents";
import { applyTruthDelta, countWords, loadBookForUser, loadRecentSummaries, loadTruthMap } from "@/lib/story-writer/pipeline";
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

  const draft = ch.draft ?? "";
  if (!draft) return NextResponse.json({ error: "Chưa có bản nháp" }, { status: 412 });

  const truth = await loadTruthMap(ch.bookId, userId);
  const recent = await loadRecentSummaries(ch.bookId, userId, ch.number);
  const composed = runComposer({ book, chapterNumber: ch.number, truth, recentSummaries: recent });

  try {
    const delta = await runReflector({ book, chapterNumber: ch.number, finalText: draft, composed });
    await applyTruthDelta(ch.bookId, userId, delta);
    await chapters.updateOne(
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
    return NextResponse.json({ ok: true, delta });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reflector thất bại" },
      { status: 502 },
    );
  }
}
