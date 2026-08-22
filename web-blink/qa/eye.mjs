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

/**
 * What the eye currently is, measured off the rendered page.
 *
 * The *eye* is the lid path, not the <svg>. The drawing box is deliberately
 * wider than the viewport — the atmosphere lives in that margin and is clipped
 * by the stage — so measuring the element's box would report an overflow that
 * is the design, and would say nothing about where the eye actually sits.
 */
const geometry = (page) =>
  page.evaluate(() => {
    const lid = document.querySelector('[data-eye="lid"]');
    if (!lid) return null;
    const eye = lid.getBoundingClientRect();
    const stage = lid.closest("section");
    /* The pinned container. Its box does not change shape as the eye opens,
       which the lid's does — measuring pinning against the lid reported the
       apex rising as the stage sliding. */
    const pinned = lid.closest(".sticky")?.getBoundingClientRect();
    const box = stage.getBoundingClientRect();
    const d = lid.getAttribute("d") ?? "";

    /* Endpoints of each segment, in order: left canthus, upper apex, right
       canthus, lower apex. The apexes are on-path points, so the aperture's
       height is read rather than inferred. */
    const ends = d
      .split(/(?=[MC])/)
      .map((seg) => seg.trim().split(/[\s,]+/).slice(1).map(Number))
      .filter((nums) => nums.length >= 2)
      .map((nums) => nums.slice(-2));

    const opacityOf = (sel) => {
      const el = document.querySelector(sel);
      return el ? Number(getComputedStyle(el).opacity) : null;
    };

    return {
      eye: {
        left: Math.round(eye.left),
        right: Math.round(eye.right),
        top: Math.round(eye.top),
        bottom: Math.round(eye.bottom),
        w: Math.round(eye.width),
        h: Math.round(eye.height),
      },
      pinnedTop: pinned ? Math.round(pinned.top) : null,
      sectionTop: Math.round(box.top + window.scrollY),
      sectionH: Math.round(box.height),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      docW: document.documentElement.scrollWidth,
      docH: document.documentElement.scrollHeight,
      /* Aperture height: lower apex minus upper apex. Zero means shut. */
      aperture: ends.length >= 4 ? Math.round((ends[3][1] - ends[1][1]) * 100) / 100 : null,
      filaments: opacityOf('[data-eye="filaments"]'),
      motes: opacityOf('[data-eye="motes"]'),
      d,
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

    const centred = Math.abs((g.eye.left + g.eye.right) / 2 - g.viewport.w / 2);
    check(centred <= 2, `${Math.round(t * 100)}%: horizontally centred (${centred}px off)`);
    check(
      g.eye.left >= -1 && g.eye.right <= g.viewport.w + 1,
      `${Math.round(t * 100)}%: the eye is inside the viewport (${g.eye.left}…${g.eye.right}, ${Math.round((g.eye.w / g.viewport.w) * 100)}% wide)`,
      `${Math.round(t * 100)}%: the eye extends past the viewport (${g.eye.left}…${g.eye.right})`,
    );
    check(
      g.eye.top >= -1 && g.eye.bottom <= g.viewport.h + 1,
      `${Math.round(t * 100)}%: not clipped vertically (${g.eye.top}…${g.eye.bottom})`,
      `${Math.round(t * 100)}%: clipped vertically (${g.eye.top}…${g.eye.bottom})`,
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
  const early = (await geometry(page)).pinnedTop;
  await page.evaluate(
    ({ top, h, vh }) => window.scrollTo(0, top + (h - vh) * 0.7),
    { top: base.sectionTop, h: base.sectionH, vh: base.viewport.h },
  );
  await page.waitForTimeout(700);
  const late = (await geometry(page)).pinnedTop;
  check(
    Math.abs(early - late) <= 4,
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
  /* Closed means closed: at rest the two lids coincide, so the aperture has
     no height at all. */
  const shut = (await geometry(page)).aperture;
  check(
    shut !== null && Math.abs(shut) < 0.5,
    `scrolled back to the top, the eye is shut again (aperture ${shut})`,
    `the eye did not close on the way back up (aperture ${shut})`,
  );

  await browser.close();
}

// ---------------------------------------------------------------------------
// Does it hold a frame budget while it plays?
// ---------------------------------------------------------------------------

section("frame cost while scrolling through it");
{
  /*
    The material is a hundred-odd gradient-filled forms whose groups are
    transformed every frame. That is precisely the kind of thing that looks
    finished in a screenshot and stutters on a real device, so it gets
    measured rather than assumed.

    The page is driven through the whole pinned travel while requestAnimationFrame
    deltas are recorded. What matters is not the average — it is how many frames
    blow the budget, because that is what a reader feels as jank.
  */
  const { browser, page } = await openApp({ width: "390", signedIn: false });
  await page.goto(`${process.env.APP_URL ?? "http://localhost:8080"}/`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2200);
  const base = await geometry(page);

  const frames = await page.evaluate(
    ({ top, travel }) =>
      new Promise((resolve) => {
        const deltas = [];
        const started = performance.now();
        const DURATION = 2600;
        let last = started;
        const tick = (now) => {
          deltas.push(now - last);
          last = now;
          const t = Math.min(1, (now - started) / DURATION);
          window.scrollTo(0, Math.round(top + travel * t));
          if (t < 1) requestAnimationFrame(tick);
          else resolve(deltas.slice(2));
        };
        requestAnimationFrame(tick);
      }),
    { top: base.sectionTop, travel: base.sectionH - base.viewport.h },
  );

  const sorted = [...frames].sort((a, b) => a - b);
  const median = Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10;
  const worst = Math.round(Math.max(...frames) * 10) / 10;
  /* A 60Hz frame is 16.7ms. Two budgets is a dropped frame; anything past
     that is visible. A handful across a couple of seconds is normal for a
     headless browser sharing a CPU. */
  const dropped = frames.filter((d) => d > 34).length;

  check(
    median < 20,
    `median frame ${median}ms across ${frames.length} frames`,
    `median frame ${median}ms — the animation is not holding 60fps`,
  );
  check(
    dropped <= Math.max(3, frames.length * 0.04),
    `${dropped} long frame(s), worst ${worst}ms`,
    `${dropped} frames over 34ms (worst ${worst}ms) — this will read as jank`,
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

  const atTop = await geometry(page);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(1100);
  const scrolled = await geometry(page);
  await shot(page, "eye-reduced-motion");

  check(
    atTop.aperture > 100,
    `the eye is open without scrolling (aperture ${atTop.aperture})`,
    `reduced motion leaves the eye shut (aperture ${atTop.aperture})`,
  );
  check(
    atTop.d === scrolled.d,
    "and it does not move with the scroll",
    `reduced motion is still scroll-linked: ${atTop.aperture} → ${scrolled.aperture}`,
  );

  await browser.close();
}

ok("screenshots written — inspect qa/shots/eye-*.png");
process.exit(report() ? 1 : 0);
