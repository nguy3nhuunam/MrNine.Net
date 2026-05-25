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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mrnine.net";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MrNine | Future AI Control Deck",
    template: "%s · MrNine",
  },
  description:
    "Một trung tâm điều khiển AI cá nhân: viết, giọng nói, hình ảnh, video, tài liệu, code và công cụ trong cùng một giao diện lệnh.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0b0a08",
  appleWebApp: {
    capable: true,
    title: "MrNine",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: "MrNine",
    locale: "vi_VN",
    url: SITE_URL,
    title: "MrNine | Future AI Control Deck",
    description:
      "Một trung tâm điều khiển AI cá nhân: viết, giọng nói, hình ảnh, video, tài liệu, code và công cụ.",
    images: [
      {
        url: "/api/og?title=MrNine&subtitle=Future%20AI%20Control%20Deck&accent=amber",
        width: 1200,
        height: 630,
        alt: "MrNine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MrNine | Future AI Control Deck",
    description:
      "Personal AI control surface for writing, voice, image, video, documents and code.",
    images: ["/api/og?title=MrNine&subtitle=Future%20AI%20Control%20Deck&accent=amber"],
  },
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
