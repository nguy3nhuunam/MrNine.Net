import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGenre } from "@/lib/story-writer/genres";
import { runShortStory } from "@/lib/story-writer/short";
import type { LlmConfig } from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function _handler_POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });

  let body: {
    direction?: string;
    genre?: string;
    chars?: number;
    chapters?: number;
    llm?: LlmConfig | null;
  } = {};
  try {
    body = await request.json();
  } catch {}

  const direction = (body.direction ?? "").trim();
  const genre = (body.genre ?? "").trim();
  if (!direction) return NextResponse.json({ error: "Cần hướng truyện" }, { status: 400 });
  if (!getGenre(genre)) return NextResponse.json({ error: "Genre không hợp lệ" }, { status: 400 });

  try {
    const result = await runShortStory({
      direction,
      genreId: genre,
      chars: Number(body.chars ?? 3000),
      chapters: Number(body.chapters ?? 1),
      llm: body.llm ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Short story thất bại" },
      { status: 502 },
    );
  }
}

export const POST = safeJsonRoute(_handler_POST);
