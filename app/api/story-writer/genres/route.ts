import { NextResponse } from "next/server";
import { genres } from "@/lib/story-writer/genres";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    genres: genres.map((g) => ({
      id: g.id,
      labelVi: g.labelVi,
      labelEn: g.labelEn,
      emoji: g.emoji,
      defaultChapterWords: g.defaultChapterWords,
      defaultTargetChapters: g.defaultTargetChapters,
      platform: g.platform,
      audienceVi: g.audienceVi,
      styleGuide: g.styleGuide,
    })),
  });
}
