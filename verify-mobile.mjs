// Mobile audit at 360×800 (iPhone SE width). For each route:
//   - load with fake auth cookie
//   - take a 360-wide screenshot
//   - measure document overflow vs viewport width (>16px = horizontal scroll, the #1 mobile bug)
//   - flag any element wider than viewport
//   - dump console errors
//
// Usage: npm run dev (or build+start) on :3000, then `node verify-mobile.mjs`.

import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.MOBILE_BASE || "http://localhost:3000";
const OUT = "verify-screenshots/mobile";
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "legal-privacy", path: "/legal/privacy" },
  { name: "legal-terms", path: "/legal/terms" },
  { name: "ai-playground", path: "/ai-playground" },
  { name: "photo-fix", path: "/photo-fix" },
  { name: "smart-recap", path: "/smart-recap" },
  { name: "docsense", path: "/docsense" },
  { name: "story-writer", path: "/story-writer" },
  { name: "voice-studio", path: "/voice-studio" },
  { name: "video-studio", path: "/video-studio" },
  { name: "mystic-deck", path: "/mystic-deck" },
  { name: "language-tutor", path: "/language-tutor" },
  { name: "markets", path: "/markets" },
  { name: "ai-store", path: "/ai-store" },
  { name: "tools", path: "/tools" },
  { name: "calculators", path: "/calculators" },
  { name: "profile", path: "/profile" },
];

const VIEWPORT = { width: 360, height: 800 };
const OVERFLOW_TOLERANCE = 4; // pixels — sub-pixel rounding noise

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
});

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
  let overflow = null;
  let widestSelector = null;
  try {
    const resp = await page.goto(BASE + r.path, { waitUntil: "domcontentloaded", timeout: 30000 });
    const code = resp ? resp.status() : 0;
    await page.waitForTimeout(1200);

    // Measure overflow via DOM probe: any element whose offset right edge
    // sticks past the viewport is a horizontal-scroll bug.
    const probe = await page.evaluate((vw) => {
      const all = Array.from(document.querySelectorAll("*"));
      let widest = { selector: "", right: 0 };
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.right > widest.right) {
          widest = {
            selector:
              el.tagName.toLowerCase() +
              (el.id ? "#" + el.id : "") +
              (el.className && typeof el.className === "string"
                ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
                : ""),
            right: Math.round(r.right),
          };
        }
      }
      return {
        docWidth: document.documentElement.scrollWidth,
        viewportWidth: vw,
        widest,
      };
    }, VIEWPORT.width);

    overflow = probe.docWidth - probe.viewportWidth;
    widestSelector = probe.widest;

    const screenshotPath = `${OUT}/${r.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });

    details = `http=${code} doc=${probe.docWidth}px overflow=${overflow}px widest=${probe.widest.right}px(${probe.widest.selector}) took=${Date.now() - start}ms`;

    if (code >= 400) status = "HTTP_ERROR";
    else if (overflow > OVERFLOW_TOLERANCE) status = "OVERFLOW";
    if (pageErrors.length) {
      status = status === "OK" ? "JS_ERROR" : status + "+JS";
      details += ` pageErrors=${pageErrors.length}`;
    }
  } catch (e) {
    status = "EXCEPTION";
    details = e.message;
  }
  results.push({
    route: r.path,
    status,
    overflow,
    widest: widestSelector,
    details,
    consoleErrors: [...consoleErrors],
    pageErrors: [...pageErrors],
  });
  console.log(`${status.padEnd(11)} ${r.path.padEnd(22)} ${details}`);
  if (pageErrors.length) {
    for (const e of pageErrors) console.log("   pageError:", e);
  }
}

await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));

const overflowing = results.filter((r) => r.status.includes("OVERFLOW"));
const erroring = results.filter((r) => r.status.includes("ERROR") || r.status === "JS_ERROR" || r.status === "EXCEPTION");
console.log(`\nDone. ${routes.length} routes scanned.`);
console.log(`Overflow violations: ${overflowing.length}`);
console.log(`Error pages: ${erroring.length}`);
if (overflowing.length) {
  console.log("\nRoutes with horizontal overflow:");
  for (const r of overflowing) console.log(`  ${r.route} → +${r.overflow}px (${r.widest?.selector})`);
}
