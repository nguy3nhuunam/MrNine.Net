import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runComposer, runReviser } from "@/lib/story-writer/agents";
import { countWords, loadBookForUser, loadRecentSummaries, loadTruthMap } from "@/lib/story-writer/pipeline";
import { chaptersCol, toId } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: { mode?: "default" | "anti-detect" } = {};
  try {
    body = await request.json();
  } catch {}

  const chapters = await chaptersCol();
  const ch = await chapters.findOne({ _id: toId(id), userId });
  if (!ch) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  const book = await loadBookForUser(ch.bookId, userId);
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const draft = ch.draft ?? "";
  if (!draft) return NextResponse.json({ error: "Chưa có bản nháp để revise" }, { status: 412 });
  if (!ch.auditReport) return NextResponse.json({ error: "Cần chạy Audit trước" }, { status: 412 });

  const truth = await loadTruthMap(ch.bookId, userId);
  const recent = await loadRecentSummaries(ch.bookId, userId, ch.number);
  const composed = runComposer({ book, chapterNumber: ch.number, truth, recentSummaries: recent });

  try {
    const revised = await runReviser({
      book,
      chapterNumber: ch.number,
      draft,
      audit: ch.auditReport,
      composed,
      mode: body.mode === "anti-detect" ? "anti-detect" : "default",
    });
    const wordCount = countWords(revised);
    const snapshots = ch.snapshots ?? [];
    snapshots.unshift({ at: new Date(), text: draft, label: "pre-revise" });

    await chapters.updateOne(
      { _id: ch._id, userId },
      {
        $set: {
          draft: revised,
          wordCount,
          status: "drafted",
          snapshots: snapshots.slice(0, 12),
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({ draft: revised, wordCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reviser thất bại" },
      { status: 502 },
    );
  }
}
