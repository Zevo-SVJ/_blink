/**
 * Blink — is there exactly one way Home, and is it the nav?
 *
 * Library, Ranks and Profile each carried a second "Home" control inside the
 * page body, duplicating the tab that is already on screen. This checks that
 * the duplicates are gone, that the real navigation still works, and — the
 * part a DOM query cannot answer — that removing them did not leave a hole
 * where they used to be. The bottom-of-page screenshots are the evidence for
 * that.
 *
 *   node qa/home-buttons.mjs
 */

import { check, go, ok, openApp, report, section, shot, shotFull } from "./drive.mjs";

const PAGES = ["/library", "/ranks", "/profile"];
const LABELS = { en: "Home", fr: "Accueil" };

for (const lang of ["en", "fr"]) {
  const label = LABELS[lang];

  for (const width of ["390", "desktop"]) {
    const { browser, page } = await openApp({ width, lang });

    for (const route of PAGES) {
      section(`${route} · ${lang} · ${width}`);
      await go(page, route, { settle: 2500 });

      /*
        Count every control that navigates Home, and say which of them is the
        navigation. The nav lives inside a <nav>; anything else claiming to go
        Home is the duplicate this is looking for.
      */
      const found = await page.evaluate((label) => {
        const isHome = (el) => {
          const text = (el.innerText ?? "").trim();
          const aria = el.getAttribute("aria-label") ?? "";
          const href = el.getAttribute("href") ?? "";
          return (
            text === label ||
            aria === label ||
            ((href === "/app" || href === "/") && text.length < 24 && /home|accueil/i.test(text + aria))
          );
        };

        return [...document.querySelectorAll("a, button")]
          .filter(isHome)
          .map((el) => ({
            text: (el.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 30),
            href: el.getAttribute("href"),
            inNav: !!el.closest("nav"),
            visible: el.getBoundingClientRect().width > 0,
          }));
      }, label);

      const inBody = found.filter((f) => !f.inNav);
      const inNav = found.filter((f) => f.inNav);

      check(inNav.length >= 1, `the navigation still offers ${label}`);
      check(
        inBody.length === 0,
        "no duplicate Home control in the page body",
        `duplicate Home control(s) in the body: ${JSON.stringify(inBody)}`,
      );

      await shot(page, `home-${lang}-${width}-${route.slice(1)}-top`);

      // Scrolled to the end: a removed button leaves a gap that only shows at
      // the bottom of the page.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(700);
      await shot(page, `home-${lang}-${width}-${route.slice(1)}-bottom`);

      /*
        Dead space below the last real content.

        Measured as the distance between the lowest painted element that isn't
        the fixed nav and the bottom of the document. A removed control that
        left its wrapper behind shows up here as a large number.
      */
      const gap = await page.evaluate(() => {
        const doc = document.documentElement.scrollHeight;
        let lowest = 0;
        for (const el of document.querySelectorAll("main *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          lowest = Math.max(lowest, r.bottom + window.scrollY);
        }
        // Clamped: transforms on animating rows can put a box below the
        // measured document height, and a negative "gap" is meaningless here.
        return Math.max(0, Math.round(doc - lowest));
      });
      // Breathing room above the fixed nav is intentional; a whole missing
      // button is not.
      check(
        gap < 220,
        `no orphaned space at the end of the page (${gap}px)`,
        `${gap}px of empty space below the last content — looks like a removed control left its wrapper`,
      );
    }

    await browser.close();
  }
}

section("navigation still goes Home");
{
  const { browser, page } = await openApp({ width: "390", lang: "en" });
  await go(page, "/ranks", { settle: 2500 });
  // The tabs are buttons that navigate, not anchors — so ask for the role
  // they actually have rather than the one a nav usually has.
  await page.locator("nav").getByRole("button", { name: "Home" }).first().click();
  await page.waitForTimeout(1500);
  const url = page.url();
  check(/\/app$|\/$/.test(new URL(url).pathname), `the Home tab navigates (${new URL(url).pathname})`);
  await shot(page, "home-nav-destination");
  await browser.close();
}

ok("screenshots written — inspect qa/shots/home-*.png");
process.exit(report() ? 1 : 0);
