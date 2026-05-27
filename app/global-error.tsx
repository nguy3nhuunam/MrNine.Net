"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    // Best-effort client telemetry — silently swallowed if /api/track is
    // rate-limited or auth-blocked. Don't block the error UI on this.
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "client_error",
        message: error.message?.slice(0, 500) ?? "",
        digest: error.digest ?? null,
        url: typeof window !== "undefined" ? window.location.pathname : null,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#0b0a08] text-[#e8dfd4]" style={{ fontFamily: "system-ui, sans-serif" }}>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <div className="font-display text-5xl font-black tracking-[-0.06em]">
            Mr<span style={{ color: "#ef4444" }}>Nine</span>
          </div>
          <p
            style={{
              marginTop: 16,
              fontFamily: "monospace",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontSize: 12,
              color: "#ef4444",
            }}
          >
            500 / unhandled exception
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em]">Có gì đó vừa hỏng.</h1>
          <p className="mt-2 max-w-md text-[0.9rem] text-[#b5ab9f]">
            Lỗi đã được log. Bấm Thử lại để render lại trang, hoặc về trang chủ.
          </p>
          {error.digest ? (
            <p className="mt-3 font-mono text-[0.7rem] text-[#776f66]">
              ref: {error.digest}
            </p>
          ) : null}
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-[#ef4444] px-4 py-2 text-sm font-bold text-[#090807] hover:bg-[#ff5b55]"
            >
              Thử lại
            </button>
            <Link
              href="/"
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-[#f4eadc] hover:bg-white/[0.05]"
            >
              Về trang chủ
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
