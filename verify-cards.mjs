import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "verify-screenshots";
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  { name: "home", path: "/" },
  { name: "ai-playground", path: "/ai-playground" },
  { name: "photo-fix", path: "/photo-fix" },
  { name: "smart-recap", path: "/smart-recap" },
  { name: "docsense", path: "/docsense" },
  { name: "story-writer", path: "/story-writer" },
  { name: "voice-studio", path: "/voice-studio" },
  { name: "video-studio", path: "/video-studio" },
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});

// Inject a fake auth cookie so middleware lets us through.
await context.addCookies([
  {
    name: "authjs.session-token",
    value: "fake-verify-token",
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  },
]);

const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(`[${page.url()}] ${msg.text()}`);
});
page.on("pageerror", (err) => {
  pageErrors.push(`[${page.url()}] ${err.message}`);
});

const results = [];
for (const r of routes) {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  const start = Date.now();
  let status = "OK";
  let details = "";
  try {
    const resp = await page.goto(BASE + r.path, { waitUntil: "domcontentloaded", timeout: 30000 });
    const code = resp ? resp.status() : 0;
    // Wait a moment for hydration / async chunks
    await page.waitForTimeout(1500);
    const title = await page.title().catch(() => "");
    const bodyText = (await page.textContent("body").catch(() => "")) || "";
    const visibleLen = bodyText.replace(/\s+/g, " ").trim().length;
    const screenshotPath = `${OUT}/${r.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    details = `http=${code} title="${title.slice(0, 80)}" textLen=${visibleLen} took=${Date.now() - start}ms`;
    if (code >= 400) status = "HTTP_ERROR";
    if (pageErrors.length) {
      status = "JS_ERROR";
      details += ` pageErrors=${pageErrors.length}`;
    }
  } catch (e) {
    status = "EXCEPTION";
    details = e.message;
  }
  results.push({
    route: r.path,
    status,
    details,
    consoleErrors: [...consoleErrors],
    pageErrors: [...pageErrors],
  });
  console.log(`${status.padEnd(11)} ${r.path.padEnd(20)} ${details}`);
  if (pageErrors.length) {
    for (const e of pageErrors) console.log("   pageError:", e);
  }
  if (consoleErrors.length) {
    for (const e of consoleErrors.slice(0, 3)) console.log("   console:", e.slice(0, 240));
  }
}

await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log("\nDone. screenshots+log in", OUT);
