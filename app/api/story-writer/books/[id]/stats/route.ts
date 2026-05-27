import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { booksCol, chaptersCol, toId } from "@/lib/story-writer/store";
import { rateLimitedRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function _handler_GET(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const bookId = toId(id);
  const book = await (await booksCol()).findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const chapters = await (await chaptersCol())
    .find({ bookId, userId })
    .sort({ number: 1 })
    .project({ number: 1, wordCount: 1, status: 1, auditReport: 1, updatedAt: 1, title: 1 })
    .toArray();

  let cumulative = 0;
  const wordCountSeries = chapters.map((ch) => {
    const w = typeof ch.wordCount === "number" ? ch.wordCount : 0;
    cumulative += w;
    return {
      number: ch.number,
      title: ch.title,
      status: ch.status,
      words: w,
      cumulative,
    };
  });

  const aiTellSeries = chapters
    .filter((ch) => ch.auditReport && typeof ch.auditReport.aiTellRate === "number")
    .map((ch) => ({
      number: ch.number,
      rate: ch.auditReport!.aiTellRate,
      score: ch.auditReport!.overallScore ?? 0,
    }));

  const totalWords = cumulative;
  const targetWords = (book.chapterWords ?? 0) * (book.targetChapters ?? 0);
  const progress = targetWords > 0 ? Math.min(1, totalWords / targetWords) : 0;
  const approvedCount = chapters.filter((ch) => ch.status === "approved").length;
  const draftedCount = chapters.filter((ch) => ch.status === "drafted" || ch.status === "audited").length;
  const plannedCount = chapters.filter((ch) => ch.status === "planned").length;
  const avgScore =
    aiTellSeries.length === 0
      ? 0
      : aiTellSeries.reduce((acc, s) => acc + s.score, 0) / aiTellSeries.length;
  const avgAiTell =
    aiTellSeries.length === 0
      ? 0
      : aiTellSeries.reduce((acc, s) => acc + s.rate, 0) / aiTellSeries.length;

  return NextResponse.json({
    summary: {
      totalChapters: chapters.length,
      targetChapters: book.targetChapters,
      totalWords,
      targetWords,
      progress,
      approvedCount,
      draftedCount,
      plannedCount,
      avgAuditScore: Math.round(avgScore),
      avgAiTellRate: Number(avgAiTell.toFixed(3)),
    },
    wordCountSeries,
    aiTellSeries,
  });
}

export const GET = rateLimitedRoute("story-writer-books-id-stats", _handler_GET);
