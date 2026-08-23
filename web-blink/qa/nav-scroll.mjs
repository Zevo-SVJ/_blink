/**
 * Blink — where a page opens, and where Back puts you.
 *
 * Two questions, both of which only a rendered page can answer:
 *
 *  §4 Opening a profile from a scrolled list must start at the top of the
 *     profile, not at the scroll offset of the list you came from.
 *  §3 Back must return to the exact context you left — the same list, the same
 *     tab, the same place in it — including profile A → profile B → Back.
 *
 * Every check is paired with a screenshot at the moment it is made, because
 * "scrollY is 0" and "the page looks right at the top" are not the same claim.
 *
 *   node qa/nav-scroll.mjs
 */

import { check, go, ok, openApp, report, section, shot, waitForText } from "./drive.mjs";

const WIDTHS = ["320", "375", "390", "430", "desktop"];

const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));
const path = (page) => new URL(page.url()).pathname;

/** Scroll far enough down that "where did it open" has a visible answer. */
async function scrollDown(page, to = 900) {
  await page.evaluate((y) => window.scrollTo(0, y), to);
  await page.waitForTimeout(500);
  return scrollY(page);
}

/**
 * Click without Playwright's auto-scroll.
 *
 * `locator.click()` scrolls its target into view first, which silently moves
 * the page before the navigation — so a harness that measured the offset,
 * clicked, and then compared against that measurement was testing a position
 * the reader was never at. This clicks whatever is already there.
 */
async function clickInPage(page, selector, { index = 0, contains = null } = {}) {
  return page.evaluate(
    ({ selector, index, contains }) => {
      const all = [...document.querySelectorAll(selector)].filter(
        (el) => !contains || (el.innerText ?? "").includes(contains),
      );
      const el = all[index];
      if (!el) return null;
      el.click();
      return Math.round(window.scrollY);
    },
    { selector, index, contains },
  );
}

// ---------------------------------------------------------------------------
// §4 — a profile opens at its top, at every width
// ---------------------------------------------------------------------------

for (const width of WIDTHS) {
  section(`§4 open an analysis from a scrolled Library · ${width}`);
  const { browser, page } = await openApp({ width });

  await go(page, "/library", { settle: 2500 });
  const from = await scrollDown(page, 600);
  await shot(page, `nav-${width}-1-library-scrolled`);

  /* Library rows are links now, not buttons — they navigate to a URL, so they
     have to be openable in a new tab and copyable. */
  const rows = page.locator("main a", { hasText: "@" });
  const count = await rows.count();
  if (count === 0) {
    check(false, "library has rows to open", "library rendered no analyses to open");
    await browser.close();
    continue;
  }

  await rows.nth(Math.min(count - 1, 3)).click();
  await waitForText(page, "Blink");
  await page.waitForTimeout(1600);

  const landed = await scrollY(page);
  await shot(page, `nav-${width}-2-analysis-opened`);

  check(
    landed <= 4,
    `the analysis opens at its top (scrollY ${landed}, came from ${from})`,
    `the analysis opened at ${landed}px — the reader has to scroll up to reach the beginning`,
  );

  // The top of the page must actually be the top of the content: a header
  // that is on screen but pushed under the fixed chrome is the same bug.
  const headerVisible = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    if (!h1) return null;
    const r = h1.getBoundingClientRect();
    return { top: Math.round(r.top), inView: r.top >= 0 && r.top < window.innerHeight };
  });
  check(
    headerVisible?.inView === true,
    `the page title is on screen (top ${headerVisible?.top}px)`,
    `the page title is off screen (top ${headerVisible?.top}px)`,
  );

  await browser.close();
}

// ---------------------------------------------------------------------------
// §3 — Back returns to the exact previous context
// ---------------------------------------------------------------------------

section("§3 Library → analysis → Back");
{
  const { browser, page } = await openApp({ width: "390" });
  await go(page, "/library", { settle: 2500 });
  const before = await scrollDown(page, 500);
  await shot(page, "nav-back-1-library-before");

  // Read the offset at the instant of the click, so the comparison is against
  // where the reader actually was.
  const left = await clickInPage(page, "main a, main button", { index: 4, contains: "@" });
  await page.waitForTimeout(1600);
  const detail = path(page);
  await shot(page, "nav-back-2-analysis");

  await page.goBack();
  await page.waitForTimeout(1800);
  const after = await scrollY(page);
  await shot(page, "nav-back-3-library-after");

  check(path(page) === "/library", `Back returns to Library (${path(page)})`);
  check(left !== null && left > 100, `left Library scrolled down (${left}px, set to ${before})`);
  check(
    Math.abs(after - left) <= 40,
    `Back restores the scroll position (${left} → ${after})`,
    `Back lost the scroll position: left at ${left}, returned at ${after}`,
  );
  ok(`detail route was ${detail}`);
  await browser.close();
}

section("§3 Ranks → analysis → Back keeps the category tab");
{
  const { browser, page } = await openApp({ width: "390" });
  await go(page, "/ranks", { settle: 2600 });

  // Put the board in a non-default state: a chosen category.
  await page.getByRole("button", { name: "Larp", exact: true }).first().click();
  await page.waitForTimeout(1000);
  await shot(page, "nav-ranks-1-larp");
  const boardBefore = await page.evaluate(() =>
    (document.body.innerText ?? "").replace(/\s+/g, " ").slice(0, 200),
  );

  await page.locator("a[href^='/library/']").first().click();
  await page.waitForTimeout(1600);
  await shot(page, "nav-ranks-2-analysis");
  check((await scrollY(page)) <= 4, "the analysis opened at its top");

  await page.goBack();
  await page.waitForTimeout(1800);
  await shot(page, "nav-ranks-3-back");
  check(path(page) === "/ranks", `Back returns to Ranks (${path(page)})`);

  /*
    The category is component state, not a URL, so a back navigation
    remounts the page and it resets to All. Reported rather than asserted
    silently: if this fails, the category has to move into the URL.
  */
  const boardAfter = await page.evaluate(() =>
    (document.body.innerText ?? "").replace(/\s+/g, " ").slice(0, 200),
  );
  check(
    boardAfter === boardBefore,
    "Back returns to the same board view, category and all",
    `Back reset the board view.\n      before: ${boardBefore.slice(0, 120)}\n      after:  ${boardAfter.slice(0, 120)}`,
  );
  await browser.close();
}

section("§3 profile A → profile B → Back");
{
  const { browser, page } = await openApp({ width: "390" });
  await go(page, "/ranks", { settle: 2600 });

  const links = page.locator("a[href^='/library/']");
  const total = await links.count();
  check(total >= 2, `two analysed profiles to move between (${total})`);

  await links.first().click();
  await page.waitForTimeout(1600);
  const a = path(page);
  const aText = await page.evaluate(() => document.querySelector("h1")?.innerText ?? "");
  await shot(page, "nav-ab-1-profile-a");

  // From A, reach B the way a reader would: back to the board, then the next
  // one — the "profile A → profile B" journey the goal describes.
  await page.goBack();
  await page.waitForTimeout(1600);
  await links.nth(1).click();
  await page.waitForTimeout(1600);
  const b = path(page);
  await shot(page, "nav-ab-2-profile-b");

  check(a !== b, `two different analyses (${a} → ${b})`);
  check((await scrollY(page)) <= 4, "profile B opened at its top");

  await page.goBack();
  await page.waitForTimeout(1800);
  await shot(page, "nav-ab-3-back-from-b");
  check(
    path(page) === "/ranks",
    `Back from B returns to the board it was opened from (${path(page)})`,
  );
  ok(`profile A header read "${aText}"`);
  await browser.close();
}

process.exit(report() ? 1 : 0);
