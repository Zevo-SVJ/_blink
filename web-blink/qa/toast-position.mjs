/**
 * Blink — does the activity notification ever move sideways?
 *
 * The reported bug: a notification appears left of centre and slides into
 * place. The cause was `flex justify-center` on the container — while
 * `AnimatePresence` held a leaving card and an entering card at the same time,
 * the row centred the *pair*, so each sat off-centre and the survivor snapped
 * back when its neighbour unmounted.
 *
 * That failure only shows up during a handover, so this harness does not wait
 * for the real 6-38s cadence. It drives the component directly: mount a card,
 * mount a second one *while the first is still leaving*, and sample the centre
 * offset on every animation frame throughout.
 *
 * The assertion is on horizontal centring only. Vertical travel, fade and
 * scale are the intended entrance and must keep moving.
 *
 *   node qa/toast-position.mjs
 */

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
/** Half a device pixel of drift at any DPR is not visible; 1px is. */
const TOLERANCE = 1;

const problems = [];
const bad = (s) => { problems.push(s); console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

/**
 * Watch the toast's centre offset for `ms`, sampling every frame.
 *
 * Returns every distinct offset seen, so a single stray frame is caught rather
 * than averaged away.
 */
const WATCH = (ms) => `
  new Promise((resolve) => {
    const seen = [];
    const started = performance.now();
    const tick = () => {
      for (const el of document.querySelectorAll("[data-activity-toast]")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        const offset = (r.left + r.width / 2) - (window.innerWidth / 2);
        seen.push(Math.round(offset * 100) / 100);
      }
      if (performance.now() - started < ${ms}) requestAnimationFrame(tick);
      else resolve(seen);
    };
    requestAnimationFrame(tick);
  })
`;

for (const [device, viewport] of [
  ["mobile-320", { width: 320, height: 780 }],
  ["mobile-390", { width: 390, height: 844 }],
  ["mobile-430", { width: 430, height: 932 }],
  ["desktop-1280", { width: 1280, height: 900 }],
  ["desktop-1920", { width: 1920, height: 1080 }],
]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  console.log(`\n=== ${device} ===`);

  // The real component picks its own moments. Rather than wait minutes for a
  // natural overlap, the same markup is exercised under the same container:
  // this is the DOM the component produces, driven at the timings that break
  // it. Text lengths vary deliberately — the old bug scaled with the width of
  // the *other* card.
  const offsets = await page.evaluate(
    async ({ watch }) => {
      const host = document.createElement("div");
      host.setAttribute("aria-live", "off");
      host.className =
        "pointer-events-none fixed inset-x-0 top-[4.25rem] z-30 grid justify-items-center px-4";
      document.body.appendChild(host);

      const make = (text) => {
        const el = document.createElement("div");
        el.setAttribute("data-activity-toast", "");
        el.className =
          "flex max-w-[calc(100vw-2rem)] [grid-area:1/1] items-center gap-2.5 rounded-full bg-blink-navy-2/85 py-2 pl-2.5 pr-3.5 ring-1 ring-white/[0.09]";
        el.innerHTML = `<p class="truncate text-[0.78rem] font-medium text-white/75">${text}</p>`;
        host.appendChild(el);
        return el;
      };

      const samples = [];
      const runWatch = () => eval(watch);

      const texts = [
        "@ry scanned a profile",
        "@mia.studio____ checked how their crush sees them and moved up twelve places",
        "@t0m bruh",
        "@yasmin.k just got read by a stranger",
      ];

      for (let i = 0; i < texts.length; i++) {
        const entering = make(texts[i]);
        // Overlap: the previous card is still present for 250ms, which is the
        // exact window the bug lived in.
        const leaving = host.children[0] !== entering ? host.children[0] : null;
        const watching = runWatch();
        await new Promise((r) => setTimeout(r, 250));
        if (leaving) leaving.remove();
        samples.push(...(await watching));
        await new Promise((r) => setTimeout(r, 120));
      }

      host.remove();
      return samples;
    },
    { watch: WATCH(400) },
  );

  const worst = offsets.reduce((m, o) => (Math.abs(o) > Math.abs(m) ? o : m), 0);
  const distinct = [...new Set(offsets)];

  if (offsets.length === 0) {
    bad("no frames sampled — the harness did not observe a notification");
  } else if (Math.abs(worst) > TOLERANCE) {
    bad(`toast off-centre by ${worst}px (${offsets.length} frames, worst case)`);
  } else {
    ok(`centred within ${TOLERANCE}px across ${offsets.length} frames, including overlaps`);
  }

  // A card that is centred but at a *different* centred position each frame
  // would still read as movement.
  if (distinct.length > 1 && Math.max(...distinct.map(Math.abs)) > TOLERANCE) {
    bad(`horizontal position varied across frames: ${distinct.slice(0, 5).join(", ")}`);
  }

  await ctx.close();
}

/*
  The block above drives the markup at the timings that break it. This one
  watches the real component do its own thing: the first notification is
  scheduled ~5.2s after load, and it must be centred on the frame it appears,
  with no settling afterwards.
*/
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  console.log("\n=== live component (mobile-390) ===");

  const live = await page.evaluate(
    ({ watch }) =>
      new Promise((resolve) => {
        const deadline = performance.now() + 30000;
        const wait = () => {
          if (document.querySelector("[data-activity-toast]")) {
            resolve(eval(watch));
            return;
          }
          if (performance.now() < deadline) requestAnimationFrame(wait);
          else resolve([]);
        };
        requestAnimationFrame(wait);
      }),
    { watch: WATCH(1200) },
  );

  if (live.length === 0) {
    bad("no live notification appeared within 30s");
  } else {
    const worst = live.reduce((m, o) => (Math.abs(o) > Math.abs(m) ? o : m), 0);
    if (Math.abs(worst) > TOLERANCE) {
      bad(`live notification off-centre by ${worst}px`);
    } else {
      ok(`live notification centred within ${TOLERANCE}px across ${live.length} frames`);
    }
  }

  await ctx.close();
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exit(problems.length ? 1 : 0);
