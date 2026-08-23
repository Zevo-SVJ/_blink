/**
 * Blink — does the landing page ever move on its own?
 *
 * The report this exists to chase: "the user scrolls normally, and suddenly
 * the page repositions somewhere else." That is invisible to every other check
 * here, because nothing about it is a layout error at rest — the page is fine
 * before and fine after, and only the transition between them is wrong.
 *
 * ## How a jump is detected
 *
 * Scroll is driven with real wheel and touch events, not `window.scrollTo`, so
 * the browser's own scroll-anchoring, momentum and smooth-behaviour all run
 * the way they do for a reader. After each step the position is compared with
 * where that step should have landed. Anything beyond the tolerance is the
 * page having moved by itself.
 *
 * The tolerance is deliberately loose (24px) because a wheel event's exact
 * delta is not guaranteed, and deliberately not looser: the failure being
 * chased throws the reader hundreds of pixels.
 *
 * ## What it walks
 *
 *   down slow · down fast · up fast · reload mid-page · back/forward · resize
 *
 * Each is a different way to provoke it: slow scrolling gives lazy sections
 * time to mount one at a time, fast scrolling mounts several at once, reload
 * exercises the browser's scroll restoration against a document that is not
 * the same height yet, and resize re-runs every layout at once.
 *
 *   APP_URL=http://127.0.0.1:4173 node qa/scroll-continuity.mjs
 */
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const TOLERANCE = 24;

const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

const at = (page) => page.evaluate(() => Math.round(window.scrollY));
const height = (page) => page.evaluate(() => Math.round(document.body.scrollHeight));

/**
 * Scroll by wheel, one step at a time, watching for the page moving further
 * than it was pushed.
 */
async function walk(page, { steps, delta, pause, label }) {
  let worst = 0;
  let worstAt = null;
  let previous = await at(page);

  for (let i = 0; i < steps; i++) {
    const before = previous;
    const beforeHeight = await height(page);
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(pause);
    const after = await at(page);
    const afterHeight = await height(page);

    // At the ends of the document the browser clamps, which is not a jump.
    const maxScroll = await page.evaluate(
      () => document.body.scrollHeight - window.innerHeight,
    );
    const expected = Math.max(0, Math.min(maxScroll, before + delta));
    const drift = Math.abs(after - expected);

    if (drift > worst) {
      worst = drift;
      worstAt = { before, after, expected, beforeHeight, afterHeight };
    }
    previous = after;
  }

  if (worst > TOLERANCE) {
    bad(
      `${label}: page moved ${worst}px on its own ` +
        `(at ${worstAt.before} → landed ${worstAt.after}, expected ${worstAt.expected}` +
        (worstAt.beforeHeight !== worstAt.afterHeight
          ? `; document ${worstAt.beforeHeight} → ${worstAt.afterHeight}`
          : "; document height unchanged") +
        ")",
    );
  } else {
    ok(`${label}: continuous within ${worst}px`);
  }
  return worst;
}

for (const [name, width, w, h] of [
  ["phone", "390", 390, 844],
  ["desktop", "1280", 1280, 900],
]) {
  console.log(`\n=== ${name} (${w}×${h}) ===`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w < 800,
    isMobile: w < 800,
  });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(APP, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Down, slowly: each lazy section gets its own moment to mount.
  await walk(page, { steps: 60, delta: 200, pause: 220, label: "down, slow" });

  // Back to the top, then down fast.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
  await walk(page, { steps: 30, delta: 600, pause: 90, label: "down, fast" });

  // Up, fast — the reverse direction runs every scroll-linked animation
  // backwards, which is where a one-way effect shows itself.
  await walk(page, { steps: 30, delta: -600, pause: 90, label: "up, fast" });

  // Reload half way down. The browser restores the old offset against a
  // document that has not finished becoming the same height.
  await page.evaluate(() => window.scrollTo(0, Math.round(document.body.scrollHeight * 0.45)));
  await page.waitForTimeout(700);
  const beforeReload = await at(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const afterReload = await at(page);
  // Restoring to the top is a legitimate choice; landing somewhere else is not.
  if (afterReload === 0 || Math.abs(afterReload - beforeReload) < 120) {
    ok(`reload mid-page settled at ${afterReload} (was ${beforeReload})`);
  } else {
    bad(`reload mid-page: was ${beforeReload}, settled at ${afterReload}`);
  }

  /*
    Resize: every layout re-runs at once.

    Some movement here is correct, not a bug. The landing's two pinned
    sections are sized in `svh`, so a genuinely smaller viewport makes them
    genuinely shorter and everything below moves up — every viewport-relative
    layout on the web behaves this way, and a reader who rotates their phone
    expects a reflow. What would be a bug is movement out of proportion to the
    change, so the budget is measured against it: the two sections total 450svh,
    so a `d`-pixel change in the small viewport can legitimately move content by
    4.5 × d.

    Note this does *not* fire when a mobile browser's address bar retracts —
    `svh` is defined as the viewport with the bar showing and does not move.
    That is exactly why these sections are in `svh` rather than `vh` or `dvh`.
  */
  const shrinkBy = 120;
  await page.evaluate(() => window.scrollTo(0, Math.round(document.body.scrollHeight * 0.5)));
  await page.waitForTimeout(600);
  const beforeResize = await at(page);
  await page.setViewportSize({ width: w, height: h - shrinkBy });
  await page.waitForTimeout(1200);
  const afterResize = await at(page);
  const moved = Math.abs(afterResize - beforeResize);
  const budget = Math.round(shrinkBy * 4.5);
  if (moved <= budget) {
    ok(`resize reflowed within budget (${moved}px, allowed ${budget}px)`);
  } else {
    bad(`resize moved the page ${moved}px, more than the ${budget}px the layout can account for`);
  }

  /* Google Fonts is unreachable from this container, and the page is built to
     survive that — `display=swap` plus a real fallback stack. A font host
     timing out is not a product defect, so it does not fail the run. */
  const real = errors.filter((e) => !/fonts\.(googleapis|gstatic)\.com/.test(e) && !/ERR_CONNECTION_RESET/.test(e));
  if (real.length) bad(`${real.length} console error(s): ${real.slice(0, 2).join(" | ")}`);
  else ok("no console errors");

  await browser.close();
}

console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exitCode = problems.length ? 1 : 0;
