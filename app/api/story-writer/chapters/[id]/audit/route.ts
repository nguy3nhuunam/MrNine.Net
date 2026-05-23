import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { detectAiTellHeuristic, runAuditor, runComposer } from "@/lib/story-writer/agents";
import { loadBookForUser, loadRecentSummaries, loadTruthMap } from "@/lib/story-writer/pipeline";
import { chaptersCol, toId } from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

async function _handler_POST(_request: Request, ctx: Ctx) {
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
  if (!draft) return NextResponse.json({ error: "Chưa có bản nháp để audit" }, { status: 412 });

  const truth = await loadTruthMap(ch.bookId, userId);
  const recent = await loadRecentSummaries(ch.bookId, userId, ch.number);
  const composed = runComposer({ book, chapterNumber: ch.number, truth, recentSummaries: recent });

  try {
    const audit = await runAuditor({
      book,
      chapterNumber: ch.number,
      draft,
      intent: ch.intent ?? "",
      composed,
    });
    const heuristic = detectAiTellHeuristic(draft);

    await chapters.updateOne(
      { _id: ch._id, userId },
      { $set: { auditReport: audit, status: "audited", updatedAt: new Date() } },
    );

    return NextResponse.json({ audit, heuristic });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auditor thất bại" },
      { status: 502 },
    );
  }
}

export const POST = safeJsonRoute(_handler_POST);
