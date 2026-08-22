/**
 * Blink — the scroll-driven eye, looked at rather than reasoned about.
 *
 * Scrubs the page across the eye's pinned travel and screenshots the timeline,
 * because every question worth asking here is visual: is it centred, is it the
 * right size, does every intermediate state look deliberate, does the document
 * stay still while it plays.
 *
 *   node qa/eye.mjs                 # the default width
 *   WIDTHS=320,768,1920 node qa/eye.mjs
 */

import { check, ok, openApp, report, section, shot } from "./drive.mjs";

const WIDTHS = (process.env.WIDTHS ?? "390").split(",");
/* Where in the pinned travel to look. 0 = shut, 1 = wide. */
const STOPS = [0, 0.2, 0.4, 0.6, 0.8, 1];

/** The section is the only 260svh block on the page. */
const geometry = (page) =>
  page.evaluate(() => {
    const svg = document.querySelector("main section[aria-hidden] svg");
    if (!svg) return null;
    const s = svg.getBoundingClientRect();
    const stage = svg.closest("section");
    const box = stage.getBoundingClientRect();
    return {
      svg: {
        left: Math.round(s.left),
        right: Math.round(s.right),
        top: Math.round(s.top),
        bottom: Math.round(s.bottom),
        w: Math.round(s.width),
        h: Math.round(s.height),
      },
      sectionTop: Math.round(box.top + window.scrollY),
      sectionH: Math.round(box.height),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      docW: document.documentElement.scrollWidth,
      docH: document.documentElement.scrollHeight,
      // The lid path, so intermediate geometry can be checked numerically too.
      d: document.querySelector("main section[aria-hidden] svg path")?.getAttribute("d") ?? null,
    };
  });

for (const width of WIDTHS) {
  section(`the eye · ${width}px`);
  const { browser, page } = await openApp({ width, signedIn: false });
  await page.goto(`${process.env.APP_URL ?? "http://localhost:8080"}/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2200);

  const base = await geometry(page);
  if (!base) {
    check(false, "", `${width}: the eye section never rendered`);
    await browser.close();
    continue;
  }

  check(
    base.docW <= base.viewport.w,
    `no horizontal overflow (doc ${base.docW} ≤ viewport ${base.viewport.w})`,
    `horizontal overflow: document is ${base.docW}px in a ${base.viewport.w}px viewport`,
  );

  const heights = [];

  for (const t of STOPS) {
    /* The pinned travel: the section is one viewport taller than the stage, so
       progress t sits at sectionTop + t * (sectionH - viewportH). */
    const y = Math.round(base.sectionTop + t * (base.sectionH - base.viewport.h));
    await page.evaluate((to) => window.scrollTo(0, to), y);
    // Let the spring settle so the screenshot is of a state, not a transit.
    await page.waitForTimeout(900);

    const g = await geometry(page);
    heights.push(g.docH);
    await shot(page, `eye-${width}-${String(Math.round(t * 100)).padStart(3, "0")}`);

    const centred = Math.abs(
      (g.svg.left + g.svg.right) / 2 - g.viewport.w / 2,
    );
    check(centred <= 2, `${Math.round(t * 100)}%: horizontally centred (${centred}px off)`);
    check(
      g.svg.left >= -1 && g.svg.right <= g.viewport.w + 1,
      `${Math.round(t * 100)}%: within the viewport (${g.svg.left}…${g.svg.right})`,
      `${Math.round(t * 100)}%: the eye extends past the viewport (${g.svg.left}…${g.svg.right})`,
    );
    check(
      g.svg.top >= -1 && g.svg.bottom <= g.viewport.h + 1,
      `${Math.round(t * 100)}%: not clipped vertically (${g.svg.top}…${g.svg.bottom})`,
      `${Math.round(t * 100)}%: clipped vertically (${g.svg.top}…${g.svg.bottom})`,
    );
  }

  const stable = heights.every((h) => h === heights[0]);
  check(
    stable,
    `the document height never moves while the eye plays (${heights[0]}px)`,
    `the document height changed during the animation: ${heights.join(" → ")}`,
  );

  /* Pinned means the eye holds its place on screen. If it simply scrolled past,
     its top would march up the viewport instead of staying put. */
  await page.evaluate((to) => window.scrollTo(0, to), base.sectionTop + 40);
  await page.waitForTimeout(500);
  const early = (await geometry(page)).svg.top;
  await page.evaluate(
    ({ top, h, vh }) => window.scrollTo(0, top + (h - vh) * 0.7),
    { top: base.sectionTop, h: base.sectionH, vh: base.viewport.h },
  );
  await page.waitForTimeout(700);
  const late = (await geometry(page)).svg.top;
  check(
    Math.abs(early - late) <= 24,
    `the stage stays pinned while it plays (top ${early} → ${late})`,
    `the stage is not pinned — it scrolled from ${early} to ${late}. Sticky is being defeated, most likely by an ancestor with overflow set.`,
  );

  await browser.close();
}

// ---------------------------------------------------------------------------
// Scrolling back up must run the whole thing backwards
// ---------------------------------------------------------------------------

section("reversibility");
{
  const { browser, page } = await openApp({ width: "390", signedIn: false });
  await page.goto(`${process.env.APP_URL ?? "http://localhost:8080"}/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2200);

  const base = await geometry(page);
  const at = async (t) => {
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      Math.round(base.sectionTop + t * (base.sectionH - base.viewport.h)),
    );
    await page.waitForTimeout(900);
    return (await geometry(page)).d;
  };

  /* The lid path is the whole state of the animation, so comparing it is
     comparing the frame — going down to a position and coming back up to it
     must produce the same geometry, not merely a similar-looking one. */
  const downHalf = await at(0.5);
  await at(1);
  await shot(page, "eye-reverse-1-open");
  const upHalf = await at(0.5);
  await shot(page, "eye-reverse-2-back-to-half");
  const upStart = await at(0);
  await shot(page, "eye-reverse-3-closed-again");

  check(
    upHalf === downHalf,
    "scrolling back up returns the eye to the same half-open geometry",
    `half-open differs by direction:\n      down: ${downHalf}\n      up:   ${upHalf}`,
  );
  check(
    upStart === (await at(0)),
    "the closed state is stable once returned to",
  );
  /* Closed means closed: at rest the two curves coincide, so both control
     rows sit at the same height. */
  const rows = [...(upStart ?? "").matchAll(/C [\d.]+ ([\d.]+),/g)].map((m) => Number(m[1]));
  check(
    rows.length === 2 && Math.abs(rows[0] - rows[1]) < 0.5,
    `scrolled back to the top, the eye is shut again (lids at ${rows.join(" / ")})`,
    `the eye did not close on the way back up (lids at ${rows.join(" / ")})`,
  );

  await browser.close();
}

// ---------------------------------------------------------------------------
// Reduced motion
// ---------------------------------------------------------------------------

section("prefers-reduced-motion");
{
  /*
    Someone who has asked for less motion must still get the eye — open, and
    holding still. Leaving it scroll-linked would be motion they opted out of;
    leaving it shut would make the closed state permanent, which is worse than
    the animation, because the eye would simply look broken.
  */
  const { browser, page } = await openApp({
    width: "390",
    signedIn: false,
    reducedMotion: "reduce",
  });
  await page.goto(`${process.env.APP_URL ?? "http://localhost:8080"}/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2400);

  const lidRows = async () => {
    const d = (await geometry(page))?.d ?? "";
    return [...d.matchAll(/C [\d.]+ ([\d.-]+),/g)].map((m) => Number(m[1]));
  };

  const atTop = await lidRows();
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(1100);
  const scrolled = await lidRows();
  await shot(page, "eye-reduced-motion");

  check(
    Math.abs(atTop[0] - atTop[1]) > 100,
    `the eye is open without scrolling (lids at ${atTop.join(" / ")})`,
    `reduced motion leaves the eye shut (lids at ${atTop.join(" / ")})`,
  );
  check(
    atTop.join() === scrolled.join(),
    "and it does not move with the scroll",
    `reduced motion is still scroll-linked: ${atTop.join("/")} → ${scrolled.join("/")}`,
  );

  await browser.close();
}

ok("screenshots written — inspect qa/shots/eye-*.png");
process.exit(report() ? 1 : 0);
