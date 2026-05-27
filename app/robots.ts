import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mrnine.net";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profile", "/admin", "/voice-studio-runtime"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
