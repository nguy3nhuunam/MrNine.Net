import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { suggestBookSetting } from "@/lib/story-writer/architect";
import { getGenre } from "@/lib/story-writer/genres";
import type { LlmConfig } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });

  let body: { topic?: string; genre?: string; llm?: LlmConfig } = {};
  try {
    body = await request.json();
  } catch {}
  const topic = (body.topic ?? "").trim();
  const genre = (body.genre ?? "").trim();
  if (!topic) return NextResponse.json({ error: "Cần ý tưởng truyện" }, { status: 400 });
  if (!getGenre(genre)) return NextResponse.json({ error: "Genre không hợp lệ" }, { status: 400 });

  try {
    const result = await suggestBookSetting({ topic, genreId: genre, llm: body.llm ?? null });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Đề xuất setting thất bại" },
      { status: 502 },
    );
  }
}
