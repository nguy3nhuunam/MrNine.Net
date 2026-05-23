import fs from "node:fs";
import path from "node:path";

const targets = [
  "app/api/ai-playground/submit/route.ts",
  "app/api/ai-playground/status/route.ts",
  "app/api/ai-playground/upload/route.ts",
  "app/api/smart-recap/route.ts",
  "app/api/docsense/route.ts",
  "app/api/ask-anything/route.ts",
  "app/api/story-writer/books/route.ts",
  "app/api/story-writer/books/[id]/route.ts",
  "app/api/story-writer/books/[id]/architect-rerun/route.ts",
  "app/api/story-writer/books/[id]/bulk-approve/route.ts",
  "app/api/story-writer/books/[id]/cover/route.ts",
  "app/api/story-writer/books/[id]/duplicate/route.ts",
  "app/api/story-writer/books/[id]/export/route.ts",
  "app/api/story-writer/books/[id]/import-chapters/route.ts",
  "app/api/story-writer/books/[id]/rename/route.ts",
  "app/api/story-writer/books/[id]/style/analyze/route.ts",
  "app/api/story-writer/books/[id]/search/route.ts",
  "app/api/story-writer/books/[id]/stats/route.ts",
  "app/api/story-writer/books/[id]/truth/route.ts",
  "app/api/story-writer/books/[id]/characters/route.ts",
  "app/api/story-writer/books/[id]/foreshadows/route.ts",
  "app/api/story-writer/books/[id]/volumes/route.ts",
  "app/api/story-writer/chapters/route.ts",
  "app/api/story-writer/chapters/[id]/route.ts",
  "app/api/story-writer/chapters/[id]/plan/route.ts",
  "app/api/story-writer/chapters/[id]/compose/route.ts",
  "app/api/story-writer/chapters/[id]/write/route.ts",
  "app/api/story-writer/chapters/[id]/audit/route.ts",
  "app/api/story-writer/chapters/[id]/revise/route.ts",
  "app/api/story-writer/chapters/[id]/approve/route.ts",
  "app/api/story-writer/chapters/[id]/full/route.ts",
  "app/api/story-writer/chapters/[id]/detect/route.ts",
  "app/api/story-writer/chapters/[id]/snapshots/[index]/restore/route.ts",
  "app/api/story-writer/short/route.ts",
  "app/api/story-writer/suggest-setting/route.ts",
];

let updated = 0;
for (const rel of targets) {
  const fp = path.join(process.cwd(), rel);
  if (!fs.existsSync(fp)) {
    console.log("missing", rel);
    continue;
  }
  let src = fs.readFileSync(fp, "utf8");
  if (src.includes("safeJsonRoute(")) {
    console.log("already-wrapped", rel);
    continue;
  }

  const lines = src.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith("import ")) insertAt = i + 1;
  }
  lines.splice(insertAt, 0, 'import { safeJsonRoute } from "@/lib/safe-json-route";');
  src = lines.join("\n");

  src = src.replace(
    /^export async function (GET|POST|PATCH|PUT|DELETE)\s*\(/gm,
    (_match, name) => `async function _handler_${name}(`,
  );

  for (const name of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
    const re = new RegExp(`_handler_${name}\\b`);
    if (re.test(src) && !src.includes(`export const ${name} = safeJsonRoute(`)) {
      src += `\nexport const ${name} = safeJsonRoute(_handler_${name});\n`;
    }
  }
  fs.writeFileSync(fp, src, "utf8");
  console.log("wrapped", rel);
  updated += 1;
}

console.log(`updated ${updated} files`);
