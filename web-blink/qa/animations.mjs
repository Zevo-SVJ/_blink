/**
 * Blink — the two animations that are allowed to move, and the one thing they
 * must never move.
 *
 * ## How It Works
 *
 * The sequence shrinks the screenshot to a thumbnail mid-run. That element sits
 * in normal flow, so when it shrank the section got shorter, the document got
 * shorter, and a reader parked below it was clamped upward by the browser —
 * the "landing jumps up by itself" report. The fix reserved the subject's full
 * height for the whole sequence, so the animation is unchanged and the page is
 * still. This samples the document height across a full cycle to prove it.
 *
 * ## PDP targeting
 *
 * The analysis animation locates the profile picture and zooms to it. If the
 * computed target is off, the zoom lands beside the face — which no DOM
 * assertion catches, because the maths is self-consistent and wrong. So this
 * measures where the reticle actually is against where the avatar actually is,
 * in the rendered page, and saves the frame for a human to look at.
 *
 *   node qa/animations.mjs        # against the preview build
 *   DEV=1 node qa/animations.mjs  # against the dev server, for the mock flow
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
const OUT = process.env.OUT ?? "/tmp/blink-qa";
mkdirSync(OUT, { recursive: true });

const problems = [];
const bad = (s) => { problems.push(s); console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

// ---------------------------------------------------------------------------
// How It Works — the animation runs, the page does not move
// ---------------------------------------------------------------------------

for (const [device, viewport] of [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1280, height: 900 }],
]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  console.log(`\n=== How It Works / ${device} ===`);

  // Scroll the section into view so its observer starts the sequence, then
  // hold still and watch both the document height and our own scroll position.
  await page.evaluate(() => {
    document.querySelector("#how-it-works")?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(600);

  const samples = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const heights = [];
        const scrolls = [];
        const started = performance.now();
        const tick = () => {
          heights.push(document.body.scrollHeight);
          scrolls.push(Math.round(window.scrollY));
          // A full cycle of the sequence is about 9s; 12 covers it with margin.
          if (performance.now() - started < 12000) requestAnimationFrame(tick);
          else resolve({ heights, scrolls });
        };
        requestAnimationFrame(tick);
      }),
  );

  const heights = [...new Set(samples.heights)];
  const scrolls = [...new Set(samples.scrolls)];
  const heightSpread = Math.max(...samples.heights) - Math.min(...samples.heights);
  const scrollSpread = Math.max(...samples.scrolls) - Math.min(...samples.scrolls);

  if (heightSpread > 2) {
    bad(`document height moved ${heightSpread}px during the sequence (${heights.slice(0, 4).join(", ")}…)`);
  } else {
    ok(`document height held at ${samples.heights[0]}px across ${samples.heights.length} frames`);
  }

  if (scrollSpread > 2) {
    bad(`the page scrolled by itself: ${scrollSpread}px (${scrolls.slice(0, 4).join(", ")}…)`);
  } else {
    ok("scroll position never moved on its own");
  }

  // The animation still animates — a frozen sequence would pass the checks
  // above for the wrong reason.
  const moved = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const seen = new Set();
        const started = performance.now();
        const tick = () => {
          const el = document.querySelector("#how-it-works .origin-top");
          if (el) {
            const r = el.getBoundingClientRect();
            seen.add(`${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          if (performance.now() - started < 6000) requestAnimationFrame(tick);
          else resolve(seen.size);
        };
        requestAnimationFrame(tick);
      }),
  );
  if (moved <= 1) bad("the How It Works subject never changed size — is the animation running?");
  else ok(`the subject animates (${moved} distinct sizes observed)`);

  await page.screenshot({ path: `${OUT}/howitworks-${device}.png` });
  await ctx.close();
}

// ---------------------------------------------------------------------------
// PDP targeting — is the reticle actually on the avatar?
// ---------------------------------------------------------------------------

/*
  The analysis animation only runs on a real upload, which needs a file and a
  live endpoint. The dev server exposes the same flow behind `?mock=own`, so
  the geometry can be exercised without either. Against a production preview
  the mock is compiled out — that is deliberate — so this section reports that
  it was skipped rather than pretending to have checked it.
*/
if (process.env.DEV) {
  for (const [device, viewport] of [
    ["mobile", { width: 390, height: 844 }],
    ["desktop", { width: 1280, height: 900 }],
  ]) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    console.log(`\n=== PDP targeting / ${device} ===`);

    await page.goto(`${BASE}/analyze?mock=own`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // Feed the flow a screenshot-shaped image with a known avatar position:
    // a light disc at 20% across, 25% down, which is where Instagram puts it.
    await page.setInputFiles("input[type=file]", {
      name: "profile.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        await page.evaluate(() => {
          const c = document.createElement("canvas");
          c.width = 540;
          c.height = 1170;
          const x = c.getContext("2d");
          x.fillStyle = "#0d1b3d";
          x.fillRect(0, 0, c.width, c.height);
          x.fillStyle = "#dce9f7";
          x.beginPath();
          x.arc(c.width * 0.2, c.width * 0.25, c.width * 0.12, 0, Math.PI * 2);
          x.fill();
          return c.toDataURL("image/png").split(",")[1];
        }),
        "base64",
      ),
    });

    await page.waitForTimeout(800);
    const analyse = page.getByRole("button", { name: /Analyze this profile|Analyser ce profil/ });
    if (await analyse.count()) await analyse.first().click();

    /*
      Measure at the exact frame the reticle exists, from inside the page.

      Two round trips (wait for the selector, then evaluate) are too slow here:
      in mock mode the analysis resolves at almost the same moment the
      targeting appears, so the result screen can replace it between the two
      calls — which is what made an earlier version of this check report that
      it could not find either element. Polling with `requestAnimationFrame`
      and returning the geometry in the same tick removes the race entirely.
    */
    const geometry = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const deadline = performance.now() + 15000;
          const tick = () => {
            const ring = document.querySelector("[data-pdp-target]");
            const img = document.querySelector("img[alt]:not([alt=''])");
            if (ring && img) {
              const a = img.getBoundingClientRect();
              const b = ring.getBoundingClientRect();
              resolve({
                // The synthetic capture puts the avatar at 20% across and 25%
                // of the *width* down, which is where Instagram places it.
                avatar: { x: a.left + a.width * 0.2, y: a.top + a.width * 0.25 },
                ring: { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width },
              });
              return;
            }
            if (performance.now() < deadline) requestAnimationFrame(tick);
            else resolve(null);
          };
          requestAnimationFrame(tick);
        }),
    );

    await page.screenshot({ path: `${OUT}/pdp-${device}.png` });

    if (!geometry) {
      bad("could not find both the screenshot and the targeting reticle on screen");
    } else {
      const dx = Math.abs(geometry.ring.x - geometry.avatar.x);
      const dy = Math.abs(geometry.ring.y - geometry.avatar.y);
      // Within a quarter of the reticle's own width is "on the avatar".
      const tolerance = Math.max(12, geometry.ring.w * 0.25);
      if (dx > tolerance || dy > tolerance) {
        bad(`reticle is ${Math.round(dx)}px, ${Math.round(dy)}px off the avatar (tolerance ${Math.round(tolerance)}px)`);
      } else {
        ok(`reticle centred on the avatar (${Math.round(dx)}px, ${Math.round(dy)}px off)`);
      }
    }

    await ctx.close();
  }
} else {
  console.log(
    "\n=== PDP targeting ===\n  – skipped: needs the dev server, where `?mock=own` exists.\n    Run `npm run dev` and re-run with DEV=1 BASE=http://127.0.0.1:8080",
  );
}

await browser.close();
console.log(`\nScreenshots: ${OUT}`);
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exit(problems.length ? 1 : 0);
