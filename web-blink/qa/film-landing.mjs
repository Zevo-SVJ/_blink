/**
 * The film, in the page it ships in.
 *
 * Three things this is looking for, none of which typechecking can see:
 * whether the section reserves its height before the chunk arrives (layout
 * shift), whether the frame is a sensible size at every width, and whether it
 * actually plays when it comes into view.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:8080";
const OUT = "qa/shots";
mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  ["390", 390, 844],
  ["768", 768, 1024],
  ["1280", 1280, 800],
];

const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

const browser = await chromium.launch({ executablePath: process.env.CHROME });

for (const [label, w, h] of WIDTHS) {
  console.log(`\n=== ${label}px ===`);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(APP + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  const section = page.locator("#film");
  if (!(await section.count())) { bad(`${label}: no #film section`); await page.close(); continue; }

  // Height before the chunk is requested — the reserved box.
  const before = await section.boundingBox();

  // Scroll it into view instantly. `scroll-behavior: smooth` on <html> means
  // scrollIntoView glides, and a glide is measured as motion.
  await page.evaluate(() => {
    const el = document.querySelector("#film");
    el.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await page.waitForTimeout(2500);

  const after = await section.boundingBox();
  const shift = Math.abs(after.height - before.height);
  if (shift <= 2) ok(`${label}: section height unchanged when the film loads (${Math.round(before.height)}px)`);
  else bad(`${label}: section grew ${Math.round(shift)}px when the film loaded — layout shift`);

  const player = page.locator("[data-film-player]");
  if (!(await player.count())) { bad(`${label}: player never mounted`); await page.close(); continue; }
  ok(`${label}: player mounted`);

  const box = await player.boundingBox();
  const ratio = box.height / box.width;
  // The control row and the progress rail sit outside the 9:16 frame.
  if (ratio > 1.5 && ratio < 2.1) ok(`${label}: frame is ${Math.round(box.width)}×${Math.round(box.height)} (${ratio.toFixed(2)}:1)`);
  else bad(`${label}: frame ratio ${ratio.toFixed(2)} is not portrait-ish`);

  if (box.width <= w - 24) ok(`${label}: frame fits the column`);
  else bad(`${label}: frame is ${Math.round(box.width)}px in a ${w}px viewport`);

  // Is it actually playing?
  const f1 = Number(await player.getAttribute("data-film-frame"));
  await page.waitForTimeout(900);
  const f2 = Number(await player.getAttribute("data-film-frame"));
  if (f2 > f1) ok(`${label}: playing (frame ${f1} → ${f2})`);
  else bad(`${label}: not playing (stuck on frame ${f1})`);

  // And does it stop when it is not on screen?
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  const f3 = Number(await player.getAttribute("data-film-frame"));
  await page.waitForTimeout(700);
  const f4 = Number(await player.getAttribute("data-film-frame"));
  if (f4 === f3) ok(`${label}: paused when scrolled away`);
  else bad(`${label}: still running off screen (${f3} → ${f4})`);

  // Body must never scroll sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow <= 1) ok(`${label}: no horizontal overflow`);
  else bad(`${label}: page scrolls ${overflow}px sideways`);

  await page.evaluate(() => document.querySelector("#film").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/film-landing-${label}.png` });

  await page.close();
}

/*
  The loop boundary.

  The film wraps at its last frame, and the first version wrapped by stopping
  and restarting on the next tick. That races the observer: scroll away on the
  last frame and the queued restart lands after the pause, so the film runs on
  behind the reader forever. Worth its own check because it is invisible
  except at one frame in six hundred and seventy-eight.
*/
{
  console.log("\n=== the loop ===");
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(APP + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector("#film").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(1500);

  const player = page.locator("[data-film-player]");
  // Long enough to cross the end at least once (the film is ~22.6s).
  const seen = [];
  const started = Date.now();
  while (Date.now() - started < 26000) {
    seen.push(Number(await player.getAttribute("data-film-frame")));
    await page.waitForTimeout(250);
  }

  const wrapped = seen.some((f, i) => i > 0 && f < seen[i - 1]);
  if (wrapped) ok("loops back to the start");
  else bad(`never wrapped in 26s (highest frame ${Math.max(...seen)})`);

  // And is still under the observer's control after wrapping.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(600);
  const a = Number(await player.getAttribute("data-film-frame"));
  await page.waitForTimeout(900);
  const b = Number(await player.getAttribute("data-film-frame"));
  if (a === b) ok("still pauses off screen after a loop");
  else bad(`ran on off screen after looping (${a} → ${b})`);

  await page.close();
}

console.log("\nPROBLEMS: " + (problems.length ? "\n  - " + problems.join("\n  - ") : "none"));
await browser.close();
process.exit(problems.length ? 1 : 0);
