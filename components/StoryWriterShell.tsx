"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Maximize2,
  Network,
  PenLine,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Send,
  Sparkles,
  ShieldCheck,
  TriangleAlert,
  Trash2,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { safeParseJson } from "@/lib/fetch-json";

type Tab = "books" | "write" | "cast" | "truth" | "stats" | "search" | "tools";

type Genre = {
  id: string;
  labelVi: string;
  labelEn: string;
  emoji: string;
  defaultChapterWords: number;
  defaultTargetChapters: number;
  audienceVi: string;
};

type ProjectSummary = { id: string; name: string; updatedAt: string };
type BookSummary = {
  id: string;
  title: string;
  genre: string;
  status: string;
  chapterWords: number;
  targetChapters: number;
};
type ChapterSummary = {
  id: string;
  number: number;
  title: string;
  status: "planned" | "drafted" | "audited" | "approved";
  wordCount: number;
  contextBrief?: string;
  auditScore?: number | null;
  issuesCount?: number;
};

type ChapterDetail = ChapterSummary & {
  notes?: string;
  intent?: string;
  ruleStack?: string;
  draft?: string;
  finalText?: string;
  auditReport?: {
    overallScore: number;
    issues: Array<{
      dimension: string;
      severity: "low" | "medium" | "high";
      message: string;
      suggestion?: string;
    }>;
    aiTellRate: number;
  } | null;
  snapshots?: Array<{ index: number; at: string; label: string; preview: string }>;
};

type SwCharacter = { id: string; name: string; role: string; profile: string; aliases?: string[] };
type SwRelationship = { id: string; fromCharacterId: string; toCharacterId: string; kind: string; label?: string; note?: string };
type SwForeshadow = {
  id: string;
  summary: string;
  status: "open" | "progressing" | "deferred" | "resolved";
  lastAdvancedChapter?: number;
  expectedResolutionChapter?: number;
};
type SwVolume = {
  id: string;
  number: number;
  title: string;
  summary: string;
  startChapter: number;
  endChapter?: number;
  status: "planned" | "writing" | "completed";
};
type StatsData = {
  summary: {
    totalChapters: number;
    targetChapters: number;
    totalWords: number;
    targetWords: number;
    progress: number;
    approvedCount: number;
    draftedCount: number;
    plannedCount: number;
    avgAuditScore: number;
    avgAiTellRate: number;
  };
  wordCountSeries: Array<{ number: number; title: string; status: string; words: number; cumulative: number }>;
  aiTellSeries: Array<{ number: number; rate: number; score: number }>;
};
type SearchHit = {
  query: string;
  meta: Array<{ field: string; matches: Array<{ excerpt: string }> }>;
  truth: Array<{ kind: string; matches: Array<{ excerpt: string }> }>;
  chapters: Array<{ chapterId: string; number: number; title: string; status: string; matches: Array<{ excerpt: string }> }>;
  totalChapters: number;
};

type BookDetail = {
  id: string;
  title: string;
  genre: string;
  chapterWords: number;
  targetChapters: number;
  status: string;
  authorIntent: string;
  currentFocus: string;
  bookRules: string;
  storyBible: string;
  volumeOutline: string;
  styleGuide?: string;
  characters?: SwCharacter[];
  relationships?: SwRelationship[];
  foreshadows?: SwForeshadow[];
  volumes?: SwVolume[];
  llm?: {
    provider: "yunwu" | "custom";
    baseUrl?: string;
    model?: string;
    apiKey?: string;
  } | null;
};

type TruthMap = Record<
  string,
  { content: string; version: number; updatedAt: string } | null
>;

const TABS: ReadonlyArray<{ id: Tab; vi: string; en: string; icon: typeof BookOpen }> = [
  { id: "books", vi: "Sách", en: "Books", icon: BookOpen },
  { id: "write", vi: "Viết", en: "Write", icon: PenLine },
  { id: "cast", vi: "Nhân vật", en: "Cast", icon: Network },
  { id: "truth", vi: "Truth", en: "Truth", icon: ShieldCheck },
  { id: "stats", vi: "Stats", en: "Stats", icon: BarChart3 },
  { id: "search", vi: "Tìm", en: "Search", icon: SearchIcon },
  { id: "tools", vi: "Tools", en: "Tools", icon: Wrench },
];

const TRUTH_KINDS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "current_state", label: "Trạng thái thế giới" },
  { id: "particle_ledger", label: "Tài sản / vật phẩm" },
  { id: "pending_hooks", label: "Hooks đang mở" },
  { id: "chapter_summaries", label: "Tóm tắt chương" },
  { id: "subplot_board", label: "Subplot" },
  { id: "emotional_arcs", label: "Cung cảm xúc" },
  { id: "character_matrix", label: "Ma trận nhân vật" },
];

const swCopy = {
  vi: {
    back: "Quay lại trang chủ",
    title: "Story Writer",
    subtitle: "Viết tiểu thuyết với pipeline Plan → Compose → Write → Audit → Revise.",
    project: "Dự án",
    addProject: "Tạo dự án",
    projectNamePh: "Tên dự án",
    activeBook: "Sách đang viết",
    pickBook: "Chọn sách...",
    newBook: "Tạo sách mới",
    bookTitlePh: "Tựa truyện",
    bookGenrePh: "Chọn thể loại",
    briefPh: "Brief / outline có sẵn (tuỳ chọn, có thể để trống)",
    authorIntentPh: "Ý đồ tác giả (long-term)",
    currentFocusPh: "Trọng tâm 1–3 chương đầu",
    chapterWordsLabel: "Chữ / chương",
    targetChaptersLabel: "Mục tiêu chương",
    architectRunning: "Đang dựng khung truyện...",
    architectFailed: "Architect thất bại",
    confirm: "OK",
    cancel: "Huỷ",
    save: "Lưu",
    saved: "Đã lưu",
    chapters: "Chương",
    addChapter: "Thêm chương",
    chapterContextPh: "Yêu cầu cho chương này (tuỳ chọn)",
    plan: "Plan",
    compose: "Compose",
    write: "Write",
    audit: "Audit",
    revise: "Revise",
    approve: "Approve",
    full: "Pipeline đầy đủ",
    detect: "Dò AI-tell",
    statusPlanned: "Đã lập",
    statusDrafted: "Bản nháp",
    statusAudited: "Đã audit",
    statusApproved: "Đã duyệt",
    intent: "Intent",
    draft: "Bản nháp",
    auditReport: "Báo cáo audit",
    overallScore: "Điểm tổng",
    aiTellRate: "AI-tell",
    issues: "vấn đề",
    noIssues: "Không có vấn đề",
    snapshots: "Snapshot",
    restore: "Khôi phục",
    truthFiles: "7 Truth Files",
    truthSelect: "Chọn truth file",
    tools: "Tools",
    style: "Style fingerprint",
    stylePh: "Paste văn bản mẫu (1.000 – 60.000 ký tự)",
    analyzeStyle: "Phân tích style",
    importTitle: "Import chương có sẵn",
    importPh: "Paste toàn văn truyện (mỗi chương bắt đầu bằng 'Chương N:' hoặc '第X章')",
    runImport: "Import",
    renameTitle: "Đổi tên xuyên truyện",
    renameFromPh: "Tên cũ",
    renameToPh: "Tên mới",
    runRename: "Đổi tên",
    exportTitle: "Xuất truyện",
    exportTxt: "Tải TXT",
    exportMd: "Tải Markdown",
    exportEpub: "Tải EPUB",
    shortTitle: "Truyện ngắn",
    shortDirectionPh: "Hướng truyện ngắn (đề tài, không khí, twist)",
    shortChars: "Số ký tự",
    shortChapters: "Số chương",
    runShort: "Tạo truyện ngắn",
    statusIdle: "Sẵn sàng",
    statusBusy: "Đang xử lý",
    statusError: "Có lỗi",
    historyTitle: "Hoạt động",
    historyEmpty: "Chưa có hoạt động.",
    welcomeTitle: "Story Writer",
    welcomeBody: "Tạo dự án rồi tạo sách đầu tiên để bắt đầu pipeline.",
  },
  en: {
    back: "Back to home",
    title: "Story Writer",
    subtitle: "Long-form fiction studio with a Plan → Compose → Write → Audit → Revise pipeline.",
    project: "Project",
    addProject: "New project",
    projectNamePh: "Project name",
    activeBook: "Active book",
    pickBook: "Pick a book...",
    newBook: "New book",
    bookTitlePh: "Novel title",
    bookGenrePh: "Pick a genre",
    briefPh: "Existing brief / outline (optional)",
    authorIntentPh: "Author intent (long-term)",
    currentFocusPh: "Focus for the first 1-3 chapters",
    chapterWordsLabel: "Words / chapter",
    targetChaptersLabel: "Target chapters",
    architectRunning: "Architect is laying down the skeleton...",
    architectFailed: "Architect failed",
    confirm: "OK",
    cancel: "Cancel",
    save: "Save",
    saved: "Saved",
    chapters: "Chapters",
    addChapter: "Add chapter",
    chapterContextPh: "Context for this chapter (optional)",
    plan: "Plan",
    compose: "Compose",
    write: "Write",
    audit: "Audit",
    revise: "Revise",
    approve: "Approve",
    full: "Full pipeline",
    detect: "Detect AI-tell",
    statusPlanned: "Planned",
    statusDrafted: "Drafted",
    statusAudited: "Audited",
    statusApproved: "Approved",
    intent: "Intent",
    draft: "Draft",
    auditReport: "Audit report",
    overallScore: "Score",
    aiTellRate: "AI-tell",
    issues: "issues",
    noIssues: "No issues",
    snapshots: "Snapshots",
    restore: "Restore",
    truthFiles: "7 Truth Files",
    truthSelect: "Pick a truth file",
    tools: "Tools",
    style: "Style fingerprint",
    stylePh: "Paste sample text (1,000 - 60,000 chars)",
    analyzeStyle: "Analyze style",
    importTitle: "Import existing chapters",
    importPh: "Paste full text (each chapter starts with 'Chương N:' or '第X章')",
    runImport: "Import",
    renameTitle: "Whole-book rename",
    renameFromPh: "From",
    renameToPh: "To",
    runRename: "Rename",
    exportTitle: "Export",
    exportTxt: "Download TXT",
    exportMd: "Download Markdown",
    exportEpub: "Download EPUB",
    shortTitle: "Short story",
    shortDirectionPh: "Direction (theme, mood, twist)",
    shortChars: "Characters",
    shortChapters: "Chapters",
    runShort: "Generate short story",
    statusIdle: "Ready",
    statusBusy: "Working",
    statusError: "Error",
    historyTitle: "Activity",
    historyEmpty: "Nothing yet.",
    welcomeTitle: "Story Writer",
    welcomeBody: "Create a project, add a book, and the pipeline starts.",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

type ActivityEntry = { id: string; at: number; tone: "ok" | "info" | "warn" | "err"; message: string };

export function StoryWriterShell() {
  const { language, setLanguage } = useLanguage();
  const copy = swCopy[language];

  const [tab, setTab] = useState<Tab>("books");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResult, setSearchResult] = useState<SearchHit | null>(null);
  const [readingMode, setReadingMode] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [activeBookId, setActiveBookId] = useState<string>("");
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [truth, setTruth] = useState<TruthMap | null>(null);
  const [activeTruthKind, setActiveTruthKind] = useState<string>("current_state");
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string>("");
  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(null);

  const [busyKey, setBusyKey] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const [projectModal, setProjectModal] = useState(false);
  const [bookModal, setBookModal] = useState(false);
  const [chapterModal, setChapterModal] = useState(false);
  const [llmModal, setLlmModal] = useState(false);
  const [detectResult, setDetectResult] = useState<{
    heuristic: { matches: Array<{ label: string; count: number }>; ratePer1000: number };
    llm: {
      rate: number;
      flagged: Array<{ sentence: string; reason: string; severity: "low" | "medium" | "high" }>;
      recommendation: string;
    };
    wordCount: number;
  } | null>(null);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);

  const [llmDraft, setLlmDraft] = useState<{
    provider: "yunwu" | "custom";
    baseUrl: string;
    model: string;
    apiKey: string;
  }>({ provider: "yunwu", baseUrl: "", model: "", apiKey: "" });

  const [newProjectName, setNewProjectName] = useState("");
  const [newBook, setNewBook] = useState({
    title: "",
    genre: "",
    brief: "",
    authorIntent: "",
    currentFocus: "",
    chapterWords: 2400,
    targetChapters: 200,
  });
  const [newChapter, setNewChapter] = useState({ contextBrief: "" });

  const [styleSample, setStyleSample] = useState("");
  const [importText, setImportText] = useState("");
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [shortInput, setShortInput] = useState({ direction: "", genre: "", chars: 3000, chapters: 1 });
  const [shortResult, setShortResult] = useState<{
    title: string;
    fullMarkdown: string;
    salesPackage: { hookLines: string[]; socialPost: string; coverDescription: string };
    coverPrompt: string;
    wordCount: number;
  } | null>(null);

  const isBusy = busyKey !== "";
  const initialised = useRef(false);

  const log = (tone: ActivityEntry["tone"], message: string) =>
    setActivity((cur) =>
      [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), tone, message }, ...cur].slice(0, 30),
    );

  // Bootstrap: genres + projects.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    void (async () => {
      try {
        const [gRes, pRes] = await Promise.all([
          fetch("/api/story-writer/genres"),
          fetch("/api/story-writer/projects"),
        ]);
        const gJson = await safeParseJson(gRes);
        const pJson = await safeParseJson(pRes);
        if (gRes.ok) setGenres(gJson.genres ?? []);
        if (pRes.ok) {
          const list = (pJson.projects ?? []) as ProjectSummary[];
          setProjects(list);
          if (list[0]) setActiveProjectId(list[0].id);
        }
      } catch (err) {
        log("err", err instanceof Error ? err.message : "Khởi tạo thất bại");
      }
    })();
  }, []);

  // When project changes, load its books.
  useEffect(() => {
    if (!activeProjectId) {
      setBooks([]);
      setActiveBookId("");
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/story-writer/books?projectId=${activeProjectId}`);
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setBooks(json.books ?? []);
        if ((json.books ?? []).length && !activeBookId) {
          setActiveBookId(json.books[0].id);
        }
      } catch (err) {
        log("err", err instanceof Error ? err.message : "Tải sách thất bại");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  // When book changes, load detail + truth + chapters.
  useEffect(() => {
    if (!activeBookId) {
      setBookDetail(null);
      setTruth(null);
      setChapters([]);
      setActiveChapterId("");
      setChapterDetail(null);
      return;
    }
    void loadBook(activeBookId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBookId]);

  // When chapter changes, load detail.
  useEffect(() => {
    if (!activeChapterId) {
      setChapterDetail(null);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/story-writer/chapters/${activeChapterId}`);
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        setChapterDetail(json);
      } catch (err) {
        log("err", err instanceof Error ? err.message : "Tải chương thất bại");
      }
    })();
  }, [activeChapterId]);

  async function loadBook(id: string) {
    try {
      const [bRes, tRes, cRes] = await Promise.all([
        fetch(`/api/story-writer/books/${id}`),
        fetch(`/api/story-writer/books/${id}/truth`),
        fetch(`/api/story-writer/chapters?bookId=${id}`),
      ]);
      const bJson = await safeParseJson(bRes);
      const tJson = await safeParseJson(tRes);
      const cJson = await safeParseJson(cRes);
      if (!bRes.ok) throw new Error(bJson?.error || `HTTP ${bRes.status}`);
      setBookDetail(bJson);
      setTruth(tJson.truth ?? null);
      setChapters(cJson.chapters ?? []);
      if ((cJson.chapters ?? []).length && !activeChapterId) {
        setActiveChapterId(cJson.chapters[cJson.chapters.length - 1].id);
      }
    } catch (err) {
      log("err", err instanceof Error ? err.message : "Tải sách thất bại");
    }
  }

  async function safeRun<T>(key: string, fn: () => Promise<T>, successMessage?: string): Promise<T | null> {
    setBusyKey(key);
    setError("");
    try {
      const result = await fn();
      if (successMessage) log("ok", successMessage);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi";
      setError(msg);
      log("err", msg);
      return null;
    } finally {
      setBusyKey("");
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    const r = await safeRun("create-project", async () => {
      const res = await fetch("/api/story-writer/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json as ProjectSummary;
    }, `Tạo dự án "${newProjectName.trim()}"`);
    if (r) {
      setProjects((cur) => [r, ...cur]);
      setActiveProjectId(r.id);
      setNewProjectName("");
      setProjectModal(false);
    }
  }

  async function createBook() {
    const payload = { ...newBook, projectId: activeProjectId };
    if (!payload.title.trim() || !payload.genre || !payload.projectId) return;
    const r = await safeRun(
      "create-book",
      async () => {
        const res = await fetch("/api/story-writer/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json as { id: string; title: string; needsArchitect?: boolean };
      },
      `Đã tạo sách "${payload.title.trim()}"`,
    );
    if (r) {
      const summary: BookSummary = {
        id: r.id,
        title: payload.title.trim(),
        genre: payload.genre,
        status: "draft",
        chapterWords: payload.chapterWords,
        targetChapters: payload.targetChapters,
      };
      setBooks((cur) => [summary, ...cur]);
      setActiveBookId(r.id);
      setBookModal(false);
      setNewBook({ title: "", genre: "", brief: "", authorIntent: "", currentFocus: "", chapterWords: 2400, targetChapters: 200 });
      setTab("books");

      if (r.needsArchitect) {
        log("info", "Architect đang dựng khung truyện (1/2)...");
        await safeRun(
          "architect-skeleton",
          async () => {
            const res2 = await fetch(`/api/story-writer/books/${r.id}/architect-rerun?stage=skeleton`, {
              method: "POST",
            });
            const json2 = await safeParseJson(res2);
            if (!res2.ok) throw new Error(json2?.error || `HTTP ${res2.status}`);
            return json2;
          },
          "Architect khung xong",
        );
        log("info", "Architect đang reo hook truyện (2/2)...");
        await safeRun(
          "architect-truth",
          async () => {
            const res3 = await fetch(`/api/story-writer/books/${r.id}/architect-rerun?stage=truth`, {
              method: "POST",
            });
            const json3 = await safeParseJson(res3);
            if (!res3.ok) throw new Error(json3?.error || `HTTP ${res3.status}`);
            return json3;
          },
          "Architect truth xong",
        );
        await loadBook(r.id);
      }
      setTab("write");
    }
  }

  async function createChapter() {
    if (!activeBookId) return;
    const r = await safeRun(
      "create-chapter",
      async () => {
        const res = await fetch("/api/story-writer/chapters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: activeBookId, contextBrief: newChapter.contextBrief.trim() }),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json as { id: string; number: number; title: string; status: ChapterSummary["status"] };
      },
      "Tạo chương mới",
    );
    if (r) {
      setChapters((cur) =>
        [
          ...cur,
          { id: r.id, number: r.number, title: r.title, status: r.status, wordCount: 0 },
        ].sort((a, b) => a.number - b.number),
      );
      setActiveChapterId(r.id);
      setNewChapter({ contextBrief: "" });
      setChapterModal(false);
    }
  }

  async function runChapterAction(action: "plan" | "compose" | "write" | "audit" | "revise" | "approve" | "full" | "detect") {
    if (!activeChapterId) return;
    const path =
      action === "full"
        ? `/api/story-writer/chapters/${activeChapterId}/full`
        : `/api/story-writer/chapters/${activeChapterId}/${action}`;
    const successMessage = {
      plan: "Plan xong",
      compose: "Compose xong",
      write: "Bản nháp đã tạo",
      audit: "Đã audit",
      revise: "Đã revise",
      approve: "Đã duyệt + cập nhật truth",
      full: "Pipeline đầy đủ xong",
      detect: "Detect AI-tell xong",
    }[action];
    const r = await safeRun(
      `chapter-${action}`,
      async () => {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "full" ? JSON.stringify({ autoApprove: false, reviseRetries: 0 }) : "{}",
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json;
      },
      successMessage,
    );
    if (action === "detect" && r) {
      setDetectResult(r as typeof detectResult);
    }
    if (r && activeChapterId) {
      const reload = await fetch(`/api/story-writer/chapters/${activeChapterId}`);
      if (reload.ok) setChapterDetail(await safeParseJson(reload));
      // refresh chapter list status
      const list = await fetch(`/api/story-writer/chapters?bookId=${activeBookId}`);
      if (list.ok) setChapters((await safeParseJson(list)).chapters ?? []);
      // refresh truth in case of approve / full+autoApprove
      if (action === "approve" || action === "full") {
        const t = await fetch(`/api/story-writer/books/${activeBookId}/truth`);
        if (t.ok) setTruth((await t.json()).truth ?? null);
      }
    }
  }

  async function restoreSnapshot(index: number) {
    if (!activeChapterId) return;
    const r = await safeRun(
      "restore-snapshot",
      async () => {
        const res = await fetch(
          `/api/story-writer/chapters/${activeChapterId}/snapshots/${index}/restore`,
          { method: "POST" },
        );
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json;
      },
      `Khôi phục snapshot #${index + 1}`,
    );
    if (r && activeChapterId) {
      const reload = await fetch(`/api/story-writer/chapters/${activeChapterId}`);
      if (reload.ok) setChapterDetail(await safeParseJson(reload));
    }
  }

  async function deleteChapter(id: string) {
    if (!id) return;
    if (!window.confirm("Xoá chương này? Không thể khôi phục.")) return;
    const r = await safeRun("delete-chapter", async () => {
      const res = await fetch(`/api/story-writer/chapters/${id}`, { method: "DELETE" });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    }, "Đã xoá chương");
    if (r) {
      setChapters((cur) => cur.filter((c) => c.id !== id));
      if (activeChapterId === id) {
        setActiveChapterId("");
        setChapterDetail(null);
      }
    }
  }

  async function deleteBook(id: string) {
    if (!id) return;
    if (!window.confirm("Xoá toàn bộ sách (chương, truth, snapshot) — không thể khôi phục?")) return;
    const r = await safeRun("delete-book", async () => {
      const res = await fetch(`/api/story-writer/books/${id}`, { method: "DELETE" });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    }, "Đã xoá sách");
    if (r) {
      setBooks((cur) => cur.filter((b) => b.id !== id));
      if (activeBookId === id) setActiveBookId("");
    }
  }

  async function deleteProject(id: string) {
    if (!id) return;
    if (!window.confirm("Xoá toàn bộ dự án (mọi sách bên trong)?")) return;
    const r = await safeRun("delete-project", async () => {
      const res = await fetch(`/api/story-writer/projects/${id}`, { method: "DELETE" });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    }, "Đã xoá dự án");
    if (r) {
      setProjects((cur) => cur.filter((p) => p.id !== id));
      if (activeProjectId === id) setActiveProjectId("");
    }
  }

  async function loadStats() {
    if (!activeBookId) return;
    try {
      const res = await fetch(`/api/story-writer/books/${activeBookId}/stats`);
      const json = await safeParseJson(res);
      if (res.ok) setStats(json as StatsData);
    } catch (err) {
      log("err", err instanceof Error ? err.message : "Tải stats thất bại");
    }
  }

  async function runSearch() {
    if (!activeBookId || !searchQ.trim()) return;
    const r = await safeRun("search", async () => {
      const res = await fetch(`/api/story-writer/books/${activeBookId}/search?q=${encodeURIComponent(searchQ.trim())}`);
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json as SearchHit;
    });
    if (r) setSearchResult(r);
  }

  async function patchEntity(
    path: string,
    body: Record<string, unknown>,
    successMessage: string,
  ): Promise<unknown | null> {
    return safeRun(path, async () => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    }, successMessage);
  }

  async function characterOp(op: string, payload?: Record<string, unknown>, targetId?: string) {
    if (!activeBookId) return;
    const r = (await patchEntity(
      `/api/story-writer/books/${activeBookId}/characters`,
      { op, payload, targetId },
      `Cast: ${op}`,
    )) as { characters?: SwCharacter[]; relationships?: SwRelationship[] } | null;
    if (r && bookDetail) setBookDetail({ ...bookDetail, characters: r.characters, relationships: r.relationships });
  }

  async function foreshadowOp(op: string, payload?: Record<string, unknown>, targetId?: string) {
    if (!activeBookId) return;
    const r = (await patchEntity(
      `/api/story-writer/books/${activeBookId}/foreshadows`,
      { op, payload, targetId },
      `Foreshadow: ${op}`,
    )) as { foreshadows?: SwForeshadow[] } | null;
    if (r && bookDetail) setBookDetail({ ...bookDetail, foreshadows: r.foreshadows });
  }

  async function volumeOp(op: string, payload?: Record<string, unknown>, targetId?: string) {
    if (!activeBookId) return;
    const r = (await patchEntity(
      `/api/story-writer/books/${activeBookId}/volumes`,
      { op, payload, targetId },
      `Volume: ${op}`,
    )) as { volumes?: SwVolume[] } | null;
    if (r && bookDetail) setBookDetail({ ...bookDetail, volumes: r.volumes });
  }

  async function reviseAntiDetect() {
    if (!activeChapterId) return;
    await safeRun("chapter-revise-anti", async () => {
      const res = await fetch(`/api/story-writer/chapters/${activeChapterId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "anti-detect" }),
      });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    }, "Anti-detect rewrite xong");
    if (activeChapterId) {
      const reload = await fetch(`/api/story-writer/chapters/${activeChapterId}`);
      if (reload.ok) setChapterDetail(await safeParseJson(reload));
    }
  }

  async function generateCover() {
    if (!activeBookId || !coverPrompt.trim()) return;
    const r = await safeRun("cover", async () => {
      const res = await fetch(`/api/story-writer/books/${activeBookId}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: coverPrompt.trim(), aspectRatio: "3:4" }),
      });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json as { url: string };
    }, "Cover đã render");
    if (r) setCoverUrl(r.url);
  }

  async function architectRerun() {
    if (!activeBookId) return;
    if (!window.confirm("Chạy lại Architect sẽ ghi đè story bible / book rules / outline / characters / foreshadow / volumes. Tiếp tục?")) return;
    const r = await patchEntity(
      `/api/story-writer/books/${activeBookId}/architect-rerun`,
      {},
      "Architect re-run xong",
    );
    if (r && activeBookId) void loadBook(activeBookId);
  }

  async function bulkApprove() {
    if (!activeBookId) return;
    if (!window.confirm("Approve mọi chương đã drafted/audited và cập nhật truth files?")) return;
    const r = (await patchEntity(
      `/api/story-writer/books/${activeBookId}/bulk-approve`,
      {},
      "Bulk approve xong",
    )) as { processed?: number } | null;
    if (r) void loadBook(activeBookId);
  }

  async function duplicateBook() {
    if (!activeBookId) return;
    const newTitle = window.prompt("Tên sách clone:", `${bookDetail?.title ?? "Truyện"} (clone)`);
    if (!newTitle) return;
    const r = (await patchEntity(
      `/api/story-writer/books/${activeBookId}/duplicate`,
      { newTitle, copyChapters: true },
      "Đã clone book",
    )) as { id?: string } | null;
    if (r?.id) {
      const list = await fetch(`/api/story-writer/books?projectId=${activeProjectId}`);
      if (list.ok) setBooks((await safeParseJson(list)).books ?? []);
      setActiveBookId(r.id);
    }
  }

  async function saveChapterNotes(notes: string) {
    if (!activeChapterId) return;
    await safeRun("save-notes", async () => {
      const res = await fetch(`/api/story-writer/chapters/${activeChapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const json = await safeParseJson(res);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    }, "Đã lưu ghi chú");
  }

  // Auto load stats when entering Stats tab
  useEffect(() => {
    if (tab === "stats" && activeBookId) {
      void loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeBookId]);

  async function suggestBookSetting(topic: string, genre: string) {
    if (!topic.trim() || !genre) return;
    const r = await safeRun(
      "suggest",
      async () => {
        const res = await fetch("/api/story-writer/suggest-setting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, genre }),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json as { title: string; authorIntent: string; currentFocus: string; briefDraft: string };
      },
      "Đã đề xuất setting",
    );
    if (r) {
      setNewBook((cur) => ({
        ...cur,
        title: cur.title || r.title,
        authorIntent: r.authorIntent,
        currentFocus: r.currentFocus,
        brief: cur.brief || r.briefDraft,
      }));
    }
  }

  async function saveLlmConfig() {
    if (!activeBookId) return;
    const config =
      llmDraft.provider === "custom"
        ? llmDraft.baseUrl.trim() && llmDraft.model.trim() && llmDraft.apiKey.trim()
          ? {
              provider: "custom" as const,
              baseUrl: llmDraft.baseUrl.trim(),
              model: llmDraft.model.trim(),
              apiKey: llmDraft.apiKey.trim(),
            }
          : null
        : null;
    const r = await safeRun(
      "save-llm",
      async () => {
        const res = await fetch(`/api/story-writer/books/${activeBookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ llm: config }),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json;
      },
      config ? "Đã đổi sang provider tuỳ chỉnh" : "Đã reset về Yunwu mặc định",
    );
    if (r) {
      void loadBook(activeBookId);
      setLlmModal(false);
    }
  }

  async function saveTruth() {
    if (!activeBookId || !truth || !activeTruthKind) return;
    const current = truth[activeTruthKind];
    if (!current) return;
    const r = await safeRun(
      "save-truth",
      async () => {
        const res = await fetch(`/api/story-writer/books/${activeBookId}/truth`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: activeTruthKind, content: current.content }),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json;
      },
      `Đã lưu truth/${activeTruthKind}`,
    );
    if (r && truth) {
      setTruth({ ...truth, [activeTruthKind]: { content: r.content, version: r.version, updatedAt: r.updatedAt } });
    }
  }

  async function saveBookMeta() {
    if (!activeBookId || !bookDetail) return;
    await safeRun(
      "save-book",
      async () => {
        const res = await fetch(`/api/story-writer/books/${activeBookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorIntent: bookDetail.authorIntent,
            currentFocus: bookDetail.currentFocus,
            bookRules: bookDetail.bookRules,
            volumeOutline: bookDetail.volumeOutline,
          }),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json;
      },
      "Đã lưu metadata sách",
    );
  }

  async function analyzeStyle() {
    if (!activeBookId || !styleSample.trim()) return;
    await safeRun(
      "style",
      async () => {
        const res = await fetch(`/api/story-writer/books/${activeBookId}/style/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sample: styleSample.trim(), saveAsBookStyle: true }),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json;
      },
      "Style fingerprint đã lưu",
    );
  }

  async function importChapters() {
    if (!activeBookId || !importText.trim()) return;
    const r = await safeRun(
      "import",
      async () => {
        const res = await fetch(`/api/story-writer/books/${activeBookId}/import-chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: importText.trim(), reflect: true }),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json as { inserted: Array<{ id: string }>; skipped: number };
      },
    );
    if (r) {
      log("ok", `Import ${r.inserted.length} chương (skipped ${r.skipped})`);
      setImportText("");
      const list = await fetch(`/api/story-writer/chapters?bookId=${activeBookId}`);
      if (list.ok) setChapters((await safeParseJson(list)).chapters ?? []);
    }
  }

  async function runRename() {
    if (!activeBookId || !renameFrom.trim() || !renameTo.trim()) return;
    const r = await safeRun(
      "rename",
      async () => {
        const res = await fetch(`/api/story-writer/books/${activeBookId}/rename`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: renameFrom.trim(), to: renameTo.trim() }),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json as { bookHits: number; truthHits: number; chapterHits: number };
      },
    );
    if (r) {
      log("ok", `Rename: book=${r.bookHits}, truth=${r.truthHits}, chapter=${r.chapterHits}`);
      void loadBook(activeBookId);
    }
  }

  function exportBook(format: "txt" | "md" | "epub") {
    if (!activeBookId) return;
    window.open(`/api/story-writer/books/${activeBookId}/export?format=${format}`, "_blank");
  }

  async function runShort() {
    if (!shortInput.direction.trim() || !shortInput.genre) return;
    const r = await safeRun(
      "short",
      async () => {
        const res = await fetch("/api/story-writer/short", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shortInput),
        });
        const json = await safeParseJson(res);
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json as typeof shortResult;
      },
      "Truyện ngắn đã sinh",
    );
    if (r) setShortResult(r);
  }

  // Memo helpers
  const activeBookSummary = useMemo(() => books.find((b) => b.id === activeBookId), [books, activeBookId]);
  const activeChapter = useMemo(() => chapters.find((c) => c.id === activeChapterId), [chapters, activeChapterId]);

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0b0a08] text-[#e8dfd4]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 16% 10%, rgba(239,68,68,0.16), transparent 28%), radial-gradient(circle at 78% 12%, rgba(214,165,72,0.1), transparent 24%), linear-gradient(180deg,#0d0c0a 0%,#070604 100%)",
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
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#ef4444]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]">
            <PenLine className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#ef4444]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>

        <nav className="ml-1 hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Tabs">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-pressed={active}
                data-active={active}
                className={cn(
                  "playground-cap-pill flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition-[color,background-color,border-color,box-shadow] duration-300",
                  active
                    ? "border-[#ef4444]/50 bg-[#ef4444]/12 text-[#ffd7d3] playground-capability-armed shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]"
                    : "border-[#25211b] text-[#9a9087] hover:border-white/20 hover:text-[#f4eadc]",
                )}
              >
                <Icon className={cn("size-3.5 transition-transform duration-300", active && "scale-110")} />
                {language === "vi" ? item.vi : item.en}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#9f968b] sm:flex">
            <span
              className={cn(
                "size-1.5 rounded-full",
                error ? "bg-[#ef4444]" : isBusy ? "bg-[#d6a548] animate-pulse" : "bg-[#45a85d]",
              )}
            />
            {error ? copy.statusError : isBusy ? copy.statusBusy : copy.statusIdle}
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em]">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition",
                  language === option.value ? "bg-[#ef4444] text-[#090807]" : "text-[#9f968b] hover:text-[#f4eadc]",
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
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  active ? "border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ffd7d3]" : "border-[#25211b] text-[#9a9087]",
                )}
              >
                <Icon className="size-3" />
                {language === "vi" ? item.vi : item.en}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[#25211b] bg-[#0a0907]/72 lg:border-b-0 lg:border-r">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#ef4444]">{copy.project}</label>
                <button
                  type="button"
                  onClick={() => setProjectModal(true)}
                  className="flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087] transition hover:text-[#f4eadc]"
                >
                  <Plus className="size-3" />
                  {copy.addProject}
                </button>
              </div>
              <div className="relative">
                <select
                  value={activeProjectId}
                  onChange={(event) => setActiveProjectId(event.target.value)}
                  className="w-full appearance-none rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 pr-16 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {activeProjectId ? (
                  <button
                    type="button"
                    onClick={() => deleteProject(activeProjectId)}
                    aria-label="Xoá dự án"
                    className="absolute right-7 top-1/2 -translate-y-1/2 text-[#9a9087] transition hover:text-[#ffb4ad]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[#9a9087]" />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#ef4444]">{copy.activeBook}</label>
                <button
                  type="button"
                  onClick={() => setBookModal(true)}
                  disabled={!activeProjectId}
                  className="flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087] transition hover:text-[#f4eadc] disabled:opacity-40"
                >
                  <Plus className="size-3" />
                  {copy.newBook}
                </button>
              </div>
              <div className="relative">
                <select
                  value={activeBookId}
                  onChange={(event) => setActiveBookId(event.target.value)}
                  className="w-full appearance-none rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 pr-24 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
                >
                  <option value="">{copy.pickBook}</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>{b.title} · {b.genre}</option>
                  ))}
                </select>
                {activeBookId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (bookDetail?.llm) {
                          setLlmDraft({
                            provider: bookDetail.llm.provider as "yunwu" | "custom",
                            baseUrl: bookDetail.llm.baseUrl ?? "",
                            model: bookDetail.llm.model ?? "",
                            apiKey: bookDetail.llm.apiKey ?? "",
                          });
                        } else {
                          setLlmDraft({ provider: "yunwu", baseUrl: "", model: "", apiKey: "" });
                        }
                        setLlmModal(true);
                      }}
                      aria-label="LLM provider"
                      className="absolute right-12 top-1/2 -translate-y-1/2 text-[#9a9087] transition hover:text-[#cdf3fb]"
                    >
                      <Wrench className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBook(activeBookId)}
                      aria-label="Xoá sách"
                      className="absolute right-7 top-1/2 -translate-y-1/2 text-[#9a9087] transition hover:text-[#ffb4ad]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                ) : null}
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[#9a9087]" />
              </div>
            </div>

            {bookDetail ? (
              <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">{bookDetail.genre}</p>
                <h3 className="mt-1 truncate text-[0.95rem] font-bold text-[#f4eadc]">{bookDetail.title}</h3>
                <p className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                  {bookDetail.chapterWords} chữ × {bookDetail.targetChapters} ch · {bookDetail.status}
                </p>

                <div className="mt-3">
                  <label className="mb-1 block font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">Author intent</label>
                  <textarea
                    value={bookDetail.authorIntent}
                    onChange={(event) => setBookDetail({ ...bookDetail, authorIntent: event.target.value })}
                    rows={3}
                    className="playground-textarea-active w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-2 text-[0.74rem] leading-5 text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
                  />
                </div>
                <div className="mt-2">
                  <label className="mb-1 block font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">Current focus</label>
                  <textarea
                    value={bookDetail.currentFocus}
                    onChange={(event) => setBookDetail({ ...bookDetail, currentFocus: event.target.value })}
                    rows={3}
                    className="playground-textarea-active w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-2 text-[0.74rem] leading-5 text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveBookMeta}
                  disabled={busyKey === "save-book"}
                  className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#dff8e4] transition hover:bg-[#45a85d]/16 disabled:opacity-60"
                >
                  {busyKey === "save-book" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  {copy.save}
                </button>
              </div>
            ) : null}

            <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#d6a548]">{copy.historyTitle}</p>
              {activity.length === 0 ? (
                <p className="text-[0.7rem] text-[#9a9087]">{copy.historyEmpty}</p>
              ) : (
                <ul className="space-y-1.5">
                  {activity.slice(0, 8).map((entry) => (
                    <li
                      key={entry.id}
                      className={cn(
                        "rounded border px-2 py-1.5 text-[0.66rem] leading-5",
                        entry.tone === "ok" && "border-[#45a85d]/30 bg-[#45a85d]/8 text-[#dff8e4]",
                        entry.tone === "info" && "border-white/10 bg-white/[0.03] text-[#cfc4b8]",
                        entry.tone === "warn" && "border-[#d6a548]/30 bg-[#d6a548]/10 text-[#f0c86d]",
                        entry.tone === "err" && "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ffb4ad]",
                      )}
                    >
                      {entry.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error ? (
            <div className="shrink-0 border-t border-[#25211b] bg-[#08070680]/60 p-3">
              <div className="flex items-start gap-2 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-2.5 py-2 text-[0.7rem] leading-5 text-[#ffb4ad]">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="grid min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {!activeBookId ? (
              <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
                <div className="playground-fade-in flex size-14 items-center justify-center rounded-md border border-[#ef4444]/35 bg-[#ef4444]/10">
                  <PenLine className="size-6 animate-pulse text-[#ef4444]" />
                </div>
                <h3 className="playground-fade-in mt-4 text-2xl font-black tracking-[-0.04em] text-[#f4eadc]" style={{ animationDelay: "60ms" }}>
                  {copy.welcomeTitle}
                </h3>
                <p className="playground-fade-in mt-1 max-w-md text-sm leading-6 text-[#b5ab9f]" style={{ animationDelay: "120ms" }}>
                  {copy.welcomeBody}
                </p>
              </div>
            ) : tab === "books" ? (
              <BooksGrid books={books} activeBookId={activeBookId} onPick={setActiveBookId} bookDetail={bookDetail} />
            ) : tab === "write" ? (
              <ChapterEditor
                copy={copy}
                language={language}
                chapter={chapterDetail}
                isBusy={isBusy}
                busyKey={busyKey}
                onAction={runChapterAction}
                onRestoreSnapshot={restoreSnapshot}
                onDelete={deleteChapter}
                detectResult={detectResult}
                snapshotsOpen={snapshotsOpen}
                setSnapshotsOpen={setSnapshotsOpen}
                onAntiDetect={reviseAntiDetect}
                readingMode={readingMode}
                setReadingMode={setReadingMode}
                onSaveNotes={saveChapterNotes}
              />
            ) : tab === "cast" ? (
              <CastPanel
                copy={copy}
                bookDetail={bookDetail}
                onCharacterOp={characterOp}
                isBusy={isBusy}
              />
            ) : tab === "stats" ? (
              <StatsPanel copy={copy} stats={stats} reload={loadStats} isBusy={isBusy} />
            ) : tab === "search" ? (
              <SearchPanel
                copy={copy}
                query={searchQ}
                setQuery={setSearchQ}
                runSearch={runSearch}
                result={searchResult}
                isBusy={isBusy}
                onPickChapter={(chapterId) => {
                  setActiveChapterId(chapterId);
                  setTab("write");
                }}
              />
            ) : tab === "truth" ? (
              <TruthEditor
                copy={copy}
                truth={truth}
                kind={activeTruthKind}
                onPickKind={setActiveTruthKind}
                onChange={(content) => {
                  if (!truth) return;
                  setTruth({
                    ...truth,
                    [activeTruthKind]: {
                      ...(truth[activeTruthKind] ?? { version: 0, updatedAt: new Date().toISOString() }),
                      content,
                    },
                  });
                }}
                onSave={saveTruth}
                saving={busyKey === "save-truth"}
              />
            ) : (
              <ToolsPanel
                copy={copy}
                genres={genres}
                language={language}
                styleSample={styleSample}
                setStyleSample={setStyleSample}
                analyzeStyle={analyzeStyle}
                importText={importText}
                setImportText={setImportText}
                importChapters={importChapters}
                renameFrom={renameFrom}
                renameTo={renameTo}
                setRenameFrom={setRenameFrom}
                setRenameTo={setRenameTo}
                runRename={runRename}
                exportBook={exportBook}
                shortInput={shortInput}
                setShortInput={setShortInput}
                runShort={runShort}
                shortResult={shortResult}
                busyKey={busyKey}
                onArchitectRerun={architectRerun}
                onBulkApprove={bulkApprove}
                onDuplicate={duplicateBook}
                coverPrompt={coverPrompt}
                setCoverPrompt={setCoverPrompt}
                coverUrl={coverUrl}
                onGenerateCover={generateCover}
                onForeshadowOp={foreshadowOp}
                onVolumeOp={volumeOp}
                bookDetail={bookDetail}
              />
            )}
          </div>

          <aside className="hidden min-h-0 flex-col border-l border-[#25211b] bg-[#0a0907]/72 xl:flex">
            <div className="flex shrink-0 items-center justify-between border-b border-[#25211b] px-4 py-3">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#ef4444]">{copy.chapters}</p>
                <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                  {chapters.length} {activeBookSummary ? `/ ${activeBookSummary.targetChapters}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChapterModal(true)}
                disabled={!activeBookId}
                className="flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087] transition hover:border-[#ef4444]/35 hover:bg-[#ef4444]/10 hover:text-[#ffd7d3] disabled:opacity-40"
              >
                <Plus className="size-3" />
                {copy.addChapter}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {chapters.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex size-10 items-center justify-center rounded-md border border-[#25211b] bg-[#100d0a]/60 text-[#9a9087]">
                    <FileText className="size-4" />
                  </div>
                  <p className="mt-2 px-2 text-[0.7rem] leading-5 text-[#9a9087]">{copy.historyEmpty}</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {chapters.map((ch) => {
                    const active = ch.id === activeChapterId;
                    const statusLabel = {
                      planned: copy.statusPlanned,
                      drafted: copy.statusDrafted,
                      audited: copy.statusAudited,
                      approved: copy.statusApproved,
                    }[ch.status];
                    return (
                      <li key={ch.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChapterId(ch.id);
                            setTab("write");
                          }}
                          className={cn(
                            "playground-thumb block w-full rounded-md border px-3 py-2.5 text-left transition",
                            active ? "border-[#ef4444]/50 bg-[#1a0d0d]" : "border-[#25211b] bg-[#0d0b08]/82 hover:border-white/20",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#d6a548]">
                              {String(ch.number).padStart(3, "0")}
                            </span>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em]",
                                ch.status === "approved" && "bg-[#45a85d]/14 text-[#dff8e4]",
                                ch.status === "audited" && "bg-[#d6a548]/14 text-[#f0c86d]",
                                ch.status === "drafted" && "bg-[#47c9d9]/14 text-[#cdf3fb]",
                                ch.status === "planned" && "bg-white/[0.05] text-[#cfc4b8]",
                              )}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[0.78rem] font-bold text-[#f4eadc]">{ch.title}</p>
                          <p className="mt-1 flex items-center justify-between font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#756d64]">
                            <span>{ch.wordCount} chữ</span>
                            {typeof ch.auditScore === "number" ? <span>★ {ch.auditScore}</span> : null}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </div>

      {detectResult ? (
        <Modal
          title="AI-tell detection"
          onClose={() => setDetectResult(null)}
          confirmLabel={copy.confirm}
          onConfirm={() => setDetectResult(null)}
          wide
          copy={copy}
        >
          <div className="space-y-3 text-[0.78rem] leading-6 text-[#cfc4b8]">
            <div className="grid grid-cols-3 gap-2 rounded-md border border-[#25211b] bg-[#0c0a08] p-3 text-center">
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">Heuristic / 1k từ</p>
                <p className="mt-1 text-base font-bold text-[#f4eadc]">{detectResult.heuristic.ratePer1000.toFixed(1)}</p>
              </div>
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">LLM rate</p>
                <p className="mt-1 text-base font-bold text-[#f0c86d]">{Math.round(detectResult.llm.rate * 100)}%</p>
              </div>
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">Tổng từ</p>
                <p className="mt-1 text-base font-bold text-[#dff8e4]">{detectResult.wordCount}</p>
              </div>
            </div>

            {detectResult.heuristic.matches.length ? (
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">Pattern bắt được</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {detectResult.heuristic.matches.map((m) => (
                    <li
                      key={m.label}
                      className="rounded border border-[#d6a548]/30 bg-[#d6a548]/8 px-2 py-0.5 font-mono text-[0.6rem] text-[#f0c86d]"
                    >
                      {m.label} × {m.count}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detectResult.llm.flagged.length ? (
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">Câu nghi AI</p>
                <ul className="mt-1 max-h-72 space-y-1.5 overflow-y-auto">
                  {detectResult.llm.flagged.map((f, idx) => (
                    <li
                      key={idx}
                      className={cn(
                        "rounded border px-2 py-1.5 text-[0.74rem]",
                        f.severity === "high" && "border-[#ef4444]/35 bg-[#ef4444]/10 text-[#ffb4ad]",
                        f.severity === "medium" && "border-[#d6a548]/35 bg-[#d6a548]/10 text-[#f0c86d]",
                        f.severity === "low" && "border-white/10 bg-white/[0.03] text-[#cfc4b8]",
                      )}
                    >
                      <p>“{f.sentence}”</p>
                      <p className="mt-0.5 italic opacity-85">→ {f.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detectResult.llm.recommendation ? (
              <div className="rounded-md border border-[#45a85d]/30 bg-[#45a85d]/8 p-3 text-[#dff8e4]">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#dff8e4]">Gợi ý</p>
                <p className="mt-1 text-[0.76rem] leading-6">{detectResult.llm.recommendation}</p>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {llmModal ? (
        <Modal
          title="LLM provider cho sách"
          onClose={() => setLlmModal(false)}
          confirmLabel={copy.save}
          onConfirm={saveLlmConfig}
          confirmDisabled={
            busyKey === "save-llm" ||
            (llmDraft.provider === "custom" && (!llmDraft.baseUrl.trim() || !llmDraft.model.trim() || !llmDraft.apiKey.trim()))
          }
          loading={busyKey === "save-llm"}
          copy={copy}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLlmDraft({ ...llmDraft, provider: "yunwu" })}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  llmDraft.provider === "yunwu" ? "border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ffd7d3]" : "border-[#25211b] text-[#9a9087]",
                )}
              >
                Yunwu (mặc định)
              </button>
              <button
                type="button"
                onClick={() => setLlmDraft({ ...llmDraft, provider: "custom" })}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                  llmDraft.provider === "custom" ? "border-[#47c9d9]/50 bg-[#47c9d9]/10 text-[#cdf3fb]" : "border-[#25211b] text-[#9a9087]",
                )}
              >
                Custom (OpenAI-compatible)
              </button>
            </div>
            {llmDraft.provider === "custom" ? (
              <div className="space-y-2">
                <input
                  value={llmDraft.baseUrl}
                  onChange={(event) => setLlmDraft({ ...llmDraft, baseUrl: event.target.value })}
                  placeholder="Base URL (vd: https://api.openai.com/v1)"
                  className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#47c9d9]/60"
                />
                <input
                  value={llmDraft.model}
                  onChange={(event) => setLlmDraft({ ...llmDraft, model: event.target.value })}
                  placeholder="Model (vd: gpt-4o)"
                  className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#47c9d9]/60"
                />
                <input
                  value={llmDraft.apiKey}
                  onChange={(event) => setLlmDraft({ ...llmDraft, apiKey: event.target.value })}
                  placeholder="API key"
                  type="password"
                  className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#47c9d9]/60"
                />
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
                  Key chỉ áp dụng cho sách này, lưu vào MongoDB.
                </p>
              </div>
            ) : (
              <p className="text-[0.74rem] leading-5 text-[#9a9087]">
                Mọi agent (Architect, Planner, Writer, Auditor, Reviser, Reflector, Detect) sẽ dùng Yunwu/gpt-5.5 từ env mặc định.
              </p>
            )}
          </div>
        </Modal>
      ) : null}

      {projectModal ? (
        <Modal
          title={copy.addProject}
          onClose={() => setProjectModal(false)}
          confirmLabel={copy.confirm}
          onConfirm={createProject}
          confirmDisabled={!newProjectName.trim() || busyKey === "create-project"}
          loading={busyKey === "create-project"}
          copy={copy}
        >
          <input
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder={copy.projectNamePh}
            className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
        </Modal>
      ) : null}

      {bookModal ? (
        <Modal
          title={copy.newBook}
          onClose={() => setBookModal(false)}
          confirmLabel={copy.confirm}
          onConfirm={createBook}
          confirmDisabled={!newBook.title.trim() || !newBook.genre || !activeProjectId || busyKey === "create-book"}
          loading={busyKey === "create-book"}
          loadingHint={copy.architectRunning}
          wide
          copy={copy}
        >
          <div className="space-y-3">
            <input
              value={newBook.title}
              onChange={(event) => setNewBook({ ...newBook, title: event.target.value })}
              placeholder={copy.bookTitlePh}
              className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={newBook.genre}
                onChange={(event) => {
                  const g = genres.find((x) => x.id === event.target.value);
                  setNewBook({
                    ...newBook,
                    genre: event.target.value,
                    chapterWords: g?.defaultChapterWords ?? newBook.chapterWords,
                    targetChapters: g?.defaultTargetChapters ?? newBook.targetChapters,
                  });
                }}
                className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
              >
                <option value="">{copy.bookGenrePh}</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>{g.emoji} {g.labelVi}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newBook.chapterWords}
                  onChange={(event) => setNewBook({ ...newBook, chapterWords: Number(event.target.value) })}
                  placeholder={copy.chapterWordsLabel}
                  className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
                />
                <input
                  type="number"
                  value={newBook.targetChapters}
                  onChange={(event) => setNewBook({ ...newBook, targetChapters: Number(event.target.value) })}
                  placeholder={copy.targetChaptersLabel}
                  className="w-full rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
                />
              </div>
            </div>
            <textarea
              value={newBook.brief}
              onChange={(event) => setNewBook({ ...newBook, brief: event.target.value })}
              placeholder={copy.briefPh}
              rows={4}
              className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
            />
            <button
              type="button"
              onClick={() => suggestBookSetting(newBook.brief || newBook.title, newBook.genre)}
              disabled={(!newBook.brief.trim() && !newBook.title.trim()) || !newBook.genre || busyKey === "suggest"}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#d6a548]/35 bg-[#d6a548]/10 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f0c86d] transition hover:bg-[#d6a548]/16 disabled:opacity-60"
            >
              {busyKey === "suggest" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
              {language === "vi" ? "Gợi ý setting từ ý tưởng" : "Suggest setting from idea"}
            </button>
            <textarea
              value={newBook.authorIntent}
              onChange={(event) => setNewBook({ ...newBook, authorIntent: event.target.value })}
              placeholder={copy.authorIntentPh}
              rows={3}
              className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
            />
            <textarea
              value={newBook.currentFocus}
              onChange={(event) => setNewBook({ ...newBook, currentFocus: event.target.value })}
              placeholder={copy.currentFocusPh}
              rows={2}
              className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
            />
          </div>
        </Modal>
      ) : null}

      {chapterModal ? (
        <Modal
          title={copy.addChapter}
          onClose={() => setChapterModal(false)}
          confirmLabel={copy.confirm}
          onConfirm={createChapter}
          confirmDisabled={busyKey === "create-chapter"}
          loading={busyKey === "create-chapter"}
          copy={copy}
        >
          <textarea
            value={newChapter.contextBrief}
            onChange={(event) => setNewChapter({ contextBrief: event.target.value })}
            placeholder={copy.chapterContextPh}
            rows={4}
            className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
        </Modal>
      ) : null}
    </main>
  );
}

function Modal({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  loading,
  loadingHint,
  wide,
  copy,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
  loading?: boolean;
  loadingHint?: string;
  wide?: boolean;
  copy: typeof swCopy.vi;
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur">
      <div
        className={cn(
          "playground-fade-in w-full rounded-lg border border-[#25211b] bg-[#0d0b08]/96 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold tracking-[-0.02em] text-[#f4eadc]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-[#9a9087] transition hover:bg-white/5 hover:text-[#f4eadc]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div>{children}</div>
        {loading && loadingHint ? (
          <p className="mt-3 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#f0c86d]">
            <LoaderCircle className="size-3.5 animate-spin" />
            {loadingHint}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-white/10 bg-white/[0.03] px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#cfc4b8] transition hover:bg-white/[0.06]"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex h-9 items-center gap-2 rounded-md bg-[#ef4444] px-4 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#090807] transition hover:bg-[#ff5b55] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BooksGrid({
  books,
  activeBookId,
  onPick,
  bookDetail,
}: Readonly<{
  books: BookSummary[];
  activeBookId: string;
  onPick: (id: string) => void;
  bookDetail: BookDetail | null;
}>) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((b) => {
          const active = b.id === activeBookId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onPick(b.id)}
              className={cn(
                "playground-thumb rounded-lg border p-4 text-left transition",
                active ? "border-[#ef4444]/50 bg-[#1a0d0d]" : "border-[#25211b] bg-[#0d0b08]/82 hover:border-white/20",
              )}
            >
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">{b.genre}</p>
              <h3 className="mt-1 truncate text-[1.05rem] font-black tracking-[-0.02em] text-[#f4eadc]">{b.title}</h3>
              <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#756d64]">
                {b.chapterWords} chữ × {b.targetChapters} ch · {b.status}
              </p>
            </button>
          );
        })}
      </div>

      {bookDetail ? (
        <div className="space-y-4 rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-5">
          <h3 className="text-lg font-bold tracking-[-0.02em] text-[#f4eadc]">{bookDetail.title}</h3>
          <Section title="Story bible" body={bookDetail.storyBible} />
          <Section title="Book rules" body={bookDetail.bookRules} />
          <Section title="Volume outline" body={bookDetail.volumeOutline} />
          {bookDetail.styleGuide ? <Section title="Style guide" body={bookDetail.styleGuide} /> : null}
          {bookDetail.characters?.length ? (
            <div>
              <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">Cast</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {bookDetail.characters.map((c, idx) => (
                  <li key={`${c.name}-${idx}`} className="rounded-md border border-[#25211b] bg-[#0c0a08] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#f4eadc]">{c.name}</span>
                      <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#cfc4b8]">{c.role}</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-[0.74rem] leading-5 text-[#b5ab9f]">{c.profile}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, body }: Readonly<{ title: string; body: string }>) {
  if (!body?.trim()) return null;
  return (
    <div>
      <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">{title}</p>
      <pre className="whitespace-pre-wrap rounded-md border border-[#25211b] bg-[#0c0a08] p-3 text-[0.78rem] leading-6 text-[#cfc4b8]">{body}</pre>
    </div>
  );
}

function ChapterNotes({ notes, onSave }: Readonly<{ notes: string; onSave: (n: string) => void }>) {
  const [draft, setDraft] = useState(notes);
  useEffect(() => setDraft(notes), [notes]);
  return (
    <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
      <p className="mb-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">Ghi chú chương</p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder="Ghi chú riêng (không dùng cho writer)..."
        className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-2 text-[0.74rem] leading-5 text-[#f4eadc] outline-none focus:border-[#9a9087]/60"
      />
      {draft !== notes ? (
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="mt-2 flex h-8 items-center gap-1.5 rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-3 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#dff8e4]"
        >
          <Check className="size-3.5" /> Lưu
        </button>
      ) : null}
    </div>
  );
}

function CastPanel({
  copy,
  bookDetail,
  onCharacterOp,
  isBusy,
}: Readonly<{
  copy: typeof swCopy.vi;
  bookDetail: BookDetail | null;
  onCharacterOp: (op: string, payload?: Record<string, unknown>, targetId?: string) => Promise<void>;
  isBusy: boolean;
}>) {
  const [draft, setDraft] = useState({ name: "", role: "support", profile: "" });
  const [relDraft, setRelDraft] = useState({ from: "", to: "", kind: "knows", label: "" });
  const characters = bookDetail?.characters ?? [];
  const relationships = bookDetail?.relationships ?? [];
  if (!bookDetail) return <p className="text-center text-[0.78rem] text-[#9a9087]">—</p>;

  // Layout characters around a circle for SVG graph.
  const radius = 200;
  const cx = 260;
  const cy = 220;
  const positions = new Map<string, { x: number; y: number }>();
  characters.forEach((c, idx) => {
    const angle = (idx / Math.max(1, characters.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(c.id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  });

  const kindColor: Record<string, string> = {
    loves: "#ff7a99",
    hates: "#ef4444",
    rivals: "#f0c86d",
    knows: "#cfc4b8",
    parent_of: "#47c9d9",
    child_of: "#47c9d9",
    sibling: "#cdf3fb",
    mentor_of: "#dff8e4",
    ally: "#45a85d",
    owes: "#d6a548",
    secret_with: "#bfa1ff",
    betrayed_by: "#ff8a3d",
    custom: "#9a9087",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
        <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#ef4444]">Character graph</p>
        {characters.length === 0 ? (
          <p className="text-center text-[0.78rem] text-[#9a9087]">Chưa có nhân vật. Architect sẽ sinh khi tạo book.</p>
        ) : (
          <svg viewBox="0 0 520 440" className="mx-auto h-[440px] w-full max-w-[520px]">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="strokeWidth" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L0,10 L10,5 z" fill="#9a9087" />
              </marker>
            </defs>
            {relationships.map((r) => {
              const p1 = positions.get(r.fromCharacterId);
              const p2 = positions.get(r.toCharacterId);
              if (!p1 || !p2) return null;
              return (
                <g key={r.id}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={kindColor[r.kind] ?? "#9a9087"}
                    strokeWidth={1.5}
                    strokeOpacity={0.65}
                    markerEnd="url(#arrow)"
                  />
                  <text
                    x={(p1.x + p2.x) / 2}
                    y={(p1.y + p2.y) / 2 - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill={kindColor[r.kind] ?? "#9a9087"}
                  >
                    {r.label || r.kind}
                  </text>
                </g>
              );
            })}
            {characters.map((c) => {
              const p = positions.get(c.id);
              if (!p) return null;
              return (
                <g key={c.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={28}
                    fill="#14100d"
                    stroke={c.role === "protagonist" ? "#ef4444" : c.role === "villain" ? "#ff7a99" : "#d6a548"}
                    strokeWidth={2}
                  />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={10} fill="#f4eadc">
                    {c.name.slice(0, 8)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
          <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">Nhân vật</p>
          <ul className="space-y-2">
            {characters.map((c) => (
              <li key={c.id} className="rounded-md border border-[#25211b] bg-[#0c0a08] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#f4eadc]">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#cfc4b8]">{c.role}</span>
                    <button
                      type="button"
                      onClick={() => onCharacterOp("deleteCharacter", undefined, c.id)}
                      className="text-[#9a9087] hover:text-[#ffb4ad]"
                      aria-label="Xoá"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-3 text-[0.74rem] leading-5 text-[#b5ab9f]">{c.profile}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Tên nhân vật"
              className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
            />
            <select
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
            >
              {["protagonist", "ally", "rival", "love-interest", "mentor", "villain", "support"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <textarea
              value={draft.profile}
              onChange={(e) => setDraft({ ...draft, profile: e.target.value })}
              placeholder="Profile / mô tả"
              rows={2}
              className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                if (!draft.name.trim()) return;
                await onCharacterOp("addCharacter", { name: draft.name, role: draft.role, profile: draft.profile });
                setDraft({ name: "", role: "support", profile: "" });
              }}
              disabled={isBusy || !draft.name.trim()}
              className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#d6a548] px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#100b04] disabled:opacity-60"
            >
              <Plus className="size-3.5" /> Thêm
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
          <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#47c9d9]">Quan hệ</p>
          <ul className="space-y-1.5">
            {relationships.map((r) => {
              const from = characters.find((c) => c.id === r.fromCharacterId);
              const to = characters.find((c) => c.id === r.toCharacterId);
              if (!from || !to) return null;
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2 text-[0.78rem]">
                  <span>
                    <b className="text-[#f4eadc]">{from.name}</b>
                    <span className="mx-1 font-mono text-[0.6rem] uppercase tracking-[0.16em]" style={{ color: kindColor[r.kind] }}>
                      → {r.label || r.kind} →
                    </span>
                    <b className="text-[#f4eadc]">{to.name}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => onCharacterOp("deleteRelationship", undefined, r.id)}
                    className="text-[#9a9087] hover:text-[#ffb4ad]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              value={relDraft.from}
              onChange={(e) => setRelDraft({ ...relDraft, from: e.target.value })}
              className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
            >
              <option value="">From</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={relDraft.to}
              onChange={(e) => setRelDraft({ ...relDraft, to: e.target.value })}
              className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
            >
              <option value="">To</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={relDraft.kind}
              onChange={(e) => setRelDraft({ ...relDraft, kind: e.target.value })}
              className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
            >
              {Object.keys(kindColor).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input
              value={relDraft.label}
              onChange={(e) => setRelDraft({ ...relDraft, label: e.target.value })}
              placeholder="Label (tuỳ chọn)"
              className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                if (!relDraft.from || !relDraft.to) return;
                await onCharacterOp("addRelationship", {
                  fromCharacterId: relDraft.from,
                  toCharacterId: relDraft.to,
                  kind: relDraft.kind,
                  label: relDraft.label,
                });
                setRelDraft({ from: "", to: "", kind: "knows", label: "" });
              }}
              disabled={isBusy || !relDraft.from || !relDraft.to}
              className="col-span-2 flex h-9 items-center justify-center gap-2 rounded-md bg-[#47c9d9] px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#04141a] disabled:opacity-60"
            >
              <Plus className="size-3.5" /> Thêm quan hệ
            </button>
          </div>
        </div>
      </div>
      {void copy}
    </div>
  );
}

function StatsPanel({
  copy,
  stats,
  reload,
  isBusy,
}: Readonly<{
  copy: typeof swCopy.vi;
  stats: StatsData | null;
  reload: () => void;
  isBusy: boolean;
}>) {
  if (!stats) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <button
          type="button"
          onClick={reload}
          disabled={isBusy}
          className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#cfc4b8]"
        >
          <RefreshCw className="size-3.5" /> Tải stats
        </button>
      </div>
    );
  }
  const maxWords = Math.max(1, ...stats.wordCountSeries.map((p) => p.words));
  const cumulativeMax = Math.max(1, ...stats.wordCountSeries.map((p) => p.cumulative));

  void copy;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tổng chương" value={`${stats.summary.totalChapters} / ${stats.summary.targetChapters}`} accent="text-[#ef4444]" />
        <Stat label="Tổng chữ" value={`${stats.summary.totalWords.toLocaleString()} / ${stats.summary.targetWords.toLocaleString()}`} accent="text-[#d6a548]" />
        <Stat label="Audit score TB" value={`${stats.summary.avgAuditScore}`} accent="text-[#dff8e4]" />
        <Stat label="AI-tell TB" value={`${Math.round(stats.summary.avgAiTellRate * 100)}%`} accent="text-[#f0c86d]" />
      </div>

      <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
        <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">Chữ / chương</p>
        <div className="flex h-44 items-end gap-1 overflow-x-auto">
          {stats.wordCountSeries.map((p) => (
            <div
              key={p.number}
              title={`${p.number}: ${p.title} — ${p.words} chữ (cumulative ${p.cumulative})`}
              style={{ height: `${(p.words / maxWords) * 100}%` }}
              className="w-3 shrink-0 rounded-sm bg-[#ef4444]/70 transition hover:bg-[#ef4444]"
            />
          ))}
        </div>
        <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
          Cumulative max: {cumulativeMax.toLocaleString()}
        </p>
      </div>

      {stats.aiTellSeries.length ? (
        <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
          <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#f0c86d]">AI-tell rate / chương</p>
          <div className="flex h-32 items-end gap-1 overflow-x-auto">
            {stats.aiTellSeries.map((p) => (
              <div
                key={p.number}
                title={`Ch ${p.number}: ${Math.round(p.rate * 100)}% AI-tell, score ${p.score}`}
                style={{ height: `${Math.min(100, p.rate * 100)}%` }}
                className="w-3 shrink-0 rounded-sm bg-[#d6a548]/70"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent }: Readonly<{ label: string; value: string; accent: string }>) {
  return (
    <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tracking-[-0.02em]", accent)}>{value}</p>
    </div>
  );
}

function SearchPanel({
  copy,
  query,
  setQuery,
  runSearch,
  result,
  isBusy,
  onPickChapter,
}: Readonly<{
  copy: typeof swCopy.vi;
  query: string;
  setQuery: (q: string) => void;
  runSearch: () => void;
  result: SearchHit | null;
  isBusy: boolean;
  onPickChapter: (id: string) => void;
}>) {
  void copy;
  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Tìm xuyên truyện (tối thiểu 2 ký tự)..."
          className="flex-1 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#d6a548]/60"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={isBusy || !query.trim()}
          className="flex h-9 items-center gap-2 rounded-md bg-[#d6a548] px-4 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#100b04] disabled:opacity-60"
        >
          <SearchIcon className="size-3.5" /> Search
        </button>
      </div>
      {result ? (
        <div className="space-y-3">
          {result.meta.length ? (
            <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">Trong metadata</p>
              {result.meta.map((m) => (
                <div key={m.field} className="mt-2">
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">{m.field}</p>
                  {m.matches.map((mm, idx) => (
                    <p key={idx} className="mt-0.5 text-[0.74rem] leading-5 text-[#cfc4b8]">{mm.excerpt}</p>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          {result.truth.length ? (
            <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#47c9d9]">Trong truth files</p>
              {result.truth.map((t) => (
                <div key={t.kind} className="mt-2">
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">{t.kind}</p>
                  {t.matches.map((mm, idx) => (
                    <p key={idx} className="mt-0.5 text-[0.74rem] leading-5 text-[#cfc4b8]">{mm.excerpt}</p>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          {result.chapters.length ? (
            <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#ef4444]">Trong chương</p>
              {result.chapters.map((c) => (
                <button
                  key={c.chapterId}
                  type="button"
                  onClick={() => onPickChapter(c.chapterId)}
                  className="mt-2 block w-full rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2 text-left transition hover:border-[#ef4444]/30"
                >
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#d6a548]">Chương {c.number}: {c.title}</p>
                  {c.matches.map((mm, idx) => (
                    <p key={idx} className="mt-0.5 text-[0.74rem] leading-5 text-[#cfc4b8]">{mm.excerpt}</p>
                  ))}
                </button>
              ))}
            </div>
          ) : null}
          {result.meta.length === 0 && result.truth.length === 0 && result.chapters.length === 0 ? (
            <p className="text-center text-[0.78rem] text-[#9a9087]">Không có kết quả khớp.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChapterEditor({
  copy,
  language,
  chapter,
  isBusy,
  busyKey,
  onAction,
  onRestoreSnapshot,
  onDelete,
  detectResult,
  snapshotsOpen,
  setSnapshotsOpen,
  onAntiDetect,
  readingMode,
  setReadingMode,
  onSaveNotes,
}: Readonly<{
  copy: typeof swCopy.vi;
  language: WebLanguage;
  chapter: ChapterDetail | null;
  isBusy: boolean;
  busyKey: string;
  onAction: (action: "plan" | "compose" | "write" | "audit" | "revise" | "approve" | "full" | "detect") => void;
  onRestoreSnapshot: (index: number) => void;
  onDelete: (id: string) => void;
  detectResult: null | {
    heuristic: { matches: Array<{ label: string; count: number }>; ratePer1000: number };
    llm: { rate: number; flagged: Array<{ sentence: string }>; recommendation: string };
    wordCount: number;
  };
  snapshotsOpen: boolean;
  setSnapshotsOpen: (v: boolean) => void;
  onAntiDetect: () => void;
  readingMode: boolean;
  setReadingMode: (v: boolean) => void;
  onSaveNotes: (notes: string) => void;
}>) {
  if (!chapter) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="playground-fade-in flex size-14 items-center justify-center rounded-md border border-[#ef4444]/35 bg-[#ef4444]/10">
          <FileText className="size-6 text-[#ef4444]" />
        </div>
        <p className="playground-fade-in mt-3 max-w-md text-sm leading-6 text-[#b5ab9f]" style={{ animationDelay: "60ms" }}>
          {copy.welcomeBody}
        </p>
      </div>
    );
  }

  const actions = [
    { id: "plan", label: copy.plan, color: "bg-[#d6a548]/15 text-[#f0c86d] border-[#d6a548]/35" },
    { id: "compose", label: copy.compose, color: "bg-[#47c9d9]/12 text-[#cdf3fb] border-[#47c9d9]/35" },
    { id: "write", label: copy.write, color: "bg-[#ef4444]/12 text-[#ffd7d3] border-[#ef4444]/35" },
    { id: "audit", label: copy.audit, color: "bg-[#d6a548]/12 text-[#f0c86d] border-[#d6a548]/35" },
    { id: "revise", label: copy.revise, color: "bg-[#47c9d9]/10 text-[#cdf3fb] border-[#47c9d9]/30" },
    { id: "approve", label: copy.approve, color: "bg-[#45a85d]/14 text-[#dff8e4] border-[#45a85d]/45" },
    { id: "full", label: copy.full, color: "bg-[#ef4444] text-[#090807] border-[#ef4444]" },
    { id: "detect", label: copy.detect, color: "bg-white/5 text-[#cfc4b8] border-white/10" },
  ] as const;

  void language;
  void detectResult;

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2.5">
        <div>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">Chương {chapter.number}</p>
          <h3 className="mt-0.5 truncate text-base font-bold text-[#f4eadc]">{chapter.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {actions.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => onAction(act.id)}
              disabled={isBusy}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-50",
                act.color,
              )}
            >
              {busyKey === `chapter-${act.id}` ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {act.label}
            </button>
          ))}
          {chapter.snapshots && chapter.snapshots.length ? (
            <button
              type="button"
              onClick={() => setSnapshotsOpen(!snapshotsOpen)}
              className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#cfc4b8] transition hover:bg-white/[0.06]"
            >
              <RefreshCw className="size-3.5" />
              {copy.snapshots} ({chapter.snapshots.length})
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAntiDetect}
            disabled={isBusy || !chapter.draft}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#bfa1ff]/35 bg-[#bfa1ff]/10 px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#bfa1ff] transition hover:bg-[#bfa1ff]/16 disabled:opacity-60"
          >
            {busyKey === "chapter-revise-anti" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
            Anti-AI rewrite
          </button>
          <button
            type="button"
            onClick={() => setReadingMode(!readingMode)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#cfc4b8] transition hover:bg-white/[0.06]"
          >
            {readingMode ? <Maximize2 className="size-3.5" /> : <Eye className="size-3.5" />}
            {readingMode ? "Thoát" : "Đọc"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(chapter.id)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#ffb4ad] transition hover:bg-[#ef4444]/16"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {chapter.intent ? (
        <details className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3" open>
          <summary className="cursor-pointer font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">{copy.intent}</summary>
          <pre className="mt-2 whitespace-pre-wrap text-[0.78rem] leading-6 text-[#cfc4b8]">{chapter.intent}</pre>
        </details>
      ) : null}

      {snapshotsOpen && chapter.snapshots?.length ? (
        <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">{copy.snapshots}</p>
          <ul className="mt-2 space-y-1.5">
            {chapter.snapshots.map((snap) => (
              <li
                key={snap.index}
                className="flex items-start justify-between gap-3 rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087]">
                    #{snap.index + 1} · {new Date(snap.at).toLocaleString()} · {snap.label || "snapshot"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[0.74rem] leading-5 text-[#cfc4b8]">{snap.preview}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRestoreSnapshot(snap.index)}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-3 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#dff8e4] transition hover:bg-[#45a85d]/16"
                >
                  <RefreshCw className="size-3" />
                  {copy.restore}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={cn("flex-1 overflow-y-auto rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-5", readingMode && "fixed inset-0 z-40 m-6 max-w-none p-10 text-[1.05rem] leading-9")}>
        {chapter.draft ? (
          <pre className={cn("playground-result-arrive whitespace-pre-wrap text-[#f4eadc]", readingMode ? "text-[1.05rem] leading-9 mx-auto max-w-3xl" : "text-[0.86rem] leading-7")}>{chapter.draft}</pre>
        ) : (
          <p className="text-center text-[0.78rem] text-[#9a9087]">{copy.draft}: —</p>
        )}
      </div>

      <ChapterNotes notes={chapter.notes ?? ""} onSave={onSaveNotes} />

      {chapter.auditReport ? (
        <div className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">{copy.auditReport}</p>
            <div className="flex gap-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#cfc4b8]">
              <span>{copy.overallScore}: <b className="text-[#dff8e4]">{chapter.auditReport.overallScore}</b></span>
              <span>{copy.aiTellRate}: <b className="text-[#f0c86d]">{Math.round(chapter.auditReport.aiTellRate * 100)}%</b></span>
              <span>{chapter.auditReport.issues.length} {copy.issues}</span>
            </div>
          </div>
          {chapter.auditReport.issues.length ? (
            <ul className="mt-2 space-y-1.5">
              {chapter.auditReport.issues.map((iss, idx) => (
                <li
                  key={`${iss.dimension}-${idx}`}
                  className={cn(
                    "rounded border px-2 py-1.5 text-[0.7rem] leading-5",
                    iss.severity === "high" && "border-[#ef4444]/35 bg-[#ef4444]/10 text-[#ffb4ad]",
                    iss.severity === "medium" && "border-[#d6a548]/35 bg-[#d6a548]/10 text-[#f0c86d]",
                    iss.severity === "low" && "border-white/10 bg-white/[0.03] text-[#cfc4b8]",
                  )}
                >
                  <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] opacity-80">{iss.dimension}</span>
                  <p className="mt-0.5">{iss.message}</p>
                  {iss.suggestion ? <p className="mt-1 italic opacity-85">→ {iss.suggestion}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[0.74rem] text-[#9a9087]">{copy.noIssues}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TruthEditor({
  copy,
  truth,
  kind,
  onPickKind,
  onChange,
  onSave,
  saving,
}: Readonly<{
  copy: typeof swCopy.vi;
  truth: TruthMap | null;
  kind: string;
  onPickKind: (kind: string) => void;
  onChange: (content: string) => void;
  onSave: () => void;
  saving: boolean;
}>) {
  if (!truth) {
    return <p className="text-center text-[0.78rem] text-[#9a9087]">—</p>;
  }
  const current = truth[kind];
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {TRUTH_KINDS.map((t) => {
          const active = t.id === kind;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPickKind(t.id)}
              className={cn(
                "h-9 rounded-md border px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition",
                active ? "border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ffd7d3]" : "border-[#25211b] text-[#9a9087] hover:text-[#f4eadc]",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-3">
        <textarea
          value={current?.content ?? ""}
          onChange={(event) => onChange(event.target.value)}
          rows={28}
          className="playground-textarea-active h-full w-full resize-none rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 font-mono text-[0.82rem] leading-6 text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">
        <span>v{current?.version ?? 0}</span>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-9 items-center gap-2 rounded-md bg-[#45a85d] px-4 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#061009] transition hover:bg-[#58c772] disabled:opacity-60"
        >
          {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {copy.save}
        </button>
      </div>
    </div>
  );
}

function ForeshadowList({
  bookDetail,
  onOp,
  busyKey,
}: Readonly<{
  bookDetail: BookDetail | null;
  onOp: (op: string, payload?: Record<string, unknown>, targetId?: string) => Promise<void>;
  busyKey: string;
}>) {
  const [draft, setDraft] = useState({ summary: "", expectedResolutionChapter: "" });
  const items = bookDetail?.foreshadows ?? [];
  void busyKey;
  return (
    <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
      <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">Foreshadow ({items.length})</p>
      <ul className="space-y-1.5">
        {items.map((f) => (
          <li key={f.id} className="rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2 text-[0.78rem]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#d6a548]">{f.id}</span>
              <select
                value={f.status}
                onChange={(e) => void onOp("update", { status: e.target.value }, f.id)}
                className="rounded border border-[#2a251f] bg-[#0c0a08] px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#cfc4b8]"
              >
                {["open", "progressing", "deferred", "resolved"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                type="button"
                onClick={() => void onOp("delete", undefined, f.id)}
                className="text-[#9a9087] hover:text-[#ffb4ad]"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 leading-5 text-[#cfc4b8]">{f.summary}</p>
            {f.expectedResolutionChapter ? (
              <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#9a9087]">→ chương {f.expectedResolutionChapter}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-3 grid gap-2">
        <textarea
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          rows={2}
          placeholder="Mô tả foreshadow / hook"
          className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
        />
        <input
          type="number"
          value={draft.expectedResolutionChapter}
          onChange={(e) => setDraft({ ...draft, expectedResolutionChapter: e.target.value })}
          placeholder="Dự kiến đóng ở chương..."
          className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
        />
        <button
          type="button"
          onClick={async () => {
            if (!draft.summary.trim()) return;
            const payload: Record<string, unknown> = { summary: draft.summary };
            if (draft.expectedResolutionChapter) payload.expectedResolutionChapter = Number(draft.expectedResolutionChapter);
            await onOp("add", payload);
            setDraft({ summary: "", expectedResolutionChapter: "" });
          }}
          disabled={!draft.summary.trim()}
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#d6a548] px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#100b04] disabled:opacity-60"
        >
          <Plus className="size-3.5" /> Thêm
        </button>
      </div>
    </div>
  );
}

function VolumeList({
  bookDetail,
  onOp,
  busyKey,
}: Readonly<{
  bookDetail: BookDetail | null;
  onOp: (op: string, payload?: Record<string, unknown>, targetId?: string) => Promise<void>;
  busyKey: string;
}>) {
  const [draft, setDraft] = useState({ title: "", summary: "", startChapter: "1", endChapter: "" });
  const items = bookDetail?.volumes ?? [];
  void busyKey;
  return (
    <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
      <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#47c9d9]">Volumes ({items.length})</p>
      <ul className="space-y-1.5">
        {items.map((v) => (
          <li key={v.id} className="rounded-md border border-[#25211b] bg-[#0c0a08] px-3 py-2 text-[0.78rem]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#47c9d9]">Q.{v.number}</span>
              <select
                value={v.status}
                onChange={(e) => void onOp("update", { status: e.target.value }, v.id)}
                className="rounded border border-[#2a251f] bg-[#0c0a08] px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#cfc4b8]"
              >
                {["planned", "writing", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                type="button"
                onClick={() => void onOp("delete", undefined, v.id)}
                className="text-[#9a9087] hover:text-[#ffb4ad]"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 font-bold text-[#f4eadc]">{v.title}</p>
            <p className="mt-0.5 text-[0.74rem] leading-5 text-[#b5ab9f]">{v.summary}</p>
            <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#756d64]">Ch {v.startChapter}{v.endChapter ? `–${v.endChapter}` : "+"}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid gap-2">
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Tên quyển"
          className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
        />
        <textarea
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          rows={2}
          placeholder="Tóm tắt quyển"
          className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={draft.startChapter}
            onChange={(e) => setDraft({ ...draft, startChapter: e.target.value })}
            placeholder="Bắt đầu"
            className="w-1/2 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
          />
          <input
            type="number"
            value={draft.endChapter}
            onChange={(e) => setDraft({ ...draft, endChapter: e.target.value })}
            placeholder="Kết (tuỳ chọn)"
            className="w-1/2 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none"
          />
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!draft.title.trim()) return;
            const payload: Record<string, unknown> = {
              title: draft.title,
              summary: draft.summary,
              startChapter: Number(draft.startChapter || 1),
            };
            if (draft.endChapter) payload.endChapter = Number(draft.endChapter);
            await onOp("add", payload);
            setDraft({ title: "", summary: "", startChapter: "1", endChapter: "" });
          }}
          disabled={!draft.title.trim()}
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#47c9d9] px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#04141a] disabled:opacity-60"
        >
          <Plus className="size-3.5" /> Thêm quyển
        </button>
      </div>
    </div>
  );
}

function ToolsPanel({
  copy,
  genres,
  language,
  styleSample,
  setStyleSample,
  analyzeStyle,
  importText,
  setImportText,
  importChapters,
  renameFrom,
  renameTo,
  setRenameFrom,
  setRenameTo,
  runRename,
  exportBook,
  shortInput,
  setShortInput,
  runShort,
  shortResult,
  busyKey,
  onArchitectRerun,
  onBulkApprove,
  onDuplicate,
  coverPrompt,
  setCoverPrompt,
  coverUrl,
  onGenerateCover,
  onForeshadowOp,
  onVolumeOp,
  bookDetail,
}: Readonly<{
  copy: typeof swCopy.vi;
  genres: Genre[];
  language: WebLanguage;
  styleSample: string;
  setStyleSample: (s: string) => void;
  analyzeStyle: () => void;
  importText: string;
  setImportText: (s: string) => void;
  importChapters: () => void;
  renameFrom: string;
  renameTo: string;
  setRenameFrom: (s: string) => void;
  setRenameTo: (s: string) => void;
  runRename: () => void;
  exportBook: (format: "txt" | "md" | "epub") => void;
  shortInput: { direction: string; genre: string; chars: number; chapters: number };
  setShortInput: (v: { direction: string; genre: string; chars: number; chapters: number }) => void;
  runShort: () => void;
  shortResult: null | {
    title: string;
    fullMarkdown: string;
    salesPackage: { hookLines: string[]; socialPost: string; coverDescription: string };
    coverPrompt: string;
    wordCount: number;
  };
  busyKey: string;
  onArchitectRerun: () => void;
  onBulkApprove: () => void;
  onDuplicate: () => void;
  coverPrompt: string;
  setCoverPrompt: (s: string) => void;
  coverUrl: string;
  onGenerateCover: () => void;
  onForeshadowOp: (op: string, payload?: Record<string, unknown>, targetId?: string) => Promise<void>;
  onVolumeOp: (op: string, payload?: Record<string, unknown>, targetId?: string) => Promise<void>;
  bookDetail: BookDetail | null;
}>) {
  return (
    <div className="mx-auto grid max-w-5xl gap-3 lg:grid-cols-2">
      <div className="rounded-lg border border-[#ef4444]/30 bg-[#1a0d0d]/82 p-4 lg:col-span-2">
        <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#ef4444]">Bulk operations</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onArchitectRerun}
            disabled={busyKey !== ""}
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#d6a548]/35 bg-[#d6a548]/10 px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#f0c86d] disabled:opacity-60"
          >
            {busyKey === "/api/story-writer/books/" + (bookDetail?.id ?? "") + "/architect-rerun" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
            Architect re-run
          </button>
          <button
            type="button"
            onClick={onBulkApprove}
            disabled={busyKey !== ""}
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#dff8e4] disabled:opacity-60"
          >
            <Check className="size-3.5" />
            Bulk approve
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            disabled={busyKey !== ""}
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#47c9d9]/35 bg-[#47c9d9]/10 px-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-[#cdf3fb] disabled:opacity-60"
          >
            <Copy className="size-3.5" />
            Duplicate book
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4 lg:col-span-2">
        <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">Cover generator</p>
        <textarea
          value={coverPrompt}
          onChange={(e) => setCoverPrompt(e.target.value)}
          rows={3}
          placeholder="Prompt cho cover (English, ~50–90 từ)..."
          className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-[0.8rem] leading-6 text-[#f4eadc] outline-none focus:border-[#d6a548]/60"
        />
        <button
          type="button"
          onClick={onGenerateCover}
          disabled={!coverPrompt.trim() || busyKey === "cover"}
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#d6a548] px-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[#100b04] disabled:opacity-60"
        >
          {busyKey === "cover" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Render cover (Imagen 4)
        </button>
        {coverUrl ? (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="cover" className="max-h-80 w-full rounded-md object-contain" />
            <a
              href={coverUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.03] font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#cfc4b8]"
            >
              <Download className="size-3.5" /> Tải về
            </a>
          </div>
        ) : null}
      </div>

      <ForeshadowList bookDetail={bookDetail} onOp={onForeshadowOp} busyKey={busyKey} />
      <VolumeList bookDetail={bookDetail} onOp={onVolumeOp} busyKey={busyKey} />

      <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
        <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#d6a548]">{copy.style}</p>
        <textarea
          value={styleSample}
          onChange={(event) => setStyleSample(event.target.value)}
          rows={6}
          placeholder={copy.stylePh}
          className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-[0.8rem] leading-6 text-[#f4eadc] outline-none focus:border-[#d6a548]/60"
        />
        <button
          type="button"
          onClick={analyzeStyle}
          disabled={!styleSample.trim() || busyKey === "style"}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#d6a548] px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#100b04] transition hover:bg-[#e8b859] disabled:opacity-60"
        >
          {busyKey === "style" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
          {copy.analyzeStyle}
        </button>
      </div>

      <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
        <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#47c9d9]">{copy.importTitle}</p>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={6}
          placeholder={copy.importPh}
          className="w-full resize-y rounded-md border border-[#2a251f] bg-[#0c0a08] p-3 text-[0.8rem] leading-6 text-[#f4eadc] outline-none focus:border-[#47c9d9]/60"
        />
        <button
          type="button"
          onClick={importChapters}
          disabled={!importText.trim() || busyKey === "import"}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#47c9d9] px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#04141a] transition hover:bg-[#5fd6e4] disabled:opacity-60"
        >
          {busyKey === "import" ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {copy.runImport}
        </button>
      </div>

      <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
        <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#ef4444]">{copy.renameTitle}</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={renameFrom}
            onChange={(event) => setRenameFrom(event.target.value)}
            placeholder={copy.renameFromPh}
            className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
          <input
            value={renameTo}
            onChange={(event) => setRenameTo(event.target.value)}
            placeholder={copy.renameToPh}
            className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
        </div>
        <button
          type="button"
          onClick={runRename}
          disabled={!renameFrom.trim() || !renameTo.trim() || busyKey === "rename"}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#ef4444] px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#090807] transition hover:bg-[#ff5b55] disabled:opacity-60"
        >
          {busyKey === "rename" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          {copy.runRename}
        </button>
      </div>

      <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4">
        <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#45a85d]">{copy.exportTitle}</p>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => exportBook("txt")}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-[#45a85d]/35 bg-[#45a85d]/10 px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#dff8e4] transition hover:bg-[#45a85d]/16"
          >
            <Download className="size-3.5" />
            {copy.exportTxt}
          </button>
          <button
            type="button"
            onClick={() => exportBook("md")}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-[#d6a548]/35 bg-[#d6a548]/10 px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f0c86d] transition hover:bg-[#d6a548]/16"
          >
            <Download className="size-3.5" />
            {copy.exportMd}
          </button>
          <button
            type="button"
            onClick={() => exportBook("epub")}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-[#47c9d9]/35 bg-[#47c9d9]/10 px-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#cdf3fb] transition hover:bg-[#47c9d9]/16"
          >
            <Download className="size-3.5" />
            {copy.exportEpub}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-4 lg:col-span-2">
        <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#ef4444]">{copy.shortTitle}</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={shortInput.direction}
            onChange={(event) => setShortInput({ ...shortInput, direction: event.target.value })}
            placeholder={copy.shortDirectionPh}
            className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
          <select
            value={shortInput.genre}
            onChange={(event) => setShortInput({ ...shortInput, genre: event.target.value })}
            className="rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          >
            <option value="">{language === "vi" ? "Thể loại" : "Genre"}</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.emoji} {g.labelVi}</option>
            ))}
          </select>
          <input
            type="number"
            value={shortInput.chars}
            onChange={(event) => setShortInput({ ...shortInput, chars: Number(event.target.value) })}
            placeholder={copy.shortChars}
            className="w-24 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
          <input
            type="number"
            value={shortInput.chapters}
            onChange={(event) => setShortInput({ ...shortInput, chapters: Number(event.target.value) })}
            placeholder={copy.shortChapters}
            className="w-20 rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 text-sm text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
          />
        </div>
        <button
          type="button"
          onClick={runShort}
          disabled={!shortInput.direction.trim() || !shortInput.genre || busyKey === "short"}
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#ef4444] px-3 font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#090807] transition hover:bg-[#ff5b55] disabled:opacity-60"
        >
          {busyKey === "short" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {copy.runShort}
        </button>
        {shortResult ? (
          <div className="mt-3 rounded-md border border-[#25211b] bg-[#0c0a08] p-4">
            <h4 className="text-base font-bold text-[#f4eadc]">{shortResult.title}</h4>
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#756d64]">{shortResult.wordCount} chữ</p>
            <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-[0.78rem] leading-6 text-[#cfc4b8]">{shortResult.fullMarkdown}</pre>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">Hook lines</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[0.74rem] leading-5 text-[#cfc4b8]">
                  {shortResult.salesPackage.hookLines.map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">Cover prompt</p>
                <p className="mt-1 text-[0.74rem] leading-5 text-[#cfc4b8]">{shortResult.coverPrompt}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

void Copy;
void Sparkles;
