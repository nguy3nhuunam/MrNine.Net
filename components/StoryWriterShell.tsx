"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  LoaderCircle,
  PenLine,
  Plus,
  RefreshCw,
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

type Tab = "books" | "write" | "truth" | "tools";

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
  characters?: Array<{ name: string; role: string; profile: string }>;
};

type TruthMap = Record<
  string,
  { content: string; version: number; updatedAt: string } | null
>;

const TABS: ReadonlyArray<{ id: Tab; vi: string; en: string; icon: typeof BookOpen }> = [
  { id: "books", vi: "Sách", en: "Books", icon: BookOpen },
  { id: "write", vi: "Viết", en: "Write", icon: PenLine },
  { id: "truth", vi: "Truth", en: "Truth", icon: ShieldCheck },
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
        const gJson = await gRes.json();
        const pJson = await pRes.json();
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
        const json = await res.json();
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
        const json = await res.json();
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
      const bJson = await bRes.json();
      const tJson = await tRes.json();
      const cJson = await cRes.json();
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
      const json = await res.json();
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
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json as { id: string; title: string };
      },
      `Architect tạo sách "${payload.title.trim()}"`,
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
        const json = await res.json();
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
          body: action === "full" ? JSON.stringify({ autoApprove: false, reviseRetries: 1 }) : "{}",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json;
      },
      successMessage,
    );
    if (r && activeChapterId) {
      const reload = await fetch(`/api/story-writer/chapters/${activeChapterId}`);
      if (reload.ok) setChapterDetail(await reload.json());
      // refresh chapter list status
      const list = await fetch(`/api/story-writer/chapters?bookId=${activeBookId}`);
      if (list.ok) setChapters((await list.json()).chapters ?? []);
      // refresh truth in case of approve
      if (action === "approve" || action === "full") {
        const t = await fetch(`/api/story-writer/books/${activeBookId}/truth`);
        if (t.ok) setTruth((await t.json()).truth ?? null);
      }
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
        const json = await res.json();
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
        const json = await res.json();
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
        const json = await res.json();
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
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json as { inserted: Array<{ id: string }>; skipped: number };
      },
    );
    if (r) {
      log("ok", `Import ${r.inserted.length} chương (skipped ${r.skipped})`);
      setImportText("");
      const list = await fetch(`/api/story-writer/chapters?bookId=${activeBookId}`);
      if (list.ok) setChapters((await list.json()).chapters ?? []);
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
        const json = await res.json();
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
        const json = await res.json();
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
                  className="w-full appearance-none rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 pr-8 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
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
                  className="w-full appearance-none rounded-md border border-[#2a251f] bg-[#0c0a08] px-3 py-2 pr-8 font-mono text-[0.78rem] text-[#f4eadc] outline-none focus:border-[#ef4444]/60"
                >
                  <option value="">{copy.pickBook}</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>{b.title} · {b.genre}</option>
                  ))}
                </select>
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

function ChapterEditor({
  copy,
  language,
  chapter,
  isBusy,
  busyKey,
  onAction,
}: Readonly<{
  copy: typeof swCopy.vi;
  language: WebLanguage;
  chapter: ChapterDetail | null;
  isBusy: boolean;
  busyKey: string;
  onAction: (action: "plan" | "compose" | "write" | "audit" | "revise" | "approve" | "full" | "detect") => void;
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
        </div>
      </div>

      {chapter.intent ? (
        <details className="rounded-md border border-[#25211b] bg-[#0d0b08]/82 p-3" open>
          <summary className="cursor-pointer font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548]">{copy.intent}</summary>
          <pre className="mt-2 whitespace-pre-wrap text-[0.78rem] leading-6 text-[#cfc4b8]">{chapter.intent}</pre>
        </details>
      ) : null}

      <div className="flex-1 overflow-y-auto rounded-lg border border-[#25211b] bg-[#0d0b08]/82 p-5">
        {chapter.draft ? (
          <pre className="playground-result-arrive whitespace-pre-wrap text-[0.86rem] leading-7 text-[#f4eadc]">{chapter.draft}</pre>
        ) : (
          <p className="text-center text-[0.78rem] text-[#9a9087]">{copy.draft}: —</p>
        )}
      </div>

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
}>) {
  return (
    <div className="mx-auto grid max-w-5xl gap-3 lg:grid-cols-2">
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
