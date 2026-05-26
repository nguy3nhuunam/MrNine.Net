import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mrnine.net";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "/",
    "/ai-playground",
    "/photo-fix",
    "/smart-recap",
    "/docsense",
    "/story-writer",
    "/story-forge",
    "/voice-studio",
    "/video-studio",
    "/mystic-deck",
    "/markets",
    "/ai-store",
    "/tools",
    "/calculators",
    "/profile",
  ];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
