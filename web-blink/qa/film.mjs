/**
 * Blink — the film, frame by frame.
 *
 * An ad is judged on beats that last a fifth of a second. Watching it back is
 * how those go unexamined: you register that something happened, not what it
 * looked like. Every scene is a pure function of its frame, so this asks for
 * exact frames and photographs them.
 *
 * Shoots the head, middle and tail of every scene plus the beats that carry
 * the piece — the three hook lines, the blink, each perception landing, the
 * turn, the score, the CTA — and lays them out as strips per scene.
 *
 *   node qa/film.mjs
 *   FRAMES=0,12,58 node qa/film.mjs     # just these
 *   LANG=fr node qa/film.mjs            # the French cut
 *
 * The film exists in both languages and the words are the picture, so the
 * French cut is a different composition — longer words, different line
 * breaks — and has to be looked at rather than assumed to follow.
 */

import fs from "node:fs";
import path from "node:path";

import { check, ok, openApp, report, section, shot } from "./drive.mjs";

const APP = process.env.APP_URL ?? "http://localhost:8080";
const SHOTS_DIR = "/home/user/_blink/web-blink/qa/shots";
const LANG = process.env.LANG_ === "fr" ? "fr" : "en";
const TAG = LANG === "fr" ? "-fr" : "";

/** Read the edit out of the page rather than duplicating it here. */
async function readTimeline(page) {
  await page.goto(`${APP}/dev?frame=0&lang=${LANG}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  return page.evaluate(() => {
    const el = document.querySelector("[data-film-readout]");
    const text = el?.textContent ?? "";
    const total = Number(text.split("/")[1]?.trim().split(" ")[0]) + 1;
    const scenes = [...document.querySelectorAll("#film button")]
      .map((b) => b.textContent?.trim())
      .filter((t) => t && !["Play", "Pause", "Reset", "en", "fr", "EN", "FR"].includes(t));
    return { total, scenes };
  });
}

const { browser, page } = await openApp({ width: "430", signedIn: false });
const meta = await readTimeline(page);

section("the edit");
check(Number.isFinite(meta.total) && meta.total > 300, `film is ${meta.total} frames (${(meta.total / 30).toFixed(1)}s)`);
check(meta.scenes.length === 7, `seven scenes: ${meta.scenes.join(", ")}`);

/** Frames worth looking at, named. */
const BEATS = process.env.FRAMES
  ? process.env.FRAMES.split(",").map((f) => ({ frame: Number(f), name: `f${f}` }))
  : [
      /* Scene heads, from the timeline: hook 0, profile 90, analysis 168,
         perceptions 270, turn 426, score 504, outro 582. The first pass
         guessed at these and photographed the wrong beats. */
      { frame: 0, name: "hook-open" },
      { frame: 14, name: "hook-line1" },
      { frame: 34, name: "hook-line2" },
      { frame: 60, name: "hook-line3" },
      { frame: 66, name: "hook-blink" },
      { frame: 92, name: "profile-land" },
      { frame: 112, name: "profile-grid" },
      { frame: 150, name: "profile-hold" },
      { frame: 176, name: "analysis-open" },
      { frame: 210, name: "analysis-travel" },
      { frame: 250, name: "analysis-signal" },
      { frame: 276, name: "read-1" },
      { frame: 315, name: "read-2" },
      { frame: 354, name: "read-3" },
      { frame: 393, name: "read-4" },
      { frame: 440, name: "turn-setup" },
      { frame: 478, name: "turn-payoff" },
      { frame: 520, name: "score-draw" },
      { frame: 556, name: "score-land" },
      { frame: 596, name: "outro-open" },
      { frame: 622, name: "outro-line" },
      { frame: 652, name: "outro-cta" },
    ];

section("beats");
const files = [];
for (const beat of BEATS) {
  await page.goto(`${APP}/dev?frame=${beat.frame}&lang=${LANG}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  const box = await page.evaluate(() => {
    const el = document.querySelector("[data-film-scrubber]");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height, text: el.innerText.replace(/\s+/g, " ").trim() };
  });

  if (!box) {
    check(false, "", `frame ${beat.frame}: the film did not render`);
    continue;
  }

  const file = path.join(SHOTS_DIR, `film${TAG}-${String(beat.frame).padStart(3, "0")}-${beat.name}.png`);
  await page.locator("[data-film-scrubber]").screenshot({ path: file });
  files.push({ ...beat, file, text: box.text });

  /* Nothing on screen at all is a real failure and easy to miss in a strip of
     twenty stills — a black frame looks like an intentional cut. */
  const blank = await page.evaluate(() => {
    const el = document.querySelector("[data-film-scrubber]");
    return (el?.innerText ?? "").trim().length === 0;
  });
  check(!blank || beat.name.includes("blink"), `f${beat.frame} ${beat.name}: has content`, `f${beat.frame} ${beat.name}: the frame is empty`);
}

ok(`${files.length} frames written`);

/* Lay them out per scene so pacing can be read, not just individual frames. */
const strips = {
  hook: files.filter((f) => f.frame < 90),
  profile: files.filter((f) => f.frame >= 90 && f.frame < 168),
  analysis: files.filter((f) => f.frame >= 168 && f.frame < 270),
  perceptions: files.filter((f) => f.frame >= 270 && f.frame < 426),
  turn: files.filter((f) => f.frame >= 426 && f.frame < 504),
  score: files.filter((f) => f.frame >= 504 && f.frame < 582),
  outro: files.filter((f) => f.frame >= 582),
};

for (const [name, group] of Object.entries(strips)) {
  if (!group.length) continue;
  const html = `<body style="margin:0;background:#0b0f1a;display:inline-flex;gap:14px;padding:18px;font-family:system-ui">
${group
  .map(
    (g) => `<figure style="margin:0">
  <figcaption style="color:#7fa;font-size:12px;padding-bottom:5px">f${g.frame} · ${g.name}</figcaption>
  <img src="data:image/png;base64,${fs.readFileSync(g.file).toString("base64")}" style="width:230px;display:block;border-radius:10px">
</figure>`,
  )
  .join("")}
</body>`;
  await page.setContent(html);
  await page.waitForTimeout(250);
  await page.locator("body").screenshot({ path: path.join(SHOTS_DIR, `strip${TAG}-${name}.png`) });
  console.log(`    · strip${TAG}-${name}.png`);
}

await browser.close();
process.exit(report() ? 1 : 0);
