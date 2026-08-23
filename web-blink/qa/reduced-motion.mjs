/**
 * Blink — what the product looks like when someone asks for less motion.
 *
 * `prefers-reduced-motion` is not "run the same animation, faster". Every
 * scroll-driven or auto-playing sequence has to resolve to its *end state*
 * immediately, because the point of the setting is that nothing moves without
 * the reader asking for it — and because a sequence that only tells its story
 * through motion tells that reader nothing at all.
 *
 * So this checks the two things that would be invisible in a screenshot taken
 * with motion on: that the pinned sequences show their conclusion at rest, and
 * that nothing on the page is still moving a second after it settles.
 *
 *   APP_URL=http://127.0.0.1:4173 node qa/reduced-motion.mjs
 */
import { openApp } from "./drive.mjs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

const { browser, page } = await openApp({ width: "390", reducedMotion: "reduce", signedIn: false });
await page.goto(APP, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

// The eye is fully open without anyone scrolling to it.
await page.evaluate(() => {
  const s = document.querySelector("#problem");
  window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY);
});
await page.waitForTimeout(900);
const lid = await page.evaluate(() => {
  const p = document.querySelector('[data-eye="lid"]');
  const r = p?.getBoundingClientRect();
  return r ? Math.round(r.height) : 0;
});
if (lid > 40) ok(`the eye is open at rest (lid box ${lid}px)`);
else bad(`the eye is still shut under reduced motion (lid box ${lid}px)`);

// How It Works shows its conclusion — the score — rather than step one.
await page.evaluate(() => {
  const s = document.getElementById("how-it-works");
  window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 80);
});
await page.waitForTimeout(900);
const selected = await page.evaluate(
  () => document.querySelector('#how-it-works [role="tab"][aria-selected="true"]')?.textContent?.trim(),
);
if (selected && /score/i.test(selected)) ok(`How It Works rests on its conclusion ("${selected}")`);
else bad(`How It Works rests on "${selected}" rather than the score`);

// Nothing is still moving once the page has settled.
const drift = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const track = [...document.querySelectorAll("#how-it-works *, #problem *")].slice(0, 400);
      const first = track.map((el) => {
        const r = el.getBoundingClientRect();
        return `${Math.round(r.x)},${Math.round(r.y)}`;
      });
      setTimeout(() => {
        let moved = 0;
        track.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          if (`${Math.round(r.x)},${Math.round(r.y)}` !== first[i]) moved += 1;
        });
        resolve(moved);
      }, 1500);
    }),
);
if (drift === 0) ok("nothing moves on its own after the page settles");
else bad(`${drift} element(s) were still moving 1.5s after settling`);

await browser.close();
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exitCode = problems.length ? 1 : 0;
