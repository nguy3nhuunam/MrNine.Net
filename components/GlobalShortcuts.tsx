"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ROUTES: Record<string, { href: string; label: string; shortcut: string; key: string }> = {
  h: { href: "/", label: "Home", shortcut: "g h", key: "h" },
  "1": { href: "/ai-playground", label: "AI Playground", shortcut: "g 1", key: "1" },
  "2": { href: "/photo-fix", label: "Photo Fix", shortcut: "g 2", key: "2" },
  "3": { href: "/smart-recap", label: "Smart Recap", shortcut: "g 3", key: "3" },
  "4": { href: "/docsense", label: "DocSense", shortcut: "g 4", key: "4" },
  "5": { href: "/story-writer", label: "Story Writer", shortcut: "g 5", key: "5" },
  "7": { href: "/mystic-deck", label: "Mystic Deck", shortcut: "g 7", key: "7" },
  "8": { href: "/voice-studio", label: "Voice Studio", shortcut: "g 8", key: "8" },
  "9": { href: "/markets", label: "Markets", shortcut: "g 9", key: "9" },
  "0": { href: "/ai-store", label: "AI Store", shortcut: "g 0", key: "0" },
  "-": { href: "/tools", label: "Tools", shortcut: "g -", key: "-" },
  "=": { href: "/calculators", label: "Calculators", shortcut: "g =", key: "=" },
  v: { href: "/video-studio", label: "Video Studio", shortcut: "g v", key: "v" },
  p: { href: "/profile", label: "Profile", shortcut: "g p", key: "p" },
};

export function GlobalShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  useEffect(() => {
    let resetTimer: number | null = null;

    function shouldIgnore(target: EventTarget | null): boolean {
      if (!target) return false;
      const el = target as HTMLElement;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    }

    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (shouldIgnore(event.target)) return;

      // ? opens help
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen((current) => !current);
        return;
      }

      // Esc closes help
      if (event.key === "Escape" && helpOpen) {
        event.preventDefault();
        setHelpOpen(false);
        return;
      }

      // / focuses the search bar if it exists on the page
      if (event.key === "/") {
        const search = document.querySelector<HTMLInputElement>(
          'input[role="combobox"], input[aria-controls="mrnine-search-listbox"]',
        );
        if (search) {
          event.preventDefault();
          search.focus();
          return;
        }
      }

      // g + key: vim-style nav
      if (pendingG) {
        if (resetTimer) {
          window.clearTimeout(resetTimer);
          resetTimer = null;
        }
        const route = ROUTES[event.key.toLowerCase()];
        setPendingG(false);
        if (route) {
          event.preventDefault();
          router.push(route.href);
        }
        return;
      }

      if (event.key === "g") {
        setPendingG(true);
        resetTimer = window.setTimeout(() => setPendingG(false), 1500);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (resetTimer) window.clearTimeout(resetTimer);
    };
  }, [router, pendingG, helpOpen]);

  return (
    <>
      {pendingG ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-md border border-white/15 bg-[#0b0a08]/96 px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#d6a548] shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <kbd className="rounded border border-[#d6a548]/40 bg-[#1b1508] px-1.5 py-0.5 text-[0.58rem] text-[#fff2d3]">g</kbd>
          <span>...</span>
          <span className="text-[#9a9087]">h / 1-9 / 0 - = / v / p</span>
        </div>
      ) : null}

      {helpOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={() => setHelpOpen(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-[#3b2a0d] bg-[#100b04]/96 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#3b2a0d] pb-3">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#d6a548]">Keyboard shortcuts</p>
                <h2 className="mt-1 font-display text-xl font-black tracking-[-0.04em] text-[#f4eadc]">Phím tắt</h2>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#9a9087] transition hover:border-white/30 hover:text-[#f4eadc]"
              >
                ESC
              </button>
            </div>

            <div className="mt-4 space-y-1.5">
              {[
                { keys: ["?"], label: "Mở / đóng bảng phím tắt này" },
                { keys: ["/"], label: "Focus thanh tìm kiếm" },
                { keys: ["⌘", "K"], label: "Focus thanh tìm kiếm (alt)" },
                { keys: ["Esc"], label: "Đóng menu / overlay" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 rounded-md border border-white/8 bg-white/[0.025] px-3 py-2">
                  <span className="text-[0.82rem] text-[#dfd5c7]">{row.label}</span>
                  <span className="flex items-center gap-1">
                    {row.keys.map((k) => (
                      <kbd key={k} className="rounded border border-white/15 bg-[#1b1508] px-1.5 py-0.5 font-mono text-[0.58rem] font-bold text-[#fff2d3]">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-[#3b2a0d] pt-3">
              <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d6a548]">Nav (gõ g rồi…)</div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {Object.values(ROUTES).map((route) => (
                  <div key={route.href} className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.025] px-2.5 py-2">
                    <span className="text-[0.78rem] text-[#dfd5c7]">{route.label}</span>
                    <kbd className="rounded border border-[#d6a548]/40 bg-[#1b1508] px-1.5 py-0.5 font-mono text-[0.55rem] font-bold uppercase tracking-[0.16em] text-[#fff2d3]">
                      {route.shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
