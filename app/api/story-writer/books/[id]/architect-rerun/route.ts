import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  runArchitectCore,
  runArchitectCast,
  runArchitectPlot,
  runArchitectTruth,
  type ArchitectSkeleton,
} from "@/lib/story-writer/architect";
import { applyTruthDelta } from "@/lib/story-writer/pipeline";
import { booksCol, toId, truthCol, TRUTH_KINDS } from "@/lib/story-writer/store";
import { safeJsonRoute } from "@/lib/safe-json-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 50;

type Ctx = { params: Promise<{ id: string }> };

// stage=core   -> bible + rules + outline
// stage=cast   -> characters + relationships
// stage=plot   -> foreshadows + volumes
// stage=truth  -> 7 truth-file seeds (requires core + cast)
// stage=all    -> sequential 1→2→3→4 (slow; legacy)
async function _handler_POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = session.user.id;

  const url = new URL(request.url);
  const stage = (url.searchParams.get("stage") || "core").toLowerCase();
  if (!["core", "cast", "plot", "truth", "all", "skeleton"].includes(stage)) {
    return NextResponse.json({ error: "stage không hợp lệ" }, { status: 400 });
  }

  const bookId = toId(id);
  const col = await booksCol();
  const book = await col.findOne({ _id: bookId, userId });
  if (!book) return NextResponse.json({ error: "Không tìm thấy book" }, { status: 404 });

  const baseInput = {
    title: book.title,
    genreId: book.genre,
    brief: book.brief,
    authorIntent: book.authorIntent,
    currentFocus: book.currentFocus,
    chapterWords: book.chapterWords,
    targetChapters: book.targetChapters,
    llm: book.llm ?? null,
  };

  try {
    if (stage === "core") {
      const core = await runArchitectCore(baseInput);
      await col.updateOne(
        { _id: bookId, userId },
        {
          $set: {
            storyBible: core.storyBible,
            bookRules: core.bookRules,
            volumeOutline: core.volumeOutline,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.json({ ok: true, stage, ...core });
    }

    if (stage === "cast") {
      if (!book.storyBible) {
        return NextResponse.json({ error: "Cần stage=core trước stage=cast" }, { status: 412 });
      }
      const cast = await runArchitectCast({
        ...baseInput,
        core: { storyBible: book.storyBible, bookRules: book.bookRules, volumeOutline: book.volumeOutline },
      });

      const charById = new Map<string, string>();
      const characters = (cast.characters ?? []).map((c, idx) => {
        const cid = `c${idx + 1}`;
        charById.set(c.name.trim().toLowerCase(), cid);
        return {
          id: cid,
          name: c.name.trim(),
          role: c.role,
          profile: c.profile,
          aliases: c.aliases ?? [],
        };
      });
      const relationships = (cast.relationships ?? [])
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

      await col.updateOne(
        { _id: bookId, userId },
        { $set: { characters, relationships, updatedAt: new Date() } },
      );
      return NextResponse.json({ ok: true, stage, characters, relationships });
    }

    if (stage === "plot") {
      if (!book.characters?.length) {
        return NextResponse.json({ error: "Cần stage=cast trước stage=plot" }, { status: 412 });
      }
      const plot = await runArchitectPlot({
        ...baseInput,
        core: { storyBible: book.storyBible, bookRules: book.bookRules, volumeOutline: book.volumeOutline },
        cast: {
          characters: (book.characters ?? []).map((c) => ({
            name: c.name,
            role: c.role,
            profile: c.profile,
            aliases: c.aliases,
          })),
        },
      });

      const foreshadows = (plot.foreshadows ?? []).map((f, idx) => ({
        id: `f${idx + 1}`,
        summary: f.summary,
        status: "open" as const,
        expectedResolutionChapter: f.expectedResolutionChapter,
      }));
      const volumes = (plot.volumes ?? []).map((v) => ({
        id: `v${v.number}`,
        number: v.number,
        title: v.title,
        summary: v.summary,
        startChapter: v.startChapter,
        endChapter: v.endChapter,
        status: "planned" as const,
      }));
      await col.updateOne(
        { _id: bookId, userId },
        { $set: { foreshadows, volumes, updatedAt: new Date() } },
      );
      return NextResponse.json({ ok: true, stage, foreshadows, volumes });
    }

    if (stage === "truth") {
      if (!book.storyBible || !book.characters?.length) {
        return NextResponse.json({ error: "Cần core + cast trước truth" }, { status: 412 });
      }
      const skeleton: ArchitectSkeleton = {
        storyBible: book.storyBible,
        bookRules: book.bookRules,
        volumeOutline: book.volumeOutline,
        characters: (book.characters ?? []).map((c) => ({
          name: c.name,
          role: c.role,
          profile: c.profile,
          aliases: c.aliases,
        })),
        relationships: [],
        foreshadows: [],
        volumes: [],
      };
      const truthSeeds = await runArchitectTruth({
        title: book.title,
        genreId: book.genre,
        skeleton,
        llm: book.llm ?? null,
      });
      const truth = await truthCol();
      const docs = await truth.find({ bookId, userId }).toArray();
      for (const kind of TRUTH_KINDS) {
        const seed = truthSeeds[kind as keyof typeof truthSeeds];
        if (!seed) continue;
        const doc = docs.find((d) => d.kind === kind);
        const isBlank = !doc?.content || doc.content.trim().length < 8;
        if (isBlank) {
          await applyTruthDelta(bookId, userId, { [kind]: seed });
        }
      }
      return NextResponse.json({ ok: true, stage });
    }

    // stage=all / skeleton -> deprecated; just run core to nudge user toward
    // the per-stage flow. Returning early avoids a 60s+ chain.
    if (stage === "all" || stage === "skeleton") {
      const core = await runArchitectCore(baseInput);
      await col.updateOne(
        { _id: bookId, userId },
        {
          $set: {
            storyBible: core.storyBible,
            bookRules: core.bookRules,
            volumeOutline: core.volumeOutline,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.json({
        ok: true,
        stage,
        ...core,
        nextStages: ["cast", "plot", "truth"],
      });
    }

    return NextResponse.json({ ok: true, stage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Architect thất bại", stage },
      { status: 502 },
    );
  }
}

export const POST = safeJsonRoute(_handler_POST);
