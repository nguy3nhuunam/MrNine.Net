import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runArchitect } from "@/lib/story-writer/architect";
import { applyTruthDelta } from "@/lib/story-writer/pipeline";
import { booksCol, toId, truthCol, TRUTH_KINDS } from "@/lib/story-writer/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const bookId = toId(id);
  const col = await booksCol();
  const book = await col.findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  try {
    const result = await runArchitect({
      title: book.title,
      genreId: book.genre,
      brief: book.brief,
      authorIntent: book.authorIntent,
      currentFocus: book.currentFocus,
      chapterWords: book.chapterWords,
      targetChapters: book.targetChapters,
      llm: book.llm ?? null,
    });

    const charById = new Map<string, string>();
    const characters = (result.characters ?? []).map((c, idx) => {
      const id = `c${idx + 1}`;
      charById.set(c.name.trim().toLowerCase(), id);
      return {
        id,
        name: c.name.trim(),
        role: c.role,
        profile: c.profile,
        aliases: c.aliases ?? [],
      };
    });
    const relationships = (result.relationships ?? [])
      .map((rel, idx) => {
        const fromId = charById.get(rel.fromName?.trim?.().toLowerCase?.() ?? "");
        const toId2 = charById.get(rel.toName?.trim?.().toLowerCase?.() ?? "");
        if (!fromId || !toId2) return null;
        return {
          id: `r${idx + 1}`,
          fromCharacterId: fromId,
          toCharacterId: toId2,
          kind: rel.kind as
            | "knows"
            | "loves"
            | "hates"
            | "rivals"
            | "parent_of"
            | "child_of"
            | "sibling"
            | "mentor_of"
            | "ally"
            | "owes"
            | "secret_with"
            | "betrayed_by"
            | "custom",
          label: rel.label,
          note: rel.note,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    const foreshadows = (result.foreshadows ?? []).map((f, idx) => ({
      id: `f${idx + 1}`,
      summary: f.summary,
      status: "open" as const,
      expectedResolutionChapter: f.expectedResolutionChapter,
    }));
    const volumes = (result.volumes ?? []).map((v) => ({
      id: `v${v.number}`,
      number: v.number,
      title: v.title,
      summary: v.summary,
      startChapter: v.startChapter,
      endChapter: v.endChapter,
      status: "planned" as const,
    }));

    const now = new Date();
    await col.updateOne(
      { _id: bookId, userId },
      {
        $set: {
          storyBible: result.storyBible,
          bookRules: result.bookRules,
          volumeOutline: result.volumeOutline,
          characters,
          relationships,
          foreshadows,
          volumes,
          updatedAt: now,
        },
      },
    );

    // Re-seed any truth file currently empty/blank.
    const truth = await truthCol();
    const docs = await truth.find({ bookId, userId }).toArray();
    for (const kind of TRUTH_KINDS) {
      const seed = result.truthSeeds[kind];
      if (!seed) continue;
      const doc = docs.find((d) => d.kind === kind);
      const isBlank = !doc?.content || doc.content.trim().length < 8;
      if (isBlank) {
        await applyTruthDelta(bookId, userId, { [kind]: seed });
      }
    }

    return NextResponse.json({ ok: true, characters, relationships, foreshadows, volumes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Architect re-run thất bại" },
      { status: 502 },
    );
  }
}
