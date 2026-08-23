/**
 * Blink — every surface, at every width it has to survive.
 *
 * Two failures this exists to catch, both of which only a rendered page can
 * report:
 *
 *  - **Horizontal overflow.** One element wider than its container turns the
 *    whole document into a sideways scroll, and on a phone that is the
 *    difference between an app and a broken page. Checked on the document and
 *    then narrowed to the specific element responsible, because "the page
 *    overflows by 40px" is not an actionable report.
 *  - **Targets too small to hit.** WCAG 2.2 asks for 24×24 as the floor
 *    (SC 2.5.8) and 44×44 where the input is a finger (SC 2.5.5), so the
 *    threshold here follows the viewport: phone widths are held to 44, wider
 *    ones to 24. Reported per element with its text, so the fix is obvious.
 *
 * 320 is in the list on purpose: it is the narrowest viewport still in real
 * use, and it is where a layout that merely *looks* responsive comes apart.
 *
 *   APP_URL=http://127.0.0.1:4173 node qa/responsive.mjs
 */
import { openApp } from "./drive.mjs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const WIDTHS = ["320", "375", "390", "430", "768", "desktop"];
const ROUTES = [
  ["landing", "/", false],
  ["home", "/app", true],
  ["library", "/library", true],
  ["ranks", "/ranks", true],
  ["profile", "/profile", true],
  ["settings", "/settings", true],
];

const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

/** The widest element that sticks out, not just the fact that one does. */
const overflow = (page) =>
  page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    const spill = document.documentElement.scrollWidth - limit;
    if (spill <= 1) return { spill: 0, culprit: null };
    let worst = null;
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const out = Math.round(Math.max(r.right - limit, -r.left));
      if (out > 1 && (!worst || out > worst.out)) {
        worst = { out, tag: el.tagName.toLowerCase(), cls: el.className?.toString?.().slice(0, 90) ?? "" };
      }
    }
    return { spill, culprit: worst };
  });

/** Anything tappable that is smaller than a thumb. */
const smallTargets = (page, floor) =>
  page.evaluate((floor) =>
    [...document.querySelectorAll("button, a, [role='tab'], [role='button'], input, select")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.pointerEvents === "none") return false;
        return r.height < floor - 0.5 || r.width < floor - 0.5;
      })
      .slice(0, 6)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)} "${(el.innerText ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 24)}"`;
      }),
    floor,
  );

for (const width of WIDTHS) {
  console.log(`\n=== ${width} ===`);
  const { browser, page } = await openApp({ width });

  for (const [name, path] of ROUTES) {
    await page.goto(APP + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    // Walk the whole page: an element can only overflow once it is laid out,
    // and lazy sections are not laid out until they have been near the fold.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 20));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);

    const { spill, culprit } = await overflow(page);
    if (spill > 1) {
      bad(`${name}: overflows by ${spill}px — ${culprit?.tag} .${culprit?.cls}`);
    } else {
      ok(`${name}: no horizontal overflow`);
    }

    // A finger below 431px, a cursor above it.
    const floor = Number(width) && Number(width) <= 430 ? 44 : 24;
    const small = await smallTargets(page, floor);
    if (small.length) bad(`${name}: ${small.length} target(s) under ${floor}px — ${small.join("; ")}`);
    else ok(`${name}: every target clears ${floor}px`);
  }

  await browser.close();
}

console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exitCode = problems.length ? 1 : 0;
