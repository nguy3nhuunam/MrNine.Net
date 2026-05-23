import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mergeChapterParts, runComposer, runWriterPart, runWriter, type WriterPart } from "@/lib/story-writer/agents";
import { countWords, loadBookForUser, loadRecentSummaries, loadTruthMap } from "@/lib/story-writer/pipeline";
import { chaptersCol, toId } from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

// `?part=1|2|3` runs only that segment. `?part=full` (default) runs the
// whole single-call writer (kept for callers who want the legacy behaviour
// or who use a custom slow LLM). The 3-part flow is what the shell uses
// because each part fits comfortably under Vercel's 60s function budget.
async function _handler_POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const url = new URL(request.url);
  const partParam = (url.searchParams.get("part") || "full").toLowerCase();
  const part = ["1", "2", "3"].includes(partParam) ? (Number(partParam) as WriterPart) : null;
  if (!part && partParam !== "full") {
    return NextResponse.json({ error: "part phải là 1 | 2 | 3 | full" }, { status: 400 });
  }

  const chapters = await chaptersCol();
  const ch = await chapters.findOne({ _id: toId(id), userId });
  if (!ch) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  const book = await loadBookForUser(ch.bookId, userId);
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  if (!ch.intent) {
    return NextResponse.json({ error: "Cần chạy Plan trước khi viết" }, { status: 412 });
  }

  // Recompose every call so the writer sees the latest truth state.
  const truth = await loadTruthMap(ch.bookId, userId);
  const recent = await loadRecentSummaries(ch.bookId, userId, ch.number);
  const composed = runComposer({ book, chapterNumber: ch.number, truth, recentSummaries: recent });

  try {
    if (part) {
      // Build the previous parts as context for this part
      const existing = ch.draftParts ?? {};
      const prev: string[] = [];
      if (part >= 2 && existing.part1) prev.push(`## (Phần 1)\n${existing.part1}`);
      if (part >= 3 && existing.part2) prev.push(`## (Phần 2)\n${existing.part2}`);

      // Validate prerequisites
      if (part === 2 && !existing.part1) {
        return NextResponse.json({ error: "Cần viết phần 1 trước phần 2" }, { status: 412 });
      }
      if (part === 3 && (!existing.part1 || !existing.part2)) {
        return NextResponse.json({ error: "Cần viết phần 1 + 2 trước phần 3" }, { status: 412 });
      }

      const segment = await runWriterPart({
        book,
        chapterNumber: ch.number,
        intent: ch.intent,
        composed,
        part,
        previousParts: prev.join("\n\n"),
      });

      const nextParts = { ...existing, [`part${part}`]: segment };
      let draft = ch.draft ?? "";
      let title = ch.title;
      const allDone = Boolean(nextParts.part1 && nextParts.part2 && nextParts.part3);

      if (allDone) {
        draft = mergeChapterParts(nextParts.part1!, nextParts.part2!, nextParts.part3!);
        const titleMatch = draft.match(/^##\s*[Cc]hương\s*\d+\s*[:.\-]\s*(.+)$/m);
        if (titleMatch) title = titleMatch[1].trim().slice(0, 200);
      }

      const snapshots = ch.snapshots ?? [];
      if (allDone && draft) {
        snapshots.unshift({ at: new Date(), text: draft, label: `writer-3part-merged` });
      }

      await chapters.updateOne(
        { _id: ch._id, userId },
        {
          $set: {
            draftParts: nextParts,
            ...(allDone ? { draft, status: "drafted", title, wordCount: countWords(draft) } : {}),
            context: composed.selected,
            ruleStack: composed.ruleStack,
            trace: composed.trace,
            snapshots: snapshots.slice(0, 12),
            updatedAt: new Date(),
          },
        },
      );

      return NextResponse.json({
        part,
        segment,
        merged: allDone,
        draft: allDone ? draft : null,
        title: allDone ? title : null,
        wordCount: allDone ? countWords(draft) : countWords(segment),
        nextPart: allDone ? null : ((part + 1) as WriterPart),
      });
    }

    // Legacy single-call path
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

    return NextResponse.json({ draft, wordCount, title: newTitle, merged: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Writer thất bại" },
      { status: 502 },
    );
  }
}

export const POST = safeJsonRoute(_handler_POST);
