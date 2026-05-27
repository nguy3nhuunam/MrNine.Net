"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Check,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { languageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type Level = "beginner" | "intermediate" | "advanced";

type TargetLang = "en" | "ja" | "zh" | "ko" | "fr" | "es" | "de";

type Vocab = { term: string; ipa: string; vi: string };

type TutorResponse = {
  correction?: {
    hasError: boolean;
    originalText: string;
    fixedText: string;
    explanationVi: string;
  };
  reply?: string;
  replyTranslationVi?: string;
  vocab?: Vocab[];
  error?: string;
};

type Turn = {
  id: string;
  user: string;
  tutor?: TutorResponse;
  pending?: boolean;
  error?: string;
  createdAt: number;
};

const TARGET_LANGS: ReadonlyArray<{ code: TargetLang; flag: string; label: string }> = [
  { code: "en", flag: "EN", label: "English" },
  { code: "ja", flag: "JA", label: "日本語" },
  { code: "zh", flag: "ZH", label: "中文" },
  { code: "ko", flag: "KO", label: "한국어" },
  { code: "fr", flag: "FR", label: "Français" },
  { code: "es", flag: "ES", label: "Español" },
  { code: "de", flag: "DE", label: "Deutsch" },
];

const LEVELS: ReadonlyArray<{ value: Level; labelVi: string; labelEn: string; hint: string }> = [
  { value: "beginner", labelVi: "Mới bắt đầu", labelEn: "Beginner", hint: "A1-A2" },
  { value: "intermediate", labelVi: "Trung cấp", labelEn: "Intermediate", hint: "B1-B2" },
  { value: "advanced", labelVi: "Nâng cao", labelEn: "Advanced", hint: "C1-C2" },
];

const STARTER_PROMPTS: Record<TargetLang, ReadonlyArray<string>> = {
  en: [
    "Hi, I want to practice ordering coffee at a cafe.",
    "Can you help me describe my hometown?",
    "Let's roleplay a job interview for a software engineer position.",
  ],
  ja: [
    "こんにちは、自己紹介を練習したいです。",
    "レストランで注文する会話を練習しましょう。",
    "趣味について話しましょう。",
  ],
  zh: ["你好，我想练习自我介绍。", "我们来聊聊周末计划吧。", "可以教我点菜的对话吗？"],
  ko: ["안녕하세요, 자기소개를 연습하고 싶어요.", "주말 계획에 대해 이야기해 봐요.", "카페에서 주문하는 연습을 해주세요."],
  fr: [
    "Bonjour, je voudrais commander un café.",
    "Parlons de mes vacances préférées.",
    "Aide-moi à décrire ma famille.",
  ],
  es: [
    "Hola, quiero practicar pedir comida en un restaurante.",
    "Hablemos de mis pasatiempos.",
    "Ayúdame a describir mi ciudad natal.",
  ],
  de: [
    "Hallo, ich möchte mich vorstellen üben.",
    "Lass uns über meine Hobbys sprechen.",
    "Hilf mir, meine Heimatstadt zu beschreiben.",
  ],
};

const tutorCopy = {
  vi: {
    back: "Về trang chủ",
    title: "Trợ lý ngôn ngữ",
    subtitle: "Chat · sửa lỗi · từ vựng",
    online: "Sẵn sàng",
    thinking: "Đang nghĩ",
    targetTitle: "Ngôn ngữ học",
    levelTitle: "Trình độ",
    starterTitle: "Bắt đầu nhanh",
    historyTitle: "Trong phiên này",
    historyEmpty: "Chưa có hội thoại — reload sẽ xoá hết",
    historyClear: "Xoá hết",
    placeholder: "Gõ câu của bạn bằng ngôn ngữ đang học (hoặc tiếng Việt nếu chưa quen)…",
    send: "Gửi",
    correctionLabel: "Sửa câu",
    fixedLabel: "Câu đúng",
    explanationLabel: "Giải thích",
    noErrorLabel: "Không lỗi — câu đã chuẩn",
    replyLabel: "Trợ lý",
    translationLabel: "Tạm dịch",
    vocabLabel: "Từ vựng",
    retry: "Thử lại",
    errorTitle: "Lỗi",
  },
  en: {
    back: "Back to home",
    title: "Language Tutor",
    subtitle: "Chat · correct · vocab",
    online: "Ready",
    thinking: "Thinking",
    targetTitle: "Target language",
    levelTitle: "Level",
    starterTitle: "Quick starts",
    historyTitle: "This session",
    historyEmpty: "No conversation yet — clears on reload",
    historyClear: "Clear all",
    placeholder: "Type in the language you're learning (or Vietnamese if unsure)…",
    send: "Send",
    correctionLabel: "Correction",
    fixedLabel: "Fixed sentence",
    explanationLabel: "Explanation",
    noErrorLabel: "No errors — your sentence is fine",
    replyLabel: "Tutor",
    translationLabel: "Translation",
    vocabLabel: "Vocabulary",
    retry: "Retry",
    errorTitle: "Error",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

export function LanguageTutorShell() {
  const { language, setLanguage } = useLanguage();
  const copy = tutorCopy[language];

  const [target, setTarget] = useState<TargetLang>("en");
  const [level, setLevel] = useState<Level>("intermediate");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;

    setError(null);
    setInput("");
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newTurn: Turn = { id, user: text, pending: true, createdAt: Date.now() };
    const nextTurns = [...turns, newTurn];
    setTurns(nextTurns);
    setBusy(true);

    const messages = nextTurns.flatMap((t) => {
      const arr: Array<{ role: "user" | "assistant"; content: string }> = [{ role: "user", content: t.user }];
      if (t.tutor && !t.pending && !t.error) {
        const stub = JSON.stringify({
          correction: t.tutor.correction,
          reply: t.tutor.reply,
          replyTranslationVi: t.tutor.replyTranslationVi,
          vocab: t.tutor.vocab,
        });
        arr.push({ role: "assistant", content: stub });
      }
      return arr;
    });

    try {
      const response = await fetch("/api/language-tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, targetLanguage: target, level }),
      });
      const data = (await response.json()) as TutorResponse;
      if (!response.ok || data.error) {
        setTurns((curr) =>
          curr.map((t) =>
            t.id === id
              ? { ...t, pending: false, error: data.error ?? `HTTP ${response.status}` }
              : t,
          ),
        );
        setError(data.error ?? `HTTP ${response.status}`);
      } else {
        setTurns((curr) => curr.map((t) => (t.id === id ? { ...t, pending: false, tutor: data } : t)));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setTurns((curr) => curr.map((t) => (t.id === id ? { ...t, pending: false, error: msg } : t)));
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send();
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !busy) {
      e.preventDefault();
      void send();
    }
  };

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
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#45a85d]">{copy.subtitle}</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">{copy.title}</h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] sm:flex">
            <span className={cn("size-1.5 rounded-full", busy ? "bg-[#d6a548] animate-pulse" : "bg-[#45a85d]")} />
            <span className={busy ? "text-[#d6a548]" : "text-[#7dd391]"}>
              {busy ? copy.thinking : copy.online}
            </span>
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em]">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.title}
                aria-pressed={language === option.value}
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

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col border-r border-[#25211b] bg-[#0a0907]/72 lg:flex">
          <div className="flex shrink-0 flex-col gap-3 border-b border-[#25211b] px-4 py-4">
            <div>
              <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#45a85d]">
                {copy.targetTitle}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {TARGET_LANGS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setTarget(opt.code)}
                    title={opt.label}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 transition",
                      target === opt.code
                        ? "border-[#45a85d]/55 bg-[#45a85d]/12 text-[#dff8e4] shadow-[0_0_0_1px_rgba(69,168,93,0.18)_inset]"
                        : "border-[#25211b] bg-white/[0.025] text-[#9a9087] hover:border-white/20 hover:text-[#dfd5c7]",
                    )}
                  >
                    <span className="font-mono text-[0.62rem] font-bold tracking-[0.12em]">{opt.flag}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#45a85d]">
                {copy.levelTitle}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setLevel(lvl.value)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 transition",
                      level === lvl.value
                        ? "border-[#45a85d]/55 bg-[#45a85d]/12 text-[#dff8e4] shadow-[0_0_0_1px_rgba(69,168,93,0.18)_inset]"
                        : "border-[#25211b] bg-white/[0.025] text-[#9a9087] hover:border-white/20 hover:text-[#dfd5c7]",
                    )}
                  >
                    <span className="text-[0.7rem] font-bold">{language === "vi" ? lvl.labelVi : lvl.labelEn}</span>
                    <span className="font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#756d64]">
                      {lvl.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-[#25211b] px-4 py-3">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">{copy.starterTitle}</p>
          </div>
          <div className="shrink-0 space-y-1.5 px-3 py-3">
            {STARTER_PROMPTS[target].map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={busy}
                onClick={() => void send(prompt)}
                className="flex w-full items-start gap-2 rounded-md border border-[#25211b] bg-white/[0.02] px-3 py-2 text-left text-[0.74rem] leading-snug text-[#dfd5c7] transition hover:border-[#45a85d]/35 hover:bg-[#45a85d]/[0.06] hover:text-[#dff8e4] disabled:opacity-50"
              >
                <Sparkles className="mt-0.5 size-3 shrink-0 text-[#45a85d]" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-between border-y border-[#25211b] px-4 py-3">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">{copy.historyTitle}</p>
            {turns.length > 0 ? (
              <button
                type="button"
                onClick={() => setTurns([])}
                className="rounded border border-white/10 bg-white/[0.02] px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#9a9087] transition hover:border-[#ef4444]/40 hover:text-[#ffe9e5]"
              >
                {copy.historyClear}
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {turns.length === 0 ? (
              <p className="rounded-md border border-white/8 bg-white/[0.025] px-3 py-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#756d64]">
                {copy.historyEmpty}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {turns.map((t) => (
                  <li key={t.id} className="rounded-md border border-[#25211b] bg-white/[0.02] px-3 py-2">
                    <p className="line-clamp-2 text-[0.72rem] leading-snug text-[#dfd5c7]">{t.user}</p>
                    {t.tutor?.reply ? (
                      <p className="mt-1 line-clamp-1 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#7dd391]">
                        ↪ {t.tutor.reply}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-7">
            <div className="mx-auto w-full max-w-3xl space-y-5">
              {turns.length === 0 ? (
                <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 p-5 text-center shadow-[0_12px_36px_rgba(0,0,0,0.32)]">
                  <BookOpenText className="mx-auto size-6 text-[#45a85d]" />
                  <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#45a85d]">
                    {TARGET_LANGS.find((l) => l.code === target)?.label} · {LEVELS.find((l) => l.value === level)?.[language === "vi" ? "labelVi" : "labelEn"]}
                  </p>
                  <h2 className="mt-2 text-lg font-black tracking-[-0.03em] text-[#f4eadc]">
                    {language === "vi"
                      ? "Gõ một câu hoặc bấm Quick start để bắt đầu"
                      : "Type a sentence or pick a quick start to begin"}
                  </h2>
                  <p className="mt-1 text-sm text-[#9a9087]">
                    {language === "vi"
                      ? "Trợ lý sẽ trả lời bằng ngôn ngữ đang học, sửa lỗi câu của bạn và đề xuất từ vựng quan trọng."
                      : "The tutor will reply in your target language, correct your sentence, and surface key vocabulary."}
                  </p>
                </div>
              ) : null}

              {turns.map((turn) => (
                <article key={turn.id} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[0.92rem] leading-7 text-[#f4eadc] shadow-[0_8px_24px_rgba(0,0,0,0.32)]">
                      {turn.user}
                    </div>
                  </div>

                  {turn.pending ? (
                    <div className="flex items-center gap-2 rounded-md border border-[#45a85d]/25 bg-[#45a85d]/[0.06] px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#7dd391]">
                      <LoaderCircle className="size-3 animate-spin" />
                      {copy.thinking}
                    </div>
                  ) : null}

                  {turn.error ? (
                    <div className="flex items-start gap-2 rounded-md border border-[#ef4444]/40 bg-[#1a0707]/64 px-3 py-2 text-sm text-[#ffd7d3]">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#ef4444]" />
                      <span className="flex-1">{turn.error}</span>
                      <button
                        type="button"
                        onClick={() => void send(turn.user)}
                        className="rounded border border-[#ef4444]/35 bg-[#ef4444]/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#ffe9e5] transition hover:bg-[#ef4444]/20"
                      >
                        <RotateCcw className="inline size-3" /> {copy.retry}
                      </button>
                    </div>
                  ) : null}

                  {turn.tutor && !turn.error ? (
                    <>
                      {turn.tutor.correction ? (
                        <div
                          className={cn(
                            "rounded-xl border px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
                            turn.tutor.correction.hasError
                              ? "border-[#d6a548]/30 bg-[#1a1208]/64"
                              : "border-[#45a85d]/30 bg-[#091509]/64",
                          )}
                        >
                          <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#d6a548]">
                            {turn.tutor.correction.hasError ? copy.correctionLabel : (
                              <span className="inline-flex items-center gap-1 text-[#7dd391]">
                                <Check className="size-3" />
                                {copy.noErrorLabel}
                              </span>
                            )}
                          </p>
                          {turn.tutor.correction.hasError ? (
                            <>
                              <p className="mt-2 text-[0.85rem] text-[#fff2d3]">
                                <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#9a9087]">
                                  {copy.fixedLabel}:{" "}
                                </span>
                                {turn.tutor.correction.fixedText}
                              </p>
                              {turn.tutor.correction.explanationVi ? (
                                <p className="mt-2 text-[0.78rem] leading-relaxed text-[#dfd5c7]">
                                  <span className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-[#9a9087]">
                                    {copy.explanationLabel}:{" "}
                                  </span>
                                  {turn.tutor.correction.explanationVi}
                                </p>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : null}

                      {turn.tutor.reply ? (
                        <div className="rounded-xl border border-[#45a85d]/30 bg-[#091509]/64 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
                          <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#45a85d]">
                            {copy.replyLabel}
                          </p>
                          <p className="mt-2 text-[0.95rem] leading-7 text-[#f4eadc]">{turn.tutor.reply}</p>
                          {turn.tutor.replyTranslationVi ? (
                            <p className="mt-2 text-[0.78rem] italic leading-relaxed text-[#9a9087]">
                              {copy.translationLabel}: {turn.tutor.replyTranslationVi}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {turn.tutor.vocab && turn.tutor.vocab.length > 0 ? (
                        <div className="rounded-xl border border-[#25211b] bg-[#0c0a08]/72 px-4 py-3">
                          <p className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#d6a548]">
                            {copy.vocabLabel}
                          </p>
                          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                            {turn.tutor.vocab.map((v, idx) => (
                              <li
                                key={`${turn.id}-vocab-${idx}`}
                                className="flex items-baseline gap-2 rounded-md border border-white/8 bg-white/[0.025] px-2.5 py-1.5"
                              >
                                <span className="text-[0.82rem] font-bold text-[#fff2d3]">{v.term}</span>
                                {v.ipa ? (
                                  <span className="font-mono text-[0.62rem] text-[#9a9087]">/{v.ipa}/</span>
                                ) : null}
                                <span className="ml-auto text-[0.74rem] text-[#dfd5c7]">{v.vi}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="shrink-0 border-t border-[#25211b] bg-[#0a0907]/82 px-4 py-3 backdrop-blur sm:px-6 lg:px-7"
          >
            <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-xl border border-[#45a85d]/24 bg-[#0d150d]/72 px-3 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.4)] focus-within:border-[#45a85d]/55">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={copy.placeholder}
                rows={1}
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-1 text-[0.92rem] leading-7 text-[#f4eadc] placeholder:text-[#6f776d] focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#45a85d]/55 bg-[#45a85d] text-[#061009] shadow-[0_8px_22px_rgba(69,168,93,0.36)] transition hover:bg-[#5cc274] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                aria-label={copy.send}
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </div>
            {error ? (
              <p className="mx-auto mt-2 max-w-3xl rounded-md border border-[#ef4444]/30 bg-[#1a0707]/64 px-3 py-1.5 text-[0.72rem] text-[#ffd7d3]">
                {copy.errorTitle}: {error}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}
