/**
 * Blink — the compliance assertions, without the screenshots.
 *
 * Same checks as `legal-sweep.mjs`, minus the images. Screenshot capture on
 * these pages costs seconds each (see the note in that file), which is fine
 * when someone wants pictures and wasteful when the question is simply "is it
 * still correct". Run this in a loop or in CI; run the sweep when you want to
 * look at what it produced.
 *
 *   BASE=http://127.0.0.1:4173 node qa/legal-assert.mjs
 */

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
const problems = [];
const bad = (s) => { problems.push(s); console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

/**
 * Claims that must not reappear, in any language, on any page.
 *
 * Each one was on the site and was not true of the implementation. They live
 * here so that re-introducing one fails a check rather than shipping.
 */
const BANNED = [
  "never stored",
  "never stored or shared",
  "analyzed and deleted",
  "support@blink.app",
  "privacy@blink.app",
  "hello@blink.app",
  "what people said after running their own profile",
  "your data is private and secure",
];

const ROUTES = [
  "/",
  "/privacy",
  "/terms",
  "/cookies",
  "/legal",
  "/mentions-legales",
  "/contact",
  "/analyze",
];

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

for (const lang of ["en", "fr"]) {
  for (const [device, viewport] of [
    ["mobile", { width: 390, height: 844 }],
    ["desktop", { width: 1280, height: 900 }],
  ]) {
    const ctx = await browser.newContext({ viewport });
    // Detection reads `navigator.languages` first, so that is what the test
    // has to control — a context `locale` alone does not always set it.
    await ctx.addInitScript((l) => {
      Object.defineProperty(navigator, "languages", {
        get: () => (l === "fr" ? ["fr-FR", "fr"] : ["en-US", "en"]),
      });
      Object.defineProperty(navigator, "language", {
        get: () => (l === "fr" ? "fr-FR" : "en-US"),
      });
    }, lang);

    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      const text = m.text();
      // A blocked Google Fonts request is the network this runs on, not a
      // defect in Blink — the stylesheet is deliberately non-blocking.
      if (/ERR_CONNECTION|fonts\.g(oogle|static)apis/.test(text)) return;
      // Hydration warnings count double: a mismatch is the exact failure the
      // language design exists to prevent.
      if (m.type() === "error" || /hydrat/i.test(text)) errors.push(text);
    });

    console.log(`\n=== ${lang} / ${device} ===`);

    for (const route of ROUTES) {
      // Never `load` or `networkidle`: index.html requests a Google Fonts
      // stylesheet, and where that host is unreachable both wait out the full
      // timeout on every navigation.
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);

      const info = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        text: document.body.innerText,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        h1Count: document.querySelectorAll("h1").length,
      }));

      if (info.lang !== lang) bad(`${route}: <html lang>="${info.lang}", expected "${lang}"`);
      if (info.text.trim().length < 200) bad(`${route}: almost no text rendered`);
      if (info.scrollW > info.clientW + 1) {
        bad(`${route}: horizontal overflow (${info.scrollW} > ${info.clientW})`);
      }
      if (info.h1Count !== 1) bad(`${route}: ${info.h1Count} <h1> (expected exactly 1)`);

      const lower = info.text.toLowerCase();
      for (const claim of BANNED) {
        if (lower.includes(claim)) bad(`${route}: still says "${claim}"`);
      }

      // The language actually rendered, not merely the attribute.
      if (route === "/") {
        const french = /Vois-toi comme/.test(info.text);
        const english = /See yourself the way/.test(info.text);
        if (lang === "fr" && !french) bad("/: French browser did not get the French hero");
        if (lang === "fr" && english) bad("/: English hero present on the French page");
        if (lang === "en" && !english) bad("/: English browser did not get the English hero");
      }
    }
    ok(`${ROUTES.length} routes render in ${lang}`);

    // Every legal page has to be reachable from the footer, and tappable.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("footer a[href^='/']")).map((a) => ({
        href: a.getAttribute("href"),
        text: a.textContent?.trim() ?? "",
        h: a.getBoundingClientRect().height,
      })),
    );
    if (links.length < 5) bad(`footer exposes ${links.length} legal links, expected 5`);
    for (const link of links) {
      if (device === "mobile" && link.h < 44) {
        bad(`footer link "${link.text}" is ${Math.round(link.h)}px tall (min 44)`);
      }
      const res = await page.request.get(`${BASE}${link.href}`);
      if (!res.ok()) bad(`footer link ${link.href} → HTTP ${res.status()}`);
    }
    ok(`${links.length} footer legal links resolve`);

    await page
      .getByRole("button", { name: /Passer en français|Switch to English/ })
      .first()
      .click();
    await page.waitForTimeout(400);
    const switched = await page.evaluate(() => document.documentElement.lang);
    if (switched === lang) bad("language toggle did not switch");
    else ok(`toggle switched ${lang} → ${switched}`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const persisted = await page.evaluate(() => document.documentElement.lang);
    if (persisted !== switched) bad(`choice lost on reload (${persisted}, expected ${switched})`);
    else ok("choice persisted across reload");

    if (errors.length) bad(`console/page errors: ${errors.slice(0, 3).join(" | ")}`);
    else ok("no console or page errors");

    await ctx.close();
  }
}

await browser.close();
console.log(
  problems.length
    ? `\nPROBLEMS (${problems.length}):\n - ${problems.join("\n - ")}`
    : "\nPROBLEMS: none",
);
process.exit(problems.length ? 1 : 0);
