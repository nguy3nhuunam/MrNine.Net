import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { chaptersCol, toId } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const ch = await (await chaptersCol()).findOne({ _id: toId(id), userId: session.user.id });
  if (!ch) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  return NextResponse.json({
    id: String(ch._id),
    bookId: String(ch.bookId),
    number: ch.number,
    title: ch.title,
    status: ch.status,
    contextBrief: ch.contextBrief ?? "",
    notes: ch.notes ?? "",
    intent: ch.intent ?? "",
    context: ch.context ?? null,
    ruleStack: ch.ruleStack ?? "",
    trace: ch.trace ?? null,
    draft: ch.draft ?? "",
    finalText: ch.finalText ?? "",
    auditReport: ch.auditReport ?? null,
    wordCount: ch.wordCount ?? 0,
    snapshots: (ch.snapshots ?? []).map((s, idx) => ({
      index: idx,
      at: s.at,
      label: s.label ?? "",
      preview: s.text.slice(0, 200),
    })),
    updatedAt: ch.updatedAt,
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  let body: Partial<{ title: string; contextBrief: string; notes: string; status: string }> = {};
  try {
    body = await request.json();
  } catch {}

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string") update.title = body.title.slice(0, 200);
  if (typeof body.contextBrief === "string") update.contextBrief = body.contextBrief.slice(0, 2000);
  if (typeof body.notes === "string") update.notes = body.notes.slice(0, 4000);
  if (typeof body.status === "string" && ["planned", "drafted", "audited", "approved"].includes(body.status)) {
    update.status = body.status;
  }

  const result = await (await chaptersCol()).findOneAndUpdate(
    { _id: toId(id), userId },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!result) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  return NextResponse.json({ id: String(result._id), updatedAt: result.updatedAt });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const result = await (await chaptersCol()).deleteOne({ _id: toId(id), userId: session.user.id });
  if (!result.deletedCount) return NextResponse.json({ error: "Không tìm thấy chương" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
