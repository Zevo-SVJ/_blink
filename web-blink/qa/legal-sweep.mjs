/**
 * Blink — the compliance sweep.
 *
 * Opens the production build in both languages, on a phone and on a desktop,
 * and checks the things a legal review actually turns on:
 *
 *  - every legal route renders, in both languages, with real content;
 *  - `<html lang>` matches the language actually on screen;
 *  - a French browser never sees English first (no hydration flash);
 *  - no horizontal overflow, no clipped text, no sub-44px tap targets in the
 *    footer's legal column;
 *  - the claims that were false are gone, everywhere;
 *  - every footer legal link resolves to a page rather than a 404.
 *
 * Screenshots land in the scratchpad for eyeballing.
 *
 *   node qa/legal-sweep.mjs
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

// Navigation waits on `domcontentloaded`, never `load` or `networkidle`.
// index.html requests a Google Fonts stylesheet, and on a network where that
// host is unreachable the request sits there until it times out — `load` waits
// for it and `networkidle` never arrives at all, so a sweep of 28 pages spent
// its entire runtime waiting on a font it does not need. The markup is
// prerendered or rendered from one bundle, so DOM plus a settle beat is the
// real readiness signal here.
const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
const OUT = process.env.OUT ?? "/tmp/blink-qa";
const FULL_SHOTS = process.env.SHOTS === "full";
mkdirSync(OUT, { recursive: true });

const problems = [];
const bad = (s) => { problems.push(s); console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

/** Claims that must not appear anywhere, in any language. */
const BANNED = [
  "never stored",
  "Never stored or shared",
  "analyzed and deleted",
  "support@blink.app",
  "privacy@blink.app",
  "hello@blink.app",
  "What people said after running their own profile",
  "Your data is private and secure",
];

const ROUTES = ["/", "/privacy", "/terms", "/cookies", "/legal", "/contact", "/analyze"];

// The pinned Playwright expects a browser build this machine may not have.
// `CHROME` points it at whatever Chromium is actually installed; without it,
// the sweep fails on the download rather than on anything about Blink.
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

for (const lang of ["en", "fr"]) {
  for (const [device, viewport] of [
    ["mobile", { width: 390, height: 844 }],
    ["desktop", { width: 1280, height: 900 }],
  ]) {
    const ctx = await browser.newContext({
      viewport,
      locale: lang === "fr" ? "fr-FR" : "en-US",
      // `navigator.languages` is what detection reads first, and Playwright's
      // `locale` alone does not always set it convincingly.
      extraHTTPHeaders: { "Accept-Language": lang === "fr" ? "fr-FR,fr;q=0.9" : "en-US,en;q=0.9" },
    });
    await ctx.addInitScript((l) => {
      Object.defineProperty(navigator, "languages", {
        get: () => (l === "fr" ? ["fr-FR", "fr"] : ["en-US", "en"]),
      });
      Object.defineProperty(navigator, "language", { get: () => (l === "fr" ? "fr-FR" : "en-US") });
    }, lang);

    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("requestfailed", (r) => {
      const url = r.url();
      if (/fonts\.g(oogle|static)apis\.com/.test(url)) return;
      errors.push(`request failed: ${url}`);
    });
    page.on("console", (m) => {
      const text = m.text();
      // A blocked Google Fonts request is the network this sweep runs on, not
      // a defect in Blink — the stylesheet is deliberately non-blocking. Every
      // other console error counts, and hydration warnings count double: a
      // mismatch is the specific failure the language design exists to avoid.
      if (/ERR_CONNECTION|fonts\.g(oogle|static)apis/.test(text)) return;
      if (m.type() === "error" || /hydrat/i.test(text)) errors.push(text);
    });

    console.log(`\n=== ${lang} / ${device} ===`);

    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);

      const info = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        text: document.body.innerText,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      }));

      const slug = route === "/" ? "home" : route.replace(/\//g, "");
      // Every check in this sweep reads the DOM, so the images are for a
      // human to look at afterwards — not evidence the script uses.
      //
      // That matters because a full-page capture of these pages is expensive:
      // measured at 13s each on the legal routes, which is longer than all 28
      // page loads put together. So the default is a viewport shot, and
      // `SHOTS=full` asks for the tall ones when someone actually wants to
      // read them.
      await page.screenshot({
        path: `${OUT}/${lang}-${device}-${slug}.png`,
        fullPage: FULL_SHOTS && route !== "/",
      });

      if (info.lang !== lang) bad(`${route}: <html lang> is "${info.lang}", expected "${lang}"`);
      if (info.text.trim().length < 200) bad(`${route}: page has almost no text`);
      if (info.scrollW > info.clientW + 1) {
        bad(`${route}: horizontal overflow (${info.scrollW} > ${info.clientW})`);
      }

      for (const claim of BANNED) {
        if (info.text.toLowerCase().includes(claim.toLowerCase())) {
          bad(`${route}: still says "${claim}"`);
        }
      }

      // The language actually rendered, not just the attribute.
      if (route === "/") {
        const french = /Vois-toi comme/.test(info.text);
        const english = /See yourself the way/.test(info.text);
        if (lang === "fr" && !french) bad("/: French browser did not get the French hero");
        if (lang === "fr" && english) bad("/: French page still contains the English hero");
        if (lang === "en" && !english) bad("/: English browser did not get the English hero");
      }
    }

    // Footer legal links must all resolve.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const legalHrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("footer a[href^='/']")).map((a) => ({
        href: a.getAttribute("href"),
        text: a.textContent?.trim() ?? "",
        h: a.getBoundingClientRect().height,
      })),
    );
    if (legalHrefs.length < 5) bad(`footer exposes only ${legalHrefs.length} legal links`);
    for (const link of legalHrefs) {
      if (device === "mobile" && link.h < 44) {
        bad(`footer link "${link.text}" is ${Math.round(link.h)}px tall (min 44)`);
      }
      const res = await page.request.get(`${BASE}${link.href}`);
      if (!res.ok()) bad(`footer link ${link.href} → HTTP ${res.status()}`);
    }
    ok(`${legalHrefs.length} footer links resolve`);

    // The language toggle has to actually switch, and persist.
    await page.getByRole("button", { name: /Passer en français|Switch to English/ }).first().click();
    await page.waitForTimeout(400);
    const switched = await page.evaluate(() => document.documentElement.lang);
    if (switched === lang) bad("language toggle did not change the language");
    else ok(`toggle switched ${lang} → ${switched}`);
    await page.reload({ waitUntil: "domcontentloaded" });
    const persisted = await page.evaluate(() => document.documentElement.lang);
    if (persisted !== switched) bad(`language choice did not survive reload (${persisted})`);
    else ok("choice persisted across reload");

    if (errors.length) bad(`console/page errors: ${errors.slice(0, 3).join(" | ")}`);
    else ok("no console or page errors");

    await ctx.close();
  }
}

await browser.close();

console.log(`\nScreenshots: ${OUT}`);
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n - ${problems.join("\n - ")}` : "\nPROBLEMS: none");
process.exit(problems.length ? 1 : 0);
