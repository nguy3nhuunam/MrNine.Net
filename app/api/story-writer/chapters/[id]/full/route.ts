import { NextResponse } from "next/server";
import {
  detectAiTellHeuristic,
  runAuditor,
  runComposer,
  runPlanner,
  runReflector,
  runReviser,
  runWriter,
} from "@/lib/story-writer/agents";
import { applyTruthDelta, countWords, loadBookForUser, loadRecentSummaries, loadTruthMap } from "@/lib/story-writer/pipeline";
import { chaptersCol, toId } from "@/lib/story-writer/store";
import { guardedRoute, type GuardContext } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

async function _handler_POST(request: Request, guard: GuardContext, ctx: Ctx) {
  if (!guard.userId) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = guard.userId;

  let body: { autoApprove?: boolean; reviseRetries?: number; auditScoreThreshold?: number } = {};
  try {
    body = await request.json();
  } catch {}

  const autoApprove = body.autoApprove === true;
  const reviseRetries = Math.min(2, Math.max(0, Number(body.reviseRetries ?? 1)));
  const auditScoreThreshold = Math.min(100, Math.max(50, Number(body.auditScoreThreshold ?? 75)));

  const chapters = await chaptersCol();
  const ch = await chapters.findOne({ _id: toId(id), userId });
  if (!ch) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  const book = await loadBookForUser(ch.bookId, userId);
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  try {
    const truth0 = await loadTruthMap(ch.bookId, userId);
    const recent = await loadRecentSummaries(ch.bookId, userId, ch.number);

    const intent = await runPlanner({
      book,
      chapterNumber: ch.number,
      contextBrief: ch.contextBrief ?? "",
      truth: truth0,
      recentSummaries: recent,
    });

    const composed = runComposer({ book, chapterNumber: ch.number, truth: truth0, recentSummaries: recent });
    let draft = await runWriter({ book, chapterNumber: ch.number, intent, composed });

    let audit = await runAuditor({ book, chapterNumber: ch.number, draft, intent, composed });
    let attempt = 0;
    while (audit.overallScore < auditScoreThreshold && attempt < reviseRetries) {
      const revised = await runReviser({ book, chapterNumber: ch.number, draft, audit, composed });
      draft = revised;
      audit = await runAuditor({ book, chapterNumber: ch.number, draft, intent, composed });
      attempt += 1;
    }

    const heuristic = detectAiTellHeuristic(draft);
    const wordCount = countWords(draft);
    const titleMatch = draft.match(/^##\s*[Cc]hương\s*\d+\s*[:.\-]\s*(.+)$/m);
    const newTitle = titleMatch ? titleMatch[1].trim().slice(0, 200) : ch.title;

    const snapshots = ch.snapshots ?? [];
    snapshots.unshift({ at: new Date(), text: draft, label: "full-pipeline" });

    let nextStatus: "drafted" | "audited" | "approved" = audit.overallScore >= auditScoreThreshold ? "audited" : "drafted";
    let finalText: string | undefined;

    if (autoApprove && audit.overallScore >= auditScoreThreshold) {
      const delta = await runReflector({ book, chapterNumber: ch.number, finalText: draft, composed });
      await applyTruthDelta(ch.bookId, userId, delta);
      finalText = draft;
      nextStatus = "approved";
    }

    await chapters.updateOne(
      { _id: ch._id, userId },
      {
        $set: {
          intent,
          context: composed.selected,
          ruleStack: composed.ruleStack,
          trace: composed.trace,
          draft,
          ...(finalText ? { finalText } : {}),
          auditReport: audit,
          wordCount,
          title: newTitle,
          status: nextStatus,
          snapshots: snapshots.slice(0, 12),
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      intent,
      draft,
      audit,
      heuristic,
      wordCount,
      title: newTitle,
      status: nextStatus,
      reviseAttempts: attempt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline thất bại" },
      { status: 502 },
    );
  }
}

// "full" runs Plan → Write → Audit → Revise → optional Approve in a single
// call. Charge once at "story-write" cost (≈ writer + extra steps amortised).
export const POST = guardedRoute(
  { route: "story-full", requireUser: true, charge: "story-write" },
  _handler_POST,
);
