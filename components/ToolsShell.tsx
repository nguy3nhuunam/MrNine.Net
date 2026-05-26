"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Binary,
  Braces,
  Clock,
  Copy,
  Hash,
  KeyRound,
  Link2,
  Palette,
  Regex,
  Wrench,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

type ToolId = "json" | "regex" | "base64" | "url" | "jwt" | "hash" | "color" | "timestamp";

const tools: ReadonlyArray<{
  id: ToolId;
  icon: typeof Wrench;
  titleVi: string;
  titleEn: string;
  hintVi: string;
  hintEn: string;
}> = [
  { id: "json", icon: Braces, titleVi: "JSON", titleEn: "JSON", hintVi: "Format · validate · minify", hintEn: "Format · validate · minify" },
  { id: "regex", icon: Regex, titleVi: "Regex", titleEn: "Regex", hintVi: "Test biểu thức + highlight", hintEn: "Test patterns + highlight" },
  { id: "base64", icon: Binary, titleVi: "Base64", titleEn: "Base64", hintVi: "Mã hoá / giải mã", hintEn: "Encode / decode" },
  { id: "url", icon: Link2, titleVi: "URL", titleEn: "URL", hintVi: "encode / decode URI", hintEn: "encode / decode URI" },
  { id: "jwt", icon: KeyRound, titleVi: "JWT", titleEn: "JWT", hintVi: "Giải mã header + payload", hintEn: "Decode header + payload" },
  { id: "hash", icon: Hash, titleVi: "Hash", titleEn: "Hash", hintVi: "SHA-1, SHA-256, SHA-512", hintEn: "SHA-1, SHA-256, SHA-512" },
  { id: "color", icon: Palette, titleVi: "Color", titleEn: "Color", hintVi: "HEX ↔ RGB ↔ HSL", hintEn: "HEX ↔ RGB ↔ HSL" },
  { id: "timestamp", icon: Clock, titleVi: "Timestamp", titleEn: "Timestamp", hintVi: "Unix ↔ ISO ↔ Vietnam", hintEn: "Unix ↔ ISO ↔ Vietnam" },
];

export function ToolsShell() {
  const { language } = useLanguage();
  const [active, setActive] = useState<ToolId>("json");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#060b0d] text-[#dff3f6]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 12% 12%, rgba(71,201,217,0.22), transparent 32%), radial-gradient(circle at 86% 18%, rgba(69,168,93,0.1), transparent 28%), radial-gradient(circle at 50% 92%, rgba(167,139,250,0.06), transparent 32%), linear-gradient(180deg, #061014 0%, #030607 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[size:24px_24px] opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(71,201,217,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(71,201,217,0.045) 1px, transparent 1px)",
        }}
      />
      <div className="blueprint-layer pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[#12323a] bg-[#050d10]/92 px-3 backdrop-blur md:px-5">
        <Link
          href="/"
          aria-label={language === "vi" ? "Quay lại trang chủ" : "Back to home"}
          className="flex size-9 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#47c9d9]/40 hover:text-[#f4eadc]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Link
          href="/"
          aria-label="MrNine home"
          className="font-display text-xl font-black tracking-[-0.08em] text-[#f4eadc] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#47c9d9]/70 sm:text-2xl"
        >
          Mr<span className="text-[#47c9d9]">Nine</span>
        </Link>
        <span aria-hidden="true" className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#47c9d9]/30 bg-[#47c9d9]/10 text-[#47c9d9]">
            <Wrench className="size-4" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#79ddeb]">MrNine Studio</p>
            <h1 className="truncate text-base font-black tracking-[-0.04em] text-[#f4eadc]">Tools</h1>
          </div>
        </div>
      </header>

      <section className="relative z-10 w-full px-4 pb-12 pt-5 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="border-b border-[#12323a] pb-5 sm:pb-7">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#8f8579]">
            {language === "vi" ? "Trang chủ" : "Home"}
            <span className="mx-2 text-[#5e574e]">/</span>
            {language === "vi" ? "Hộp công cụ dev" : "Dev toolkit"}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,4.4rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#f4eadc]">
            {language === "vi" ? "json · regex · base64 · jwt · hash" : "json · regex · base64 · jwt · hash"}
          </h2>
          <p className="mt-3 max-w-3xl text-[0.85rem] leading-7 text-[#c4b9ad] sm:text-base">
            {language === "vi"
              ? "Bộ tiện ích dev hằng ngày, chạy hoàn toàn trên trình duyệt. Dữ liệu của bạn không gửi lên server."
              : "Daily dev utilities, fully client-side. Your data never leaves the browser."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = active === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActive(tool.id)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition",
                  isActive
                    ? "border-[#47c9d9]/65 bg-[#06181c]/82 text-[#a8e8f0]"
                    : "border-[#12323a] bg-[#050d10]/70 text-[#79ddeb] hover:border-[#47c9d9]/40 hover:text-[#dff3f6]",
                )}
              >
                <div className={cn(
                  "flex size-8 items-center justify-center rounded-md border",
                  isActive ? "border-[#47c9d9]/65 bg-[#47c9d9]/14" : "border-[#47c9d9]/22 bg-[#47c9d9]/8",
                )}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.85rem] font-bold text-[#f4eadc]">{language === "vi" ? tool.titleVi : tool.titleEn}</div>
                  <div className="font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[#5e574e]">
                    {language === "vi" ? tool.hintVi : tool.hintEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {active === "json" ? <JsonTool language={language} /> : null}
          {active === "regex" ? <RegexTool language={language} /> : null}
          {active === "base64" ? <Base64Tool language={language} /> : null}
          {active === "url" ? <UrlTool language={language} /> : null}
          {active === "jwt" ? <JwtTool language={language} /> : null}
          {active === "hash" ? <HashTool language={language} /> : null}
          {active === "color" ? <ColorTool language={language} /> : null}
          {active === "timestamp" ? <TimestampTool language={language} /> : null}
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-[#12323a] bg-[#050d10]/72 p-4">
      <div className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-[#79ddeb]">
        <span className="size-1.5 rounded-full bg-[#47c9d9]" />
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function CopyButton({ value, label = "Copy" }: Readonly<{ value: string; label?: string }>) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          // ignore
        }
      }}
      className="flex h-7 items-center gap-1.5 rounded-md border border-[#47c9d9]/30 bg-[#06181c]/72 px-2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-[#a8e8f0] transition hover:border-[#47c9d9]/65"
    >
      <Copy className="size-3" />
      {copied ? "Copied" : label}
    </button>
  );
}

function TextArea({ value, onChange, placeholder, mono = true }: Readonly<{ value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }>) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        "min-h-32 w-full resize-y rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 text-[0.82rem] text-[#dff3f6] outline-none placeholder:text-[#3f6068] focus:border-[#47c9d9]/55",
        mono && "font-mono",
      )}
    />
  );
}

function JsonTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [input, setInput] = useState('{"name":"MrNine","modules":12,"alive":true}');
  const [pretty, setPretty] = useState(true);
  const result = useMemo(() => {
    if (!input.trim()) return { ok: true, value: "" };
    try {
      const parsed = JSON.parse(input);
      return { ok: true, value: JSON.stringify(parsed, null, pretty ? 2 : 0) };
    } catch (err) {
      return { ok: false, value: err instanceof Error ? err.message : String(err) };
    }
  }, [input, pretty]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Đầu vào" : "Input"}>
        <TextArea value={input} onChange={setInput} placeholder='{"key":"value"}' />
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPretty((c) => !c)}
            className="rounded-md border border-[#47c9d9]/30 bg-[#06181c]/72 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#a8e8f0] transition hover:border-[#47c9d9]/65"
          >
            {pretty ? "Pretty (2)" : "Minified"}
          </button>
          <button
            type="button"
            onClick={() => setInput("")}
            className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb] transition hover:border-white/30"
          >
            Clear
          </button>
        </div>
      </Panel>
      <Panel title={result.ok ? (language === "vi" ? "Kết quả" : "Output") : "Error"}>
        {result.ok ? (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[#12323a] bg-[#040a0c] p-3 font-mono text-[0.78rem] text-[#dff3f6]">{result.value || "—"}</pre>
        ) : (
          <pre className="rounded-md border border-[#ef4444]/40 bg-[#1a0606] p-3 font-mono text-[0.78rem] text-[#ffb4ad]">{result.value}</pre>
        )}
        {result.ok && result.value ? (
          <div className="mt-2"><CopyButton value={result.value} /></div>
        ) : null}
      </Panel>
    </div>
  );
}

function RegexTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [pattern, setPattern] = useState("\\b\\w{4,}\\b");
  const [flags, setFlags] = useState("gi");
  const [text, setText] = useState("MrNine ships AI Playground, Photo Fix and Story Writer for everyone.");

  const result = useMemo(() => {
    if (!pattern) return { ok: true, matches: [] as string[], error: "" };
    try {
      const re = new RegExp(pattern, flags);
      const matches = text.match(re) ?? [];
      return { ok: true, matches, error: "" };
    } catch (err) {
      return { ok: false, matches: [] as string[], error: err instanceof Error ? err.message : String(err) };
    }
  }, [pattern, flags, text]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Regex">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.78rem] text-[#79ddeb]">/</span>
          <input
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[0.82rem] text-[#dff3f6] outline-none placeholder:text-[#3f6068] focus:border-[#47c9d9]/55"
            placeholder="\\d{3}"
          />
          <span className="font-mono text-[0.78rem] text-[#79ddeb]">/</span>
          <input
            value={flags}
            onChange={(event) => setFlags(event.target.value.replace(/[^gimsuy]/g, ""))}
            className="w-20 rounded-md border border-[#12323a] bg-[#040a0c] px-2 py-2 font-mono text-[0.82rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
            placeholder="gi"
          />
        </div>
        <div className="mt-3">
          <TextArea value={text} onChange={setText} placeholder={language === "vi" ? "Văn bản cần test" : "Text to test"} />
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Khớp" : "Matches"}>
        {result.ok ? (
          result.matches.length === 0 ? (
            <p className="text-[0.78rem] text-[#79ddeb]">{language === "vi" ? "Không có khớp." : "No match."}</p>
          ) : (
            <div className="space-y-1.5">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">
                {result.matches.length} {language === "vi" ? "khớp" : "matches"}
              </p>
              <div className="flex max-h-72 flex-wrap gap-1.5 overflow-auto">
                {result.matches.map((match, idx) => (
                  <span key={`${match}-${idx}`} className="rounded-md border border-[#47c9d9]/35 bg-[#47c9d9]/12 px-2 py-1 font-mono text-[0.7rem] text-[#a8e8f0]">
                    {match}
                  </span>
                ))}
              </div>
            </div>
          )
        ) : (
          <pre className="rounded-md border border-[#ef4444]/40 bg-[#1a0606] p-3 font-mono text-[0.78rem] text-[#ffb4ad]">{result.error}</pre>
        )}
      </Panel>
    </div>
  );
}

function Base64Tool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [plain, setPlain] = useState("MrNine 2026");
  const [encoded, setEncoded] = useState("");

  useEffect(() => {
    try {
      const bytes = new TextEncoder().encode(plain);
      let binary = "";
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      setEncoded(btoa(binary));
    } catch {
      setEncoded("");
    }
  }, [plain]);

  const decode = (value: string) => {
    try {
      const binary = atob(value.trim());
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      setPlain(new TextDecoder().decode(bytes));
    } catch {
      setPlain(language === "vi" ? "Base64 không hợp lệ" : "Invalid base64");
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Văn bản" : "Plain"}>
        <TextArea value={plain} onChange={setPlain} placeholder={language === "vi" ? "Nhập văn bản" : "Enter text"} />
        <div className="mt-2"><CopyButton value={plain} /></div>
      </Panel>
      <Panel title="Base64">
        <TextArea value={encoded} onChange={(value) => { setEncoded(value); decode(value); }} placeholder="ZW5jb2RlZA==" />
        <div className="mt-2"><CopyButton value={encoded} /></div>
      </Panel>
    </div>
  );
}

function UrlTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [plain, setPlain] = useState("https://mrnine.net/markets?type=crypto&top=10&note=hello world");
  const [encoded, setEncoded] = useState("");

  useEffect(() => {
    try { setEncoded(encodeURIComponent(plain)); } catch { setEncoded(""); }
  }, [plain]);

  const decode = (value: string) => {
    try { setPlain(decodeURIComponent(value)); } catch { setPlain(language === "vi" ? "Không decode được" : "Cannot decode"); }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Văn bản" : "Plain"}>
        <TextArea value={plain} onChange={setPlain} />
        <div className="mt-2"><CopyButton value={plain} /></div>
      </Panel>
      <Panel title="URL encoded">
        <TextArea value={encoded} onChange={(value) => { setEncoded(value); decode(value); }} />
        <div className="mt-2"><CopyButton value={encoded} /></div>
      </Panel>
    </div>
  );
}

function JwtTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik1yTmluZSIsImlhdCI6MTcwMDAwMDAwMH0.placeholder");

  const result = useMemo(() => {
    const parts = token.trim().split(".");
    if (parts.length < 2) return { ok: false, error: language === "vi" ? "JWT cần ít nhất 2 phần (header.payload)" : "JWT needs at least 2 parts (header.payload)" };
    try {
      const decode = (segment: string) => {
        const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
        const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
        const binary = atob(padded + padding);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(bytes));
      };
      return {
        ok: true,
        header: decode(parts[0]),
        payload: decode(parts[1]),
        signature: parts[2] ?? "",
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [token, language]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="JWT">
        <TextArea value={token} onChange={setToken} placeholder="header.payload.signature" />
        <p className="mt-2 text-[0.7rem] text-[#79ddeb]">
          {language === "vi" ? "Decode chỉ ở client. Không kiểm tra chữ ký." : "Decoded client-side. Signature is not verified."}
        </p>
      </Panel>
      <Panel title={language === "vi" ? "Đã giải mã" : "Decoded"}>
        {result.ok ? (
          <div className="space-y-3">
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">Header</p>
              <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-[#12323a] bg-[#040a0c] p-2 font-mono text-[0.74rem] text-[#dff3f6]">{JSON.stringify(result.header, null, 2)}</pre>
            </div>
            <div>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">Payload</p>
              <pre className="mt-1 max-h-72 overflow-auto rounded-md border border-[#12323a] bg-[#040a0c] p-2 font-mono text-[0.74rem] text-[#dff3f6]">{JSON.stringify(result.payload, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <pre className="rounded-md border border-[#ef4444]/40 bg-[#1a0606] p-3 font-mono text-[0.78rem] text-[#ffb4ad]">{result.error}</pre>
        )}
      </Panel>
    </div>
  );
}

function HashTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [input, setInput] = useState("MrNine 2026");
  const [hashes, setHashes] = useState<{ sha1: string; sha256: string; sha512: string }>({ sha1: "", sha256: "", sha512: "" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
      try {
        const [sha1, sha256, sha512] = await Promise.all([
          crypto.subtle.digest("SHA-1", data),
          crypto.subtle.digest("SHA-256", data),
          crypto.subtle.digest("SHA-512", data),
        ]);
        if (cancelled) return;
        setHashes({ sha1: toHex(sha1), sha256: toHex(sha256), sha512: toHex(sha512) });
      } catch {
        // crypto.subtle requires HTTPS — leave empty
      }
    })();
    return () => { cancelled = true; };
  }, [input]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title={language === "vi" ? "Đầu vào" : "Input"}>
        <TextArea value={input} onChange={setInput} />
      </Panel>
      <Panel title="Hash">
        <div className="space-y-3">
          {[
            { label: "SHA-1", value: hashes.sha1 },
            { label: "SHA-256", value: hashes.sha256 },
            { label: "SHA-512", value: hashes.sha512 },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">{row.label}</span>
                {row.value ? <CopyButton value={row.value} /> : null}
              </div>
              <p className="mt-1 break-all rounded-md border border-[#12323a] bg-[#040a0c] p-2 font-mono text-[0.7rem] text-[#dff3f6]">{row.value || "—"}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ColorTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [hex, setHex] = useState("#45a85d");

  const parsed = useMemo(() => {
    const clean = hex.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const [rN, gN, bN] = [r / 255, g / 255, b / 255];
    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
        case gN: h = (bN - rN) / d + 2; break;
        default: h = (rN - gN) / d + 4;
      }
      h *= 60;
    }
    return {
      r, g, b,
      hsl: { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) },
    };
  }, [hex]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="HEX">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={parsed ? hex : "#45a85d"}
            onChange={(event) => setHex(event.target.value)}
            className="size-16 cursor-pointer rounded-md border border-[#12323a] bg-transparent"
          />
          <input
            value={hex}
            onChange={(event) => setHex(event.target.value)}
            className="flex-1 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[1rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
            placeholder="#45a85d"
          />
        </div>
        {!parsed ? (
          <p className="mt-2 text-[0.7rem] text-[#ffb4ad]">{language === "vi" ? "HEX không hợp lệ. Cần 6 ký tự." : "Invalid HEX. Need 6 characters."}</p>
        ) : null}
      </Panel>
      <Panel title={language === "vi" ? "Quy đổi" : "Conversions"}>
        {parsed ? (
          <div className="space-y-2">
            <Row label="RGB" value={`rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`} />
            <Row label="HSL" value={`hsl(${parsed.hsl.h}, ${parsed.hsl.s}%, ${parsed.hsl.l}%)`} />
            <Row label="Tailwind" value={`bg-[${hex}]`} />
            <Row label="CSS var" value={`--mrnine-color: ${hex};`} />
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#79ddeb]">{label}</span>
      <code className="flex-1 truncate text-right font-mono text-[0.78rem] text-[#dff3f6]">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

function TimestampTool({ language }: Readonly<{ language: "vi" | "en" }>) {
  const [unix, setUnix] = useState(() => Math.floor(Date.now() / 1000).toString());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const date = useMemo(() => {
    const num = Number(unix);
    if (!Number.isFinite(num)) return null;
    return new Date(num.toString().length <= 10 ? num * 1000 : num);
  }, [unix]);

  const valid = date && !Number.isNaN(date.getTime());

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Unix timestamp">
        <input
          value={unix}
          onChange={(event) => setUnix(event.target.value)}
          className="w-full rounded-md border border-[#12323a] bg-[#040a0c] px-3 py-2 font-mono text-[1rem] text-[#dff3f6] outline-none focus:border-[#47c9d9]/55"
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setUnix(Math.floor(Date.now() / 1000).toString())}
            className="rounded-md border border-[#47c9d9]/35 bg-[#06181c]/72 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[#a8e8f0] transition hover:border-[#47c9d9]/65"
          >
            {language === "vi" ? "Hiện tại" : "Now"}
          </button>
          <span className="font-mono text-[0.62rem] text-[#5e574e]">
            {language === "vi" ? "Hiện tại Unix:" : "Now (s):"} {Math.floor(now / 1000)}
          </span>
        </div>
      </Panel>
      <Panel title={language === "vi" ? "Đã chuyển đổi" : "Converted"}>
        {valid ? (
          <div className="space-y-2">
            <Row label="ISO 8601" value={date.toISOString()} />
            <Row label="UTC" value={date.toUTCString()} />
            <Row label="Vietnam" value={date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} />
            <Row label="Bangkok" value={date.toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })} />
            <Row label="Relative" value={getRelative(date.getTime(), now, language)} />
          </div>
        ) : (
          <p className="text-[0.78rem] text-[#ffb4ad]">{language === "vi" ? "Timestamp không hợp lệ" : "Invalid timestamp"}</p>
        )}
      </Panel>
    </div>
  );
}

function getRelative(ts: number, now: number, language: "vi" | "en"): string {
  const diff = (now - ts) / 1000;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const units: Array<{ s: number; vi: string; en: string }> = [
    { s: 60, vi: "giây", en: "seconds" },
    { s: 3600, vi: "phút", en: "minutes" },
    { s: 86400, vi: "giờ", en: "hours" },
    { s: 86400 * 30, vi: "ngày", en: "days" },
    { s: 86400 * 365, vi: "tháng", en: "months" },
    { s: Infinity, vi: "năm", en: "years" },
  ];
  let value = abs;
  let label: { vi: string; en: string } = units[0];
  for (let i = 0; i < units.length - 1; i += 1) {
    if (abs < units[i].s) {
      label = units[i];
      value = i === 0 ? abs : abs / units[i - 1].s;
      break;
    }
  }
  if (abs >= units[units.length - 2].s) {
    label = units[units.length - 1];
    value = abs / units[units.length - 2].s;
  }
  const rounded = Math.round(value);
  if (language === "vi") {
    return future ? `trong ${rounded} ${label.vi} nữa` : `${rounded} ${label.vi} trước`;
  }
  return future ? `in ${rounded} ${label.en}` : `${rounded} ${label.en} ago`;
}
