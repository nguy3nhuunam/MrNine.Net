// Repair routes whose multi-line `import { ... }` got broken when we inserted
// `import { safeJsonRoute } ...` mid-block. The fix moves any safeJsonRoute
// import line that is currently *inside* a `import {` block to the bottom of
// the import group.
import fs from "node:fs";
import path from "node:path";

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile() && entry.name === "route.ts") out.push(full);
  }
  return out;
}

const targets = listFiles("app/api/story-writer").concat(listFiles("app/api/ai-playground")).concat([
  "app/api/smart-recap/route.ts",
  "app/api/docsense/route.ts",
  "app/api/ask-anything/route.ts",
]);

let fixed = 0;
for (const fp of targets) {
  if (!fs.existsSync(fp)) continue;
  let src = fs.readFileSync(fp, "utf8");
  const lines = src.split("\n");
  let mutated = false;

  // Detect a stray `import { safeJsonRoute } ...;` line that lives inside an
  // open `import {` block (no `}` between it and the open).
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === "import {") {
      let injectedAt = -1;
      let closeAt = -1;
      for (let j = i + 1; j < lines.length; j += 1) {
        const t = lines[j].trim();
        if (t.startsWith('import { safeJsonRoute }')) {
          injectedAt = j;
        }
        if (t.startsWith("}")) {
          closeAt = j;
          break;
        }
      }
      if (injectedAt > -1 && closeAt > -1) {
        const stray = lines[injectedAt];
        lines.splice(injectedAt, 1);
        // Insert after the close line of this import block.
        const newCloseAt = closeAt - 1; // shifted up by one
        lines.splice(newCloseAt + 1, 0, stray);
        mutated = true;
        // Restart scan
        i = 0;
      }
    }
  }

  if (mutated) {
    src = lines.join("\n");
    fs.writeFileSync(fp, src, "utf8");
    console.log("repaired", fp);
    fixed += 1;
  }
}
console.log(`repaired ${fixed} files`);
