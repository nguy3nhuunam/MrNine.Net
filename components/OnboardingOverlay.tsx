"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { trackEvent } from "@/lib/track-client";

// First-run tour shown on /. Gated by localStorage so it appears once per
// browser. Three short steps explain the three things first-time users get
// stuck on: the command bar, the module grid, and Cmd+K search.
//
// Skipped entirely on subsequent visits or when localStorage is unavailable
// (private mode, etc.) — silent no-op.

const STORAGE_KEY = "mrnine-onboarded-v1";

const STEPS: Array<{
  title: string;
  body: string;
  hint: string;
}> = [
  {
    title: "Hỏi gì cũng được",
    body: "Gõ vào ô lệnh ở trang chủ. AI trả lời và mở thẳng module cần thiết khi bạn yêu cầu hành động (vd: \"tạo ảnh sunset\", \"tóm tắt video này\").",
    hint: "Bắt đầu từ ô lệnh ở giữa trang.",
  },
  {
    title: "15 module trong một deck",
    body: "Mỗi module được thiết kế cho một workflow rõ ràng — Story Writer, Mystic Deck, AI Playground, Voice Studio, Smart Recap, Photo Fix… Click thẳng card để mở.",
    hint: "Một số module dùng được không cần đăng nhập: Markets, Tools, Calculators.",
  },
  {
    title: "Phím tắt: Cmd+K",
    body: "Bấm Cmd+K (hoặc Ctrl+K) bất cứ đâu để mở search nhanh — tìm module, model AI, calculator, công cụ.",
    hint: "Sẵn sàng. Đóng hướng dẫn này và bắt đầu.",
  },
];

export function OnboardingOverlay() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Defer one tick so it doesn't fight with the page's first paint.
        const id = window.setTimeout(() => {
          setStep(0);
          trackEvent("onboarding_step", { step: 0 });
        }, 600);
        return () => window.clearTimeout(id);
      }
    } catch {
      // localStorage blocked → silently skip.
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    trackEvent("onboarding_done", { lastStep: step ?? 0 });
    setStep(null);
  }

  if (step === null) return null;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hướng dẫn nhanh"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 px-4 pb-6 pt-16 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/12 bg-[#0e0c08] p-5 text-[#f4eadc] shadow-2xl sm:p-6">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Đóng"
          className="absolute right-3 top-3 rounded-md p-1.5 text-white/50 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X size={16} />
        </button>

        <div className="mb-3 flex items-center gap-2 text-[0.65rem] font-mono uppercase tracking-[0.2em] text-amber-400/80">
          <span>Bước {step + 1} / {STEPS.length}</span>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition ${i <= step ? "bg-amber-400" : "bg-white/12"}`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-xl font-semibold tracking-tight">{current.title}</h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-white/75">{current.body}</p>
        <p className="mt-3 text-[0.78rem] text-amber-300/85">{current.hint}</p>

        {step === 1 ? (
          <div className="mt-4 flex flex-wrap gap-2 text-[0.78rem]">
            <Link
              href="/markets"
              onClick={() => {
                trackEvent("cta_click", { id: "onboarding-markets", ctx: "onboarding" });
                dismiss();
              }}
              className="rounded-md border border-white/12 px-2.5 py-1 text-white/85 transition hover:bg-white/[0.05]"
            >
              Markets →
            </Link>
            <Link
              href="/tools"
              onClick={() => {
                trackEvent("cta_click", { id: "onboarding-tools", ctx: "onboarding" });
                dismiss();
              }}
              className="rounded-md border border-white/12 px-2.5 py-1 text-white/85 transition hover:bg-white/[0.05]"
            >
              Tools →
            </Link>
            <Link
              href="/calculators"
              onClick={() => {
                trackEvent("cta_click", { id: "onboarding-calculators", ctx: "onboarding" });
                dismiss();
              }}
              className="rounded-md border border-white/12 px-2.5 py-1 text-white/85 transition hover:bg-white/[0.05]"
            >
              Calculators →
            </Link>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-[0.78rem] text-white/55 transition hover:text-white/80"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                dismiss();
              } else {
                const next = step + 1;
                setStep(next);
                trackEvent("onboarding_step", { step: next });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/95 px-3.5 py-1.5 text-[0.85rem] font-semibold text-[#0b0a08] transition hover:bg-amber-400"
          >
            {isLast ? (
              <>
                Bắt đầu <Check size={14} />
              </>
            ) : (
              <>
                Tiếp <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
