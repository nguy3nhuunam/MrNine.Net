import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runPlanner } from "@/lib/story-writer/agents";
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

  const truth = await loadTruthMap(ch.bookId, userId);
  const recent = await loadRecentSummaries(ch.bookId, userId, ch.number);

  try {
    const intent = await runPlanner({
      book,
      chapterNumber: ch.number,
      contextBrief: ch.contextBrief ?? "",
      truth,
      recentSummaries: recent,
    });
    await chapters.updateOne(
      { _id: ch._id, userId },
      { $set: { intent, updatedAt: new Date() } },
    );
    return NextResponse.json({ intent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Planner thất bại" },
      { status: 502 },
    );
  }
}

export const POST = safeJsonRoute(_handler_POST);
