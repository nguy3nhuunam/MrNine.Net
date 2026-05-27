// Batch script: wrap remaining safeJsonRoute() calls with rateLimitedRoute(routeKey, ...)
// Usage: node scripts/wrap-rate-limit.mjs
import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const FILES = [
  "app/api/admin/config/route.ts",
  "app/api/admin/products/route.ts",
  "app/api/admin/stats/route.ts",
  "app/api/chat-history/route.ts",
  "app/api/credits/me/route.ts",
  "app/api/markets/route.ts",
  "app/api/mystic/readings/route.ts",
  "app/api/playground/assets/route.ts",
  "app/api/site-config/route.ts",
  "app/api/story-writer/books/route.ts",
  "app/api/story-writer/books/[id]/characters/route.ts",
  "app/api/story-writer/books/[id]/duplicate/route.ts",
  "app/api/story-writer/books/[id]/export/route.ts",
  "app/api/story-writer/books/[id]/foreshadows/route.ts",
  "app/api/story-writer/books/[id]/rename/route.ts",
  "app/api/story-writer/books/[id]/route.ts",
  "app/api/story-writer/books/[id]/search/route.ts",
  "app/api/story-writer/books/[id]/stats/route.ts",
  "app/api/story-writer/books/[id]/truth/route.ts",
  "app/api/story-writer/books/[id]/volumes/route.ts",
  "app/api/story-writer/chapters/route.ts",
  "app/api/story-writer/chapters/[id]/route.ts",
  "app/api/story-writer/chapters/[id]/snapshots/[index]/restore/route.ts",
  "app/api/track/route.ts",
];

function pathToKey(path) {
  // app/api/story-writer/books/[id]/route.ts -> story-writer-books
  return path
    .replace(/^app\/api\//, "")
    .replace(/\/route\.tsx?$/, "")
    .replace(/\[(\w+)\]/g, "$1")
    .replace(/\//g, "-");
}

for (const rel of FILES) {
  const path = rel;
  let src;
  try {
    src = await readFile(path, "utf8");
  } catch (e) {
    console.error("skip", path, e.message);
    continue;
  }
  const key = pathToKey(rel);
  let next = src;

  // 1. swap import: '@/lib/safe-json-route' { safeJsonRoute } -> { rateLimitedRoute }
  next = next.replace(
    /import\s+\{\s*safeJsonRoute\s*\}\s+from\s+"@\/lib\/safe-json-route"\s*;/,
    `import { rateLimitedRoute } from "@/lib/safe-json-route";`,
  );
  // 2. swap call: safeJsonRoute(_handler_X) -> rateLimitedRoute("key", _handler_X)
  next = next.replace(
    /safeJsonRoute\(([^)]+)\)/g,
    `rateLimitedRoute(${JSON.stringify(key)}, $1)`,
  );

  if (next === src) {
    console.log("no-change", path);
    continue;
  }
  await writeFile(path, next);
  console.log("wrapped", path, "->", key);
}
