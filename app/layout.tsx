import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono, Oxanium, Teko } from "next/font/google";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
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

const numeralFont = Teko({
  variable: "--font-numeral",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "MrNine | Future AI Control Deck",
  description:
    "The future mrnine.net AI control surface for writing, voice, image, video, documents, coding, and creative workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} ${numeralFont.variable} h-full antialiased`}
    >
      <body
        className="min-h-full overflow-x-hidden"
        style={
          {
            "--font-display-family": displayFont.style.fontFamily,
            "--font-body-family": bodyFont.style.fontFamily,
            "--font-mono-family": monoFont.style.fontFamily,
            "--font-numeral-family": numeralFont.style.fontFamily,
          } as CSSProperties
        }
      >
        <LanguageProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
