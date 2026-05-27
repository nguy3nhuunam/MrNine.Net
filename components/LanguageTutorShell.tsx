"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpenText,
  Check,
  ChevronRight,
  Flame,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Volume2,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { renderCloze, parseCloze, firstAnswerForIndex, clozeToPlain } from "@/lib/flashcards/cloze";
import { formatInterval } from "@/lib/flashcards/fsrs";
import type { Card, CardKind, Deck, Grade, Note } from "@/lib/flashcards/types";

type StudyResponse = {
  done?: boolean;
  card?: Card & { clozeIndex?: number };
  note?: Note;
  deck?: Deck;
  counts: { newCount: number; learningCount: number; reviewCount: number };
};

type StatsData = {
  states: Record<string, number>;
  retention: number;
  reviewsLast30: number;
  heatmap: Record<string, number>;
  forecast: Record<string, number>;
  intervalBuckets: Array<{ _id: number | string; count: number }>;
};

type View = "study" | "browse" | "stats" | "editor";

const tutorCopy = {
  vi: {
    back: "Về trang chủ",
    title: "Language Tutor",
    subtitle: "Flashcards · FSRS-6",
    online: "Sẵn sàng",
    busy: "Đang xử lý",

    deckTreeTitle: "Bộ thẻ",
    newDeckPlaceholder: "Tên deck mới…",
    addDeck: "Tạo deck",
    noDecks: "Chưa có deck — tạo cái đầu tiên",

    viewStudy: "Học",
    viewBrowse: "Duyệt",
    viewStats: "Thống kê",
    viewEditor: "Soạn thẻ",

    studyDone: "Xong rồi! Hôm nay không còn thẻ nào tới hạn.",
    studyShowAnswer: "Hiện đáp án",
    studyType: "Gõ đáp án rồi Enter",
    studyAgain: "Lại",
    studyHard: "Khó",
    studyGood: "Tốt",
    studyEasy: "Dễ",
    studyEdit: "Sửa thẻ",
    studyDelete: "Xoá thẻ",
    studyTTS: "Đọc thử (OmniVoice)",
    keyboardHint: "Phím tắt: Space hiện đáp án · 1/2/3/4 chấm điểm",

    countsNew: "Mới",
    countsLearning: "Đang học",
    countsReview: "Ôn",

    browseSearch: "Tìm trong front, back, tag…",
    browseEmpty: "Chưa có thẻ. Bấm Soạn thẻ để thêm.",

    editorTitle: "Soạn thẻ",
    editorKindBasic: "Cơ bản",
    editorKindCloze: "Cloze",
    editorKindTyped: "Gõ đáp án",
    editorFront: "Mặt trước",
    editorBack: "Mặt sau / Đáp án",
    editorHint: "Gợi ý (tuỳ chọn)",
    editorTags: "Tags (cách bằng dấu phẩy)",
    editorAddCloze: "Bọc cloze {{c1}}",
    editorSave: "Lưu thẻ",
    editorAiTitle: "Tạo bằng AI",
    editorAiHint: "Dán văn bản nguồn (note, đoạn sách, slide…). AI sẽ sinh ra 5–12 thẻ.",
    editorAiInstruction: "Yêu cầu thêm cho AI (tuỳ chọn) — ví dụ: tập trung vào ngữ pháp, dạng cloze, tiếng Anh…",
    editorAiGenerate: "Sinh thẻ AI",
    editorAiAdded: "thẻ đã được nạp vào deck",

    statsRetention: "Tỉ lệ nhớ",
    statsReviews30: "Lượt ôn 30 ngày",
    statsTotal: "Tổng thẻ",
    statsForecast: "7 ngày tới",
    statsIntervals: "Phân bố interval",
    statsHeatmap: "Hoạt động 30 ngày",

    errSave: "Lưu thẻ thất bại",
    errStudy: "Không lấy được thẻ",
    errAi: "AI sinh thẻ lỗi",
    studyNoDeck: "Chọn hoặc tạo một deck ở thanh bên để bắt đầu học.",
  },
  en: {
    back: "Back to home",
    title: "Language Tutor",
    subtitle: "Flashcards · FSRS-6",
    online: "Ready",
    busy: "Working",

    deckTreeTitle: "Decks",
    newDeckPlaceholder: "New deck name…",
    addDeck: "Add deck",
    noDecks: "No decks yet — create one",

    viewStudy: "Study",
    viewBrowse: "Browse",
    viewStats: "Stats",
    viewEditor: "Editor",

    studyDone: "All done — no cards due right now.",
    studyShowAnswer: "Show answer",
    studyType: "Type the answer then Enter",
    studyAgain: "Again",
    studyHard: "Hard",
    studyGood: "Good",
    studyEasy: "Easy",
    studyEdit: "Edit",
    studyDelete: "Delete",
    studyTTS: "Read aloud (OmniVoice)",
    keyboardHint: "Shortcut: Space reveal · 1/2/3/4 grade",

    countsNew: "New",
    countsLearning: "Learn",
    countsReview: "Due",

    browseSearch: "Search front, back, tag…",
    browseEmpty: "No cards yet. Hit Editor to add one.",

    editorTitle: "Editor",
    editorKindBasic: "Basic",
    editorKindCloze: "Cloze",
    editorKindTyped: "Typed",
    editorFront: "Front",
    editorBack: "Back / Answer",
    editorHint: "Hint (optional)",
    editorTags: "Tags (comma separated)",
    editorAddCloze: "Wrap cloze {{c1}}",
    editorSave: "Save card",
    editorAiTitle: "Generate with AI",
    editorAiHint: "Paste source content. AI will generate 5–12 cards.",
    editorAiInstruction: "Extra instructions (optional)",
    editorAiGenerate: "AI generate",
    editorAiAdded: "cards added to deck",

    statsRetention: "Retention",
    statsReviews30: "Reviews last 30d",
    statsTotal: "Total cards",
    statsForecast: "Next 7 days",
    statsIntervals: "Interval distribution",
    statsHeatmap: "30-day activity",

    errSave: "Save failed",
    errStudy: "Couldn't load card",
    errAi: "AI generate failed",
    studyNoDeck: "Pick or create a deck in the sidebar to start studying.",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

export function LanguageTutorShell() {
  const { language, setLanguage } = useLanguage();
  const copy = tutorCopy[language];

  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [view, setView] = useState<View>("study");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Study state
  const [studyData, setStudyData] = useState<StudyResponse | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedFeedback, setTypedFeedback] = useState<"correct" | "wrong" | null>(null);
  const studyStartRef = useRef<number>(Date.now());

  // Browse state
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseData, setBrowseData] = useState<{ notes: Note[]; cards: Card[] }>({ notes: [], cards: [] });

  // Stats
  const [stats, setStats] = useState<StatsData | null>(null);

  // Editor state
  const [editorKind, setEditorKind] = useState<CardKind>("basic");
  const [editorFront, setEditorFront] = useState("");
  const [editorBack, setEditorBack] = useState("");
  const [editorHint, setEditorHint] = useState("");
  const [editorTags, setEditorTags] = useState("");
  const editorFrontRef = useRef<HTMLTextAreaElement | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // AI generate
  const [aiSource, setAiSource] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAddedCount, setAiAddedCount] = useState<number | null>(null);

  // New deck
  const [newDeckName, setNewDeckName] = useState("");

  // TTS
  const [ttsAudio, setTtsAudio] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeDeck = useMemo(
    () => decks.find((d) => d.id === activeDeckId) ?? null,
    [decks, activeDeckId],
  );

  const loadDecks = useCallback(async () => {
    const r = await fetch("/api/flashcards/decks", { cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as { decks: Deck[] };
    setDecks(data.decks);
    if (!activeDeckId && data.decks[0]) setActiveDeckId(data.decks[0].id);
  }, [activeDeckId]);

  const loadStudy = useCallback(async () => {
    if (!activeDeckId) return;
    setBusy(true);
    setError(null);
    setRevealed(false);
    setTypedAnswer("");
    setTypedFeedback(null);
    studyStartRef.current = Date.now();
    try {
      const r = await fetch(`/api/flashcards/study?deckId=${activeDeckId}`, { cache: "no-store" });
      const data = (await r.json()) as StudyResponse;
      setStudyData(data);
    } catch {
      setError(copy.errStudy);
    } finally {
      setBusy(false);
    }
  }, [activeDeckId, copy.errStudy]);

  const loadBrowse = useCallback(async () => {
    if (!activeDeckId) return;
    const params = new URLSearchParams({ deckId: activeDeckId });
    if (browseSearch.trim()) params.set("q", browseSearch.trim());
    const r = await fetch(`/api/flashcards/cards?${params}`, { cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as { notes: Note[]; cards: Card[] };
    setBrowseData(data);
  }, [activeDeckId, browseSearch]);

  const loadStats = useCallback(async () => {
    const r = await fetch("/api/flashcards/stats", { cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as { stats: StatsData | null };
    setStats(data.stats);
  }, []);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  useEffect(() => {
    if (view === "study") void loadStudy();
    if (view === "browse") void loadBrowse();
    if (view === "stats") void loadStats();
  }, [view, activeDeckId, loadStudy, loadBrowse, loadStats]);

  const onAddDeck = async () => {
    if (!newDeckName.trim()) return;
    const r = await fetch("/api/flashcards/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDeckName.trim() }),
    });
    if (r.ok) {
      const data = (await r.json()) as { deck: Deck };
      setDecks((d) => [...d, data.deck]);
      setActiveDeckId(data.deck.id);
      setNewDeckName("");
    }
  };

  const onGrade = async (grade: Grade) => {
    if (!studyData?.card) return;
    const cardId = studyData.card.id;
    const durationMs = Date.now() - studyStartRef.current;
    setBusy(true);
    try {
      const r = await fetch(`/api/flashcards/cards/${cardId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, durationMs }),
      });
      if (r.ok) {
        await loadStudy();
      } else {
        setError(copy.errStudy);
      }
    } finally {
      setBusy(false);
    }
  };

  const onSaveCard = async () => {
    if (!activeDeckId) return;
    const tags = editorTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/flashcards/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId: activeDeckId,
          kind: editorKind,
          front: editorFront,
          back: editorBack,
          hint: editorHint,
          tags,
        }),
      });
      if (r.ok) {
        setEditorFront("");
        setEditorBack("");
        setEditorHint("");
        setEditorTags("");
        if (view === "browse") void loadBrowse();
      } else {
        const data = (await r.json()) as { error?: string };
        setError(data.error ?? copy.errSave);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errSave);
    } finally {
      setBusy(false);
    }
  };

  const onAiGenerate = async () => {
    if (!activeDeckId || !aiSource.trim()) return;
    setAiBusy(true);
    setError(null);
    setAiAddedCount(null);
    try {
      const r = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: aiSource, instruction: aiInstruction }),
      });
      const data = (await r.json()) as {
        cards?: Array<{ kind: "basic" | "cloze"; front: string; back: string; tags?: string[]; hint?: string }>;
        error?: string;
      };
      if (!r.ok || !data.cards) {
        setError(data.error ?? copy.errAi);
        return;
      }
      let added = 0;
      for (const c of data.cards) {
        const cr = await fetch("/api/flashcards/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deckId: activeDeckId,
            kind: c.kind,
            front: c.front,
            back: c.back,
            hint: c.hint,
            tags: c.tags,
          }),
        });
        if (cr.ok) added++;
      }
      setAiAddedCount(added);
      setAiSource("");
      setAiInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errAi);
    } finally {
      setAiBusy(false);
    }
  };

  const onTTS = async () => {
    if (!studyData?.note) return;
    const text = studyData.note.kind === "cloze" ? clozeToPlain(studyData.note.front) : studyData.note.back || studyData.note.front;
    if (!text.trim()) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("text", text);
      form.set("mode", "auto");
      form.set("num_step", "16");
      const r = await fetch("/api/voice-studio/clone", { method: "POST", body: form });
      const data = (await r.json()) as { ok?: boolean; id?: string };
      if (data.ok && data.id) {
        setTtsAudio(`/api/voice-studio/audio/${data.id}`);
      }
    } finally {
      setBusy(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (view !== "study" || !studyData?.card) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (!revealed) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        void onGrade(parseInt(e.key, 10) as Grade);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, studyData, revealed]);

  const totalCards = stats ? Object.values(stats.states).reduce((a, b) => a + b, 0) : 0;

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0b0a08] text-[#e8dfd4]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 14% 8%, rgba(69,168,93,0.16), transparent 28%), radial-gradient(circle at 86% 12%, rgba(214,165,72,0.08), transparent 26%), linear-gradient(180deg,#0d0c0a 0%,#070604 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[size:24px_24px] opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,86,75,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(94,86,75,0.055) 1px, transparent 1px)",
        }}
      />

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#25211b] bg-[#0a0907]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={copy.back}
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#45a85d]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Link
          href="/"
          aria-label="MrNine home"
          className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#45a85d]/70 sm:text-2xl"
        >
          Mr<span className="text-[#45a85d]">Nine</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#45a85d]/30 bg-[#45a85d]/10 text-[#45a85d]">
            <BookOpenText className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#45a85d]">
              {copy.subtitle}
            </p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>

        <nav className="ml-1 hidden flex-1 items-center justify-center gap-1 md:flex">
          {(
            [
              { id: "study" as const, label: copy.viewStudy },
              { id: "browse" as const, label: copy.viewBrowse },
              { id: "editor" as const, label: copy.viewEditor },
              { id: "stats" as const, label: copy.viewStats },
            ]
          ).map((item) => {
            const active = item.id === view;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  "h-10 rounded-md border px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition",
                  active
                    ? "border-[#45a85d]/50 bg-[#45a85d]/12 text-[#dff8e4] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                    : "border-[#25211b] text-[#9a9087] hover:border-white/20 hover:text-[#f4eadc]",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] sm:flex">
            <span className={cn("size-1.5 rounded-full", busy ? "bg-[#d6a548] animate-pulse" : "bg-[#45a85d]")} />
            <span className={busy ? "text-[#d6a548]" : "text-[#7dd391]"}>
              {busy ? copy.busy : copy.online}
            </span>
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em]">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.title}
                onClick={() => setLanguage(option.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition",
                  language === option.value ? "bg-[#45a85d] text-[#061009]" : "text-[#9f968b] hover:text-[#f4eadc]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="md:hidden relative z-10 shrink-0 overflow-x-auto border-b border-[#25211b] bg-[#0a0907]/92 px-3 py-2">
        <div className="flex min-w-max items-center gap-1.5">
          {(["study", "browse", "editor", "stats"] as const).map((id) => {
            const label = id === "study" ? copy.viewStudy : id === "browse" ? copy.viewBrowse : id === "editor" ? copy.viewEditor : copy.viewStats;
            const active = id === view;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "h-9 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  active ? "border-[#45a85d]/50 bg-[#45a85d]/10 text-[#dff8e4]" : "border-[#25211b] text-[#9a9087]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col border-r border-[#25211b] bg-[#0a0907]/72 lg:flex">
          <div className="flex shrink-0 items-center justify-between border-b border-[#25211b] px-4 py-3">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#45a85d]">
              {copy.deckTreeTitle}
            </p>
            {studyData?.counts ? (
              <div className="flex items-center gap-1.5 font-mono text-[0.5rem] uppercase tracking-[0.14em]">
                <span className="rounded border border-[#45a85d]/35 bg-[#45a85d]/10 px-1.5 py-0.5 text-[#7dd391]">
                  {studyData.counts.newCount}
                </span>
                <span className="rounded border border-[#d6a548]/35 bg-[#d6a548]/10 px-1.5 py-0.5 text-[#fff2d3]">
                  {studyData.counts.learningCount}
                </span>
                <span className="rounded border border-[#ef4444]/35 bg-[#ef4444]/10 px-1.5 py-0.5 text-[#ffd7d3]">
                  {studyData.counts.reviewCount}
                </span>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {decks.length === 0 ? (
              <p className="rounded-md border border-white/8 bg-white/[0.025] px-3 py-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#756d64]">
                {copy.noDecks}
              </p>
            ) : (
              <ul className="space-y-1">
                {decks.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setActiveDeckId(d.id)}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition",
                        activeDeckId === d.id
                          ? "border-[#45a85d]/55 bg-[#45a85d]/12 text-[#dff8e4] shadow-[0_0_0_1px_rgba(69,168,93,0.18)_inset]"
                          : "border-[#25211b] bg-white/[0.025] text-[#dfd5c7] hover:border-white/20 hover:bg-white/[0.04]",
                      )}
                    >
                      <ChevronRight className={cn("size-3 transition", activeDeckId === d.id && "rotate-90 text-[#45a85d]")} />
                      <span className="flex-1 truncate text-[0.82rem] font-bold">{d.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onAddDeck();
            }}
            className="flex shrink-0 items-center gap-1.5 border-t border-[#25211b] px-3 py-2.5"
          >
            <input
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder={copy.newDeckPlaceholder}
              className="flex-1 rounded-md border border-[#25211b] bg-[#0a0907]/82 px-2.5 py-1.5 text-[0.78rem] text-[#f4eadc] placeholder:text-[#756d64] focus:border-[#45a85d]/45 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newDeckName.trim()}
              className="flex size-8 items-center justify-center rounded-md border border-[#45a85d]/55 bg-[#45a85d]/12 text-[#dff8e4] transition hover:bg-[#45a85d]/24 disabled:opacity-45"
              aria-label={copy.addDeck}
            >
              <Plus className="size-3.5" />
            </button>
          </form>
        </aside>

        <section className="flex min-h-0 flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-7">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {error ? (
              <div className="rounded-md border border-[#ef4444]/40 bg-[#1a0707]/64 px-3 py-2 text-sm text-[#ffd7d3]">
                {error}
              </div>
            ) : null}

            {view === "study" ? (
              <StudyView
                copy={copy}
                data={studyData}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
                onGrade={onGrade}
                onTTS={onTTS}
                ttsAudio={ttsAudio}
                ttsAudioRef={ttsAudioRef}
                typedAnswer={typedAnswer}
                onTypedAnswerChange={setTypedAnswer}
                typedFeedback={typedFeedback}
                onCheckTyped={() => {
                  if (!studyData?.note) return;
                  const expected =
                    studyData.note.kind === "cloze"
                      ? firstAnswerForIndex(studyData.note.front, (studyData.card as { clozeIndex?: number })?.clozeIndex ?? 1)
                      : studyData.note.back;
                  if (!expected) return;
                  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
                  setTypedFeedback(norm(typedAnswer) === norm(expected) ? "correct" : "wrong");
                  setRevealed(true);
                }}
              />
            ) : null}

            {view === "browse" ? (
              <BrowseView
                copy={copy}
                search={browseSearch}
                onSearch={setBrowseSearch}
                onApplySearch={() => loadBrowse()}
                data={browseData}
                onEdit={(card, note) => {
                  setEditingCardId(card.id);
                  setEditorKind(note.kind);
                  setEditorFront(note.front);
                  setEditorBack(note.back);
                  setEditorHint(note.hint ?? "");
                  setEditorTags(note.tags.join(", "));
                  setView("editor");
                }}
                onDelete={async (cardId) => {
                  await fetch(`/api/flashcards/cards/${cardId}`, { method: "DELETE" });
                  void loadBrowse();
                }}
              />
            ) : null}

            {view === "editor" ? (
              <EditorView
                copy={copy}
                kind={editorKind}
                onKindChange={setEditorKind}
                front={editorFront}
                onFrontChange={setEditorFront}
                back={editorBack}
                onBackChange={setEditorBack}
                hint={editorHint}
                onHintChange={setEditorHint}
                tags={editorTags}
                onTagsChange={setEditorTags}
                onSave={onSaveCard}
                frontRef={editorFrontRef}
                aiSource={aiSource}
                onAiSourceChange={setAiSource}
                aiInstruction={aiInstruction}
                onAiInstructionChange={setAiInstruction}
                aiBusy={aiBusy}
                aiAddedCount={aiAddedCount}
                onAiGenerate={onAiGenerate}
                editing={Boolean(editingCardId)}
              />
            ) : null}

            {view === "stats" ? <StatsView copy={copy} stats={stats} totalCards={totalCards} /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

// ============================================================================
// Sub-views
// ============================================================================

function StudyView({
  copy,
  data,
  revealed,
  onReveal,
  onGrade,
  onTTS,
  ttsAudio,
  ttsAudioRef,
  typedAnswer,
  onTypedAnswerChange,
  typedFeedback,
  onCheckTyped,
}: {
  copy: typeof tutorCopy.vi;
  data: StudyResponse | null;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (g: Grade) => void;
  onTTS: () => void;
  ttsAudio: string | null;
  ttsAudioRef: React.RefObject<HTMLAudioElement | null>;
  typedAnswer: string;
  onTypedAnswerChange: (v: string) => void;
  typedFeedback: "correct" | "wrong" | null;
  onCheckTyped: () => void;
}) {
  if (!data) {
    return (
      <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/82 px-6 py-10 text-center">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#9a9087]">
          {copy.studyNoDeck}
        </p>
      </div>
    );
  }

  if (data.done) {
    return (
      <div className="rounded-xl border border-[#45a85d]/30 bg-[#091509]/64 px-6 py-10 text-center">
        <Check className="mx-auto size-8 text-[#45a85d]" />
        <p className="mt-3 text-lg font-bold text-[#f4eadc]">{copy.studyDone}</p>
      </div>
    );
  }

  const card = data.card!;
  const note = data.note!;
  const clozeIdx = (card as { clozeIndex?: number }).clozeIndex ?? 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {([
          { label: copy.countsNew, value: data.counts.newCount, color: "border-[#45a85d]/35 bg-[#45a85d]/10 text-[#7dd391]" },
          { label: copy.countsLearning, value: data.counts.learningCount, color: "border-[#d6a548]/35 bg-[#d6a548]/10 text-[#fff2d3]" },
          { label: copy.countsReview, value: data.counts.reviewCount, color: "border-[#ef4444]/35 bg-[#ef4444]/10 text-[#ffd7d3]" },
        ]).map((s) => (
          <div key={s.label} className={cn("rounded-md border px-3 py-2 text-center", s.color)}>
            <div className="font-mono text-[0.5rem] uppercase tracking-[0.18em] opacity-70">{s.label}</div>
            <div className="mt-0.5 text-lg font-black tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id + (revealed ? "-back" : "-front")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="rounded-xl border border-[#25211b] bg-[#0c0a08]/82 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.4)]"
        >
          {note.kind === "cloze" ? (
            <div className="text-[1.05rem] leading-8 text-[#f4eadc]">
              {(revealed ? renderCloze(note.front, -1) : renderCloze(note.front, clozeIdx)).map((p, i) => {
                if (p.kind === "text") return <span key={i}>{p.text}</span>;
                if (p.kind === "blank")
                  return (
                    <span key={i} className="inline-block min-w-[3rem] rounded border border-dashed border-[#45a85d]/55 bg-[#45a85d]/[0.06] px-2 py-0.5 text-center font-mono text-[#7dd391]">
                      {p.hint ?? "[…]"}
                    </span>
                  );
                return (
                  <span key={i} className={revealed ? "rounded border border-[#45a85d]/55 bg-[#45a85d]/10 px-1 font-bold text-[#dff8e4]" : "font-bold text-[#fff2d3]"}>
                    {p.text}
                  </span>
                );
              })}
            </div>
          ) : (
            <>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#45a85d]">FRONT</p>
              <div className="mt-2 whitespace-pre-wrap text-[1.1rem] leading-8 text-[#f4eadc]">{note.front}</div>
              {note.kind === "typed" && !revealed ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onCheckTyped();
                  }}
                  className="mt-4 flex items-center gap-2"
                >
                  <input
                    value={typedAnswer}
                    onChange={(e) => onTypedAnswerChange(e.target.value)}
                    placeholder={copy.studyType}
                    autoFocus
                    className="flex-1 rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2 text-[0.95rem] text-[#f4eadc] placeholder:text-[#756d64] focus:border-[#45a85d]/55 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-[#45a85d]/55 bg-[#45a85d] px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#061009] hover:bg-[#5cc274]"
                  >
                    Check
                  </button>
                </form>
              ) : null}
              {revealed ? (
                <div className="mt-4 rounded-md border border-[#45a85d]/35 bg-[#091509]/82 px-4 py-3">
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#45a85d]">BACK</p>
                  <div className="mt-1 whitespace-pre-wrap text-[1.05rem] leading-7 text-[#dff8e4]">{note.back}</div>
                  {note.kind === "typed" && typedFeedback ? (
                    <div className={cn("mt-2 text-xs", typedFeedback === "correct" ? "text-[#7dd391]" : "text-[#ff8e85]")}>
                      {typedFeedback === "correct" ? "✓ Đúng" : `✗ Bạn gõ: ${typedAnswer}`}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          {note.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1">
              {note.tags.map((t) => (
                <span key={t} className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[#9a9087]">
                  #{t}
                </span>
              ))}
            </div>
          ) : null}

          {note.hint ? (
            <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">
              hint · {note.hint}
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onTTS}
          className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#dfd5c7] transition hover:border-[#45a85d]/45 hover:text-[#dff8e4]"
        >
          <Volume2 className="size-3" />
          {copy.studyTTS}
        </button>
        {ttsAudio ? <audio ref={ttsAudioRef} src={ttsAudio} controls className="h-8 max-w-xs" /> : null}
      </div>

      {!revealed && note.kind !== "typed" ? (
        <button
          type="button"
          onClick={onReveal}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#45a85d]/55 bg-[#45a85d]/12 px-5 py-3 font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#dff8e4] transition hover:bg-[#45a85d]/24"
        >
          {copy.studyShowAnswer}
          <span className="opacity-50">[Space]</span>
        </button>
      ) : null}

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {([
            { g: 1 as Grade, label: copy.studyAgain, color: "border-[#ef4444]/55 bg-[#ef4444]/14 text-[#ffd7d3] hover:bg-[#ef4444]/24", key: "1" },
            { g: 2 as Grade, label: copy.studyHard, color: "border-[#d6a548]/45 bg-[#d6a548]/14 text-[#fff2d3] hover:bg-[#d6a548]/24", key: "2" },
            { g: 3 as Grade, label: copy.studyGood, color: "border-[#45a85d]/55 bg-[#45a85d]/14 text-[#dff8e4] hover:bg-[#45a85d]/26", key: "3" },
            { g: 4 as Grade, label: copy.studyEasy, color: "border-[#47c9d9]/55 bg-[#47c9d9]/14 text-[#cdf3f8] hover:bg-[#47c9d9]/24", key: "4" },
          ]).map((b) => (
            <button
              key={b.g}
              type="button"
              onClick={() => onGrade(b.g)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border px-3 py-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition",
                b.color,
              )}
            >
              <span className="text-[0.92rem] font-bold">{b.label}</span>
              <span className="opacity-50">[{b.key}]</span>
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-center font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#756d64]">
        {copy.keyboardHint}
      </p>
    </div>
  );
}

function BrowseView({
  copy,
  search,
  onSearch,
  onApplySearch,
  data,
  onEdit,
  onDelete,
}: {
  copy: typeof tutorCopy.vi;
  search: string;
  onSearch: (s: string) => void;
  onApplySearch: () => void;
  data: { notes: Note[]; cards: Card[] };
  onEdit: (card: Card, note: Note) => void;
  onDelete: (cardId: string) => void;
}) {
  const cardsByNote = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of data.cards) {
      if (!map.has(c.noteId)) map.set(c.noteId, []);
      map.get(c.noteId)!.push(c);
    }
    return map;
  }, [data.cards]);

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onApplySearch();
        }}
        className="flex items-center gap-2 rounded-xl border border-[#25211b] bg-[#0c0a08]/72 px-3 py-2"
      >
        <Search className="size-4 text-[#9a9087]" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={copy.browseSearch}
          className="flex-1 bg-transparent text-[0.85rem] text-[#f4eadc] placeholder:text-[#756d64] focus:outline-none"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              onSearch("");
              onApplySearch();
            }}
            className="text-[#9a9087] transition hover:text-[#f4eadc]"
            aria-label="Clear"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </form>

      {data.notes.length === 0 ? (
        <p className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-6 text-center text-sm text-[#9a9087]">
          {copy.browseEmpty}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.notes.map((note) => {
            const cards = cardsByNote.get(note.id) ?? [];
            return (
              <li key={note.id} className="rounded-md border border-[#25211b] bg-[#0c0a08]/72 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[0.86rem] text-[#f4eadc]">
                      {note.kind === "cloze" ? clozeToPlain(note.front) : note.front}
                    </p>
                    {note.back && note.kind !== "cloze" ? (
                      <p className="mt-1 line-clamp-1 text-[0.74rem] text-[#9a9087]">{note.back}</p>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#756d64]">
                      <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[#9a9087]">
                        {note.kind}
                      </span>
                      {cards.map((c) => (
                        <span
                          key={c.id}
                          className={cn(
                            "rounded border px-1.5 py-0.5",
                            c.state === "new" && "border-[#45a85d]/35 text-[#7dd391]",
                            c.state === "learning" && "border-[#d6a548]/35 text-[#fff2d3]",
                            c.state === "relearning" && "border-[#ef4444]/35 text-[#ffd7d3]",
                            c.state === "review" && "border-white/10 text-[#9a9087]",
                          )}
                        >
                          {c.state}
                        </span>
                      ))}
                      {note.tags.map((t) => (
                        <span key={t} className="text-[#9a9087]">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(cards[0]!, note)}
                      className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[#9a9087] transition hover:border-[#45a85d]/40 hover:text-[#dff8e4]"
                      aria-label="Edit"
                    >
                      <Pencil className="size-3" />
                    </button>
                    {cards[0] ? (
                      <button
                        type="button"
                        onClick={() => onDelete(cards[0]!.id)}
                        className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[#9a9087] transition hover:border-[#ef4444]/40 hover:text-[#ff8e85]"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EditorView({
  copy,
  kind,
  onKindChange,
  front,
  onFrontChange,
  back,
  onBackChange,
  hint,
  onHintChange,
  tags,
  onTagsChange,
  onSave,
  frontRef,
  aiSource,
  onAiSourceChange,
  aiInstruction,
  onAiInstructionChange,
  aiBusy,
  aiAddedCount,
  onAiGenerate,
  editing,
}: {
  copy: typeof tutorCopy.vi;
  kind: CardKind;
  onKindChange: (k: CardKind) => void;
  front: string;
  onFrontChange: (s: string) => void;
  back: string;
  onBackChange: (s: string) => void;
  hint: string;
  onHintChange: (s: string) => void;
  tags: string;
  onTagsChange: (s: string) => void;
  onSave: () => void;
  frontRef: React.RefObject<HTMLTextAreaElement | null>;
  aiSource: string;
  onAiSourceChange: (s: string) => void;
  aiInstruction: string;
  onAiInstructionChange: (s: string) => void;
  aiBusy: boolean;
  aiAddedCount: number | null;
  onAiGenerate: () => void;
  editing: boolean;
}) {
  const wrapCloze = () => {
    const el = frontRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = front.slice(start, end);
    if (!selected) return;
    const idx = (parseCloze(front).maxIndex || 0) + 1;
    const next = `${front.slice(0, start)}{{c${idx}::${selected}}}${front.slice(end)}`;
    onFrontChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-4">
        <p className="mb-3 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#45a85d]">
          {copy.editorTitle}
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: "basic" as CardKind, label: copy.editorKindBasic },
              { value: "cloze" as CardKind, label: copy.editorKindCloze },
              { value: "typed" as CardKind, label: copy.editorKindTyped },
            ]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onKindChange(opt.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] transition",
                kind === opt.value
                  ? "border-[#45a85d]/55 bg-[#45a85d]/12 text-[#dff8e4]"
                  : "border-[#25211b] text-[#9a9087] hover:border-white/20 hover:text-[#dfd5c7]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                {copy.editorFront}
              </label>
              {kind === "cloze" ? (
                <button
                  type="button"
                  onClick={wrapCloze}
                  className="rounded border border-[#45a85d]/35 bg-[#45a85d]/[0.06] px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#7dd391] transition hover:bg-[#45a85d]/14"
                >
                  {copy.editorAddCloze}
                </button>
              ) : null}
            </div>
            <textarea
              ref={frontRef}
              value={front}
              onChange={(e) => onFrontChange(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2 text-[0.92rem] leading-7 text-[#f4eadc] focus:border-[#45a85d]/45 focus:outline-none"
            />
          </div>

          {kind !== "cloze" ? (
            <div>
              <label className="mb-1 block font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">
                {copy.editorBack}
              </label>
              <textarea
                value={back}
                onChange={(e) => onBackChange(e.target.value)}
                rows={3}
                className="w-full resize-y rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2 text-[0.9rem] leading-7 text-[#f4eadc] focus:border-[#45a85d]/45 focus:outline-none"
              />
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={hint}
              onChange={(e) => onHintChange(e.target.value)}
              placeholder={copy.editorHint}
              className="rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2 text-[0.82rem] text-[#f4eadc] focus:border-[#45a85d]/45 focus:outline-none"
            />
            <input
              value={tags}
              onChange={(e) => onTagsChange(e.target.value)}
              placeholder={copy.editorTags}
              className="rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2 text-[0.82rem] text-[#f4eadc] focus:border-[#45a85d]/45 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={!front.trim() || (kind !== "cloze" && !back.trim())}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[#45a85d]/55 bg-[#45a85d] px-4 py-2.5 font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#061009] shadow-[0_8px_24px_rgba(69,168,93,0.3)] transition hover:bg-[#5cc274] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            <Check className="size-3.5" />
            {copy.editorSave}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#d6a548]/24 bg-[#1a1208]/56 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.32)]">
        <p className="mb-1 flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">
          <Sparkles className="size-3" />
          {copy.editorAiTitle}
        </p>
        <p className="mb-3 text-[0.74rem] leading-relaxed text-[#dfd5c7]">{copy.editorAiHint}</p>
        <textarea
          value={aiSource}
          onChange={(e) => onAiSourceChange(e.target.value)}
          rows={5}
          placeholder="Paste source content…"
          className="w-full resize-y rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2 text-[0.86rem] leading-7 text-[#f4eadc] placeholder:text-[#756d64] focus:border-[#d6a548]/45 focus:outline-none"
        />
        <input
          value={aiInstruction}
          onChange={(e) => onAiInstructionChange(e.target.value)}
          placeholder={copy.editorAiInstruction}
          className="mt-2 w-full rounded-md border border-[#25211b] bg-[#0a0907]/82 px-3 py-2 text-[0.78rem] text-[#f4eadc] placeholder:text-[#756d64] focus:border-[#d6a548]/45 focus:outline-none"
        />
        <button
          type="button"
          onClick={onAiGenerate}
          disabled={aiBusy || aiSource.trim().length < 12}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[#d6a548]/45 bg-[#d6a548]/14 px-4 py-2.5 font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#fff2d3] transition hover:bg-[#d6a548]/24 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {aiBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {copy.editorAiGenerate}
        </button>
        {aiAddedCount !== null ? (
          <p className="mt-2 text-center font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#7dd391]">
            ✓ {aiAddedCount} {copy.editorAiAdded}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatsView({
  copy,
  stats,
  totalCards,
}: {
  copy: typeof tutorCopy.vi;
  stats: StatsData | null;
  totalCards: number;
}) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircle className="size-6 animate-spin text-[#45a85d]" />
      </div>
    );
  }

  const heatmapKeys = Object.keys(stats.heatmap).sort();
  const maxHeat = Math.max(1, ...Object.values(stats.heatmap));
  const forecastEntries = Object.entries(stats.forecast).sort();
  const maxForecast = Math.max(1, ...Object.values(stats.forecast));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label={copy.statsRetention} value={`${(stats.retention * 100).toFixed(0)}%`} icon={<TrendingUp className="size-3" />} accent="lime" />
        <StatCard label={copy.statsReviews30} value={String(stats.reviewsLast30)} icon={<Flame className="size-3" />} accent="amber" />
        <StatCard label={copy.statsTotal} value={String(totalCards)} icon={<BookOpenText className="size-3" />} accent="cyan" />
      </div>

      <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-4">
        <p className="mb-3 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#45a85d]">
          {copy.statsForecast}
        </p>
        <div className="flex h-24 items-end gap-1.5">
          {forecastEntries.map(([day, count]) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end" style={{ height: "100%" }}>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#45a85d]/24 to-[#45a85d]/55"
                  style={{ height: `${(count / maxForecast) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
                  title={`${day}: ${count}`}
                />
              </div>
              <span className="font-mono text-[0.5rem] tabular-nums text-[#9a9087]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-4">
        <p className="mb-3 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">
          {copy.statsHeatmap}
        </p>
        <div className="grid grid-cols-15 gap-1 sm:grid-cols-30">
          {heatmapKeys.map((k) => {
            const intensity = stats.heatmap[k] / maxHeat;
            return (
              <div
                key={k}
                title={`${k}: ${stats.heatmap[k]}`}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor: `rgba(69, 168, 93, ${0.1 + intensity * 0.8})`,
                  border: "1px solid rgba(69,168,93,0.18)",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-4">
        <p className="mb-3 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#47c9d9]">
          {copy.statsIntervals}
        </p>
        <div className="space-y-1.5">
          {stats.intervalBuckets.map((b) => {
            const labels: Record<string, string> = {
              "0": "<1d",
              "1": "1-7d",
              "7": "7-30d",
              "30": "30-90d",
              "90": "90d-1y",
              "365": "1-5y",
              "1825": "5y+",
              other: "future",
            };
            return (
              <div key={String(b._id)} className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em]">
                <span className="w-16 text-[#9a9087]">{labels[String(b._id)] ?? String(b._id)}</span>
                <div className="flex-1 overflow-hidden rounded-sm bg-white/[0.04]">
                  <div
                    className="h-2 bg-gradient-to-r from-[#47c9d9]/55 to-[#47c9d9]/24"
                    style={{ width: `${Math.min(100, (b.count / Math.max(1, totalCards)) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums text-[#dfd5c7]">{b.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "lime" | "amber" | "cyan";
}) {
  const colors = {
    lime: "border-[#45a85d]/35 bg-[#45a85d]/10 text-[#7dd391]",
    amber: "border-[#d6a548]/35 bg-[#d6a548]/10 text-[#fff2d3]",
    cyan: "border-[#47c9d9]/35 bg-[#47c9d9]/10 text-[#cdf3f8]",
  };
  return (
    <div className={cn("rounded-md border px-3 py-3 text-center", colors[accent])}>
      <div className="flex items-center justify-center gap-1 font-mono text-[0.5rem] uppercase tracking-[0.18em] opacity-70">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

void formatInterval;
