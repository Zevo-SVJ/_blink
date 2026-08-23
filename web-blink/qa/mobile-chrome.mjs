/**
 * Blink — is anything hidden behind the phone's browser or its notch?
 *
 * ## What a desktop browser hides
 *
 *  - **The safe area.** The home indicator and the Dynamic Island are not part
 *    of the page, and `env(safe-area-inset-*)` reports **zero** in every
 *    desktop browser — so a bar that ignores them looks perfect in review and
 *    buries its own controls under the island on the device.
 *
 *    That zero cuts both ways, and it is why the two insets are checked
 *    differently. At the bottom the app declares `max(env(...), 0.75rem)`, so
 *    there is a real floor to measure and the check is geometric: anything
 *    interactive parked in the bottom 34pt by `position: fixed` or `sticky`
 *    is reported. At the top there is no floor — correct behaviour and broken
 *    behaviour render identically here — so the check is over the source:
 *    every fixed top bar has to declare the inset. Measuring a value the
 *    browser has hardcoded to zero would report a bar that ignores the notch
 *    entirely as passing.
 *
 *  - **The address bar.** It cannot be reproduced at all: a headless browser
 *    has none, so `svh`, `lvh`, `dvh` and `innerHeight` are the same number and
 *    resizing moves all of them together — the very difference that matters is
 *    the one this browser cannot express. So that half is a source check, which
 *    is the honest tool for it: `svh` is defined against the viewport with the
 *    browser chrome *shown* and is therefore invariant while it retracts, and
 *    the scroll-linked sections have to be written in it.
 *
 *  - **The keyboard.** Emulated by the viewport it actually leaves — roughly
 *    half the screen — with the focused field and its submit button both
 *    required to still be reachable.
 *
 *   APP_URL=http://127.0.0.1:4173 node qa/mobile-chrome.mjs
 */
import { openApp } from "./drive.mjs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";

/* iPhone 15 Pro: 34pt of home indicator below the page. */
const SAFE_BOTTOM = 34;
const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

/** Interactive chrome parked inside the bottom inset. */
const buried = (page) =>
  page.evaluate(
    ({ bottom }) =>
      [...document.querySelectorAll("button, a, [role='tab'], input, select")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return false;
          const style = getComputedStyle(el);
          if (style.visibility === "hidden" || style.pointerEvents === "none") return false;
          if (r.bottom < 0 || r.top > window.innerHeight) return false;
          /*
            The bottom inset only matters for chrome that stays put. Ordinary
            content passes under the home indicator as you scroll and that is
            correct — flagging it reported every list row that happened to be
            at the bottom of the viewport. A fixed or sticky control, on the
            other hand, is *parked* there.
          */
          const mid = r.top + r.height / 2;
          if (mid <= window.innerHeight - bottom) return false;
          for (let node = el; node; node = node.parentElement) {
            const position = getComputedStyle(node).position;
            if (position === "fixed" || position === "sticky") return true;
          }
          return false;
        })
        .slice(0, 5)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const name = (el.innerText ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 22);
          return `${el.tagName.toLowerCase()} "${name}" at y=${Math.round(r.top)}..${Math.round(r.bottom)}`;
        }),
    { bottom: SAFE_BOTTOM },
  );

const ROUTES = [
  ["landing", "/", false],
  ["home", "/app", true],
  ["library", "/library", true],
  ["ranks", "/ranks", true],
  ["profile", "/profile", true],
  ["settings", "/settings", true],
  ["analyze", "/analyze", true],
];

for (const signedIn of [false, true]) {
  const { browser, page } = await openApp({ width: "390", signedIn });

  for (const [name, path, needsAuth] of ROUTES) {
    if (needsAuth !== signedIn) continue;
    await page.goto(APP + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);

    const covered = await buried(page);
    if (covered.length) {
      bad(`${name}: ${covered.length} control(s) parked under the home indicator — ${covered.join("; ")}`);
    } else {
      ok(`${name}: nothing parked under the home indicator`);
    }
  }

  await browser.close();
}

/* ── the notch ──────────────────────────────────────────────────────── */

console.log("\n=== the top inset is reserved ===");
{
  const { readFileSync } = await import("node:fs");
  /* Every bar fixed to the top of the viewport, and the thing that sticks
     beneath them. */
  const files = [
    "../src/components/nav/chrome.tsx",
    "../src/components/analysis/AnalysisResult.tsx",
    "../src/components/app/AppShell.tsx",
    "../src/pages/Product.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const name = file.split("/").pop();
    if (source.includes("safe-area-inset-top")) ok(`${name}: reserves the top inset`);
    else bad(`${name}: fixed or sticky top chrome with no safe-area-inset-top`);
  }
}

/* ── the units the layout is pinned in ──────────────────────────────── */

/*
  This is a source check, deliberately, and it is the only honest way to ask
  the question here.

  A headless browser has no address bar, so `svh`, `lvh`, `dvh` and
  `innerHeight` are all the same number and resizing the viewport changes all
  of them together — the very difference that matters on a phone is the one
  this browser cannot express. What *can* be checked is that the layout is
  written in the unit that does not move: `svh` is defined against the viewport
  with the browser chrome shown, so it is invariant while that chrome retracts.
  `dvh` and `vh` are not.
*/
console.log("\n=== the units the pinned layout is written in ===");
{
  const { readFileSync } = await import("node:fs");
  const files = [
    "../src/components/blink/EyeReveal.tsx",
    "../src/components/blink/experience/BlinkExperience.tsx",
    "../src/components/blink/Hero.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const wrong = [...source.matchAll(/h-\[[0-9.]+(dvh|lvh)\]|height:\s*"[0-9.]+(dvh|lvh)"/g)];
    const name = file.split("/").pop();
    if (wrong.length) {
      bad(`${name}: ${wrong.length} scroll-linked height(s) in a unit that moves with the address bar`);
    } else {
      ok(`${name}: scroll-linked heights are in svh`);
    }
  }
}

/* ── the keyboard ───────────────────────────────────────────────────── */

console.log("\n=== with the keyboard up ===");
{
  const { browser, page } = await openApp({ width: "390", signedIn: false });
  await page.goto(APP + "/analyze", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2600);

  const hasEmail = await page.locator('input[type="email"]').count();
  if (!hasEmail) {
    bad("no email field on /analyze for a signed-out visitor — the sign-up gate did not open");
  } else {
    await page.locator('input[type="email"]').fill("someone@example.com");
    /* iOS leaves roughly half the screen when the keyboard is up. */
    await page.setViewportSize({ width: 390, height: 430 });
    await page.waitForTimeout(700);

    const reachable = await page.evaluate(() => {
      const field = document.querySelector('input[type="email"]');
      const submit = [...document.querySelectorAll("button")].find((b) =>
        /create account|créer|sign in|se connecter/i.test(b.innerText),
      );
      const fits = (el) => {
        if (!el) return "missing";
        const r = el.getBoundingClientRect();
        return r.top >= -1 && r.bottom <= window.innerHeight + 1 ? "ok" : "off-screen";
      };
      return { field: fits(field), submit: fits(submit) };
    });

    if (reachable.field === "ok") ok("the focused field is on screen with the keyboard up");
    else bad(`the focused field is ${reachable.field} with the keyboard up`);

    if (reachable.submit === "ok") ok("the submit button is reachable with the keyboard up");
    else bad(`the submit button is ${reachable.submit} with the keyboard up`);
  }

  await browser.close();
}

console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exitCode = problems.length ? 1 : 0;
