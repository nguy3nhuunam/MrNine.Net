import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const ACCENTS: Record<string, { ring: string; text: string; sub: string }> = {
  red: { ring: "rgba(239,68,68,0.32)", text: "#ffd7d3", sub: "#ef4444" },
  amber: { ring: "rgba(214,165,72,0.32)", text: "#fff2d3", sub: "#d6a548" },
  cyan: { ring: "rgba(71,201,217,0.32)", text: "#cef0f6", sub: "#47c9d9" },
  lime: { ring: "rgba(69,168,93,0.32)", text: "#dff8e4", sub: "#45a85d" },
  violet: { ring: "rgba(167,139,250,0.32)", text: "#ece6ff", sub: "#a78bfa" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "MrNine";
  const subtitle = searchParams.get("subtitle") || "Personal AI control surface";
  const accentKey = (searchParams.get("accent") || "amber").toLowerCase();
  const accent = ACCENTS[accentKey] ?? ACCENTS.amber;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `radial-gradient(circle at 14% 12%, ${accent.ring}, transparent 36%), radial-gradient(circle at 88% 84%, rgba(239,68,68,0.16), transparent 32%), linear-gradient(180deg, #0b0a08 0%, #050402 100%)`,
          color: "#f4eadc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#f4eadc",
            }}
          >
            Mr<span style={{ color: accent.sub }}>Nine</span>
          </div>
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.2)" }} />
          <div style={{ fontSize: 14, fontFamily: "monospace", letterSpacing: "0.18em", color: "#9a9087", textTransform: "uppercase" }}>
            mrnine.net
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 18,
              fontFamily: "monospace",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: accent.sub,
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 800,
              letterSpacing: "-0.05em",
              lineHeight: 1.02,
              color: accent.text,
              maxWidth: 1080,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {["#ef4444", "#45a85d", "#d6a548", "#47c9d9"].map((color) => (
              <div key={color} style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
            ))}
          </div>
          <div style={{ fontSize: 14, fontFamily: "monospace", color: "#756d64", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            2026 / Exp 009
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
