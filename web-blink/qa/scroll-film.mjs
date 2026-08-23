/**
 * Blink — does the landing keep moving while you scroll it?
 *
 * ## The failure this catches
 *
 * "The user scrolls normally and suddenly the page repositions somewhere
 * else." Every other check here said the landing was fine: `scrollY` was
 * continuous to the pixel, the document height never changed, nothing called
 * `scrollTo`. All true, and all beside the point — the page was not moving the
 * reader, it was *failing to move at all* for two thousand pixels and then
 * changing everything at once. A reader cannot tell that apart from a jump,
 * and reported it as one.
 *
 * So this measures what a reader actually experiences: a frame every N pixels
 * down the document, and how much of the viewport changed since the frame
 * before. A run of near-zero frames is a stretch of scrolling that does
 * nothing, which is the defect.
 *
 * ## The metric
 *
 * Every 4th pixel, all three channels, threshold 10 — plus the text visible in
 * the viewport, compared as a string.
 *
 * Pixels alone are not enough in either direction. Coarse sampling scored a
 * frame that gained two whole words at 0%, which would have hidden a fix as
 * reliably as it exposed the bug; and even fine sampling scores a score
 * counting 8.0 → 8.7 at a tenth of a percent, because two glyphs are a
 * rounding error in a phone screen. Text is most of what changes on this page,
 * so a frame only counts as dead when *neither* the pixels nor the words
 * moved.
 *
 *   APP_URL=http://127.0.0.1:4173 node qa/scroll-film.mjs
 *   STEPS=60 W=1280 H=900 node qa/scroll-film.mjs     # desktop
 *   KEEP=1 node qa/scroll-film.mjs                    # also write the frames
 */
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { writeFileSync, mkdirSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const W = Number(process.env.W ?? 390);
const H = Number(process.env.H ?? 844);
const STEPS = Number(process.env.STEPS ?? 48);
const KEEP = process.env.KEEP === "1";
const OUT = process.env.OUT ?? "qa/shots/film";

/** Below this, a frame is indistinguishable from the one before it. */
const DEAD = 0.6;
/** Two dead frames in a row is a stretch of scroll that does nothing. */
const MAX_DEAD_RUN = 1;

if (KEEP) mkdirSync(OUT, { recursive: true });

const problems = [];
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  hasTouch: W < 800,
  isMobile: W < 800,
});
const page = await context.newPage();
await page.goto(APP, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
let previous = null;
let previousText = null;
const rows = [];

for (let i = 0; i <= STEPS; i++) {
  const y = Math.round((max * i) / STEPS);
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: "instant" }), y);
  await page.waitForTimeout(420);
  const buf = await page.screenshot();
  if (KEEP) writeFileSync(`${OUT}/${String(i).padStart(3, "0")}.png`, buf);

  const png = PNG.sync.read(buf);
  let changed = 0;
  let counted = 0;
  if (previous) {
    const n = Math.min(png.data.length, previous.data.length);
    for (let p = 0; p < n; p += 16) {
      counted++;
      if (
        Math.abs(png.data[p] - previous.data[p]) > 10 ||
        Math.abs(png.data[p + 1] - previous.data[p + 1]) > 10 ||
        Math.abs(png.data[p + 2] - previous.data[p + 2]) > 10
      ) {
        changed++;
      }
    }
  }
  previous = png;

  /* What a reader can actually read right now. Elements are only counted when
     they are inside the viewport, so scrolling past text does not register as
     the text having changed. */
  const text = await page.evaluate(() => {
    const seen = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue?.trim();
      if (!value) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight && r.width > 0) seen.push(value);
    }
    return seen.join("\u001f");
  });

  const section = await page.evaluate(() => {
    const mid = window.innerHeight / 2;
    for (const s of document.querySelectorAll("main section, main > div")) {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) {
        return s.id || s.getAttribute("aria-label") || "—";
      }
    }
    return "—";
  });

  rows.push({
    i,
    y,
    pct: counted ? (100 * changed) / counted : 0,
    section,
    text,
    textMoved: previousText !== null && text !== previousText,
  });
  previousText = text;
}

console.log(`\n=== ${W}×${H}, ${STEPS} frames over ${max}px ===`);
console.log("  #   scroll   changed  section");
for (const r of rows) {
  const dead = r.i > 0 && r.pct < DEAD && !r.textMoved;
  const flag = dead ? " ← nothing changed" : r.textMoved && r.pct < DEAD ? " (words only)" : "";
  console.log(
    `${String(r.i).padStart(3)}  ${String(r.y).padStart(7)}   ${r.pct.toFixed(1).padStart(5)}%  ` +
      `${"▏".repeat(Math.min(40, Math.round(r.pct)))} ${r.section}${flag}`,
  );
}

// A single quiet frame is a pause. Two in a row is a reader wondering whether
// the page has stopped working.
let run = 0;
let worstRun = 0;
let worstAt = null;
for (const r of rows.slice(1)) {
  if (r.pct < DEAD && !r.textMoved) {
    run++;
    if (run > worstRun) { worstRun = run; worstAt = r; }
  } else {
    run = 0;
  }
}
if (worstRun > MAX_DEAD_RUN) {
  const px = Math.round((max / STEPS) * worstRun);
  problems.push(
    `${worstRun} consecutive frames with no visible change (~${px}px of scrolling), ending in "${worstAt.section}" at ${worstAt.y}px`,
  );
  console.log(`\n  ✗ ${problems[0]}`);
} else {
  console.log(`\n  ✓ no stretch of scroll longer than one frame does nothing`);
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exitCode = problems.length ? 1 : 0;
