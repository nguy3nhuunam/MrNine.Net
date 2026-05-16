import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono, Oxanium } from "next/font/google";
import "./globals.css";

const displayFont = Oxanium({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
});

const bodyFont = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "WebAI | Futuristic AI Control Deck",
  description:
    "A cinematic AI platform homepage built with procedural Three.js geometry, custom shaders, and a futuristic control-deck interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body
        className="min-h-full overflow-x-hidden"
        style={
          {
            "--font-display-family": displayFont.style.fontFamily,
            "--font-body-family": bodyFont.style.fontFamily,
            "--font-mono-family": monoFont.style.fontFamily,
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
