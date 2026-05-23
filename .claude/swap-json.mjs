import fs from "node:fs";

const files = [
  "components/StoryWriterShell.tsx",
  "components/AIPlaygroundShell.tsx",
  "components/PhotoFixShell.tsx",
  "components/SmartRecapShell.tsx",
  "components/DocSenseShell.tsx",
  "components/HomeCommandSurface.tsx",
];
const idents = [
  "res","response","reload","list","statusResponse","statusRes","resultRes",
  "xmlRes","watchRes","submit","putRes","bRes","tRes","cRes","gRes","pRes",
];

for (const fn of files) {
  let src = fs.readFileSync(fn, "utf8");
  const before = src;
  for (const id of idents) {
    const re = new RegExp(`await\\s+${id}\\.json\\(\\)`, "g");
    src = src.replace(re, `await safeParseJson(${id})`);
  }
  if (src !== before) {
    if (!src.includes("@/lib/fetch-json")) {
      const lines = src.split("\n");
      let insertAt = 0;
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].startsWith("import ")) insertAt = i + 1;
      }
      lines.splice(insertAt, 0, 'import { safeParseJson } from "@/lib/fetch-json";');
      src = lines.join("\n");
    }
    fs.writeFileSync(fn, src, "utf8");
    console.log("updated", fn);
  } else {
    console.log("skipped", fn);
  }
}
