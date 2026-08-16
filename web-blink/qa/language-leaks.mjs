/**
 * Blink — does any English survive in the French app, or vice versa?
 *
 * "Translate everything" is easy to believe you have done and hard to verify by
 * reading: one `title="Library"` left in a component nobody opened is invisible
 * until a French user finds it. So this walks the routes a signed-out visitor
 * can reach, in both languages, and fails on words that only exist in the
 * *other* language's dictionary.
 *
 * ## How it decides something leaked
 *
 * Not a spell-check. The two dictionaries are the oracle: a phrase that appears
 * in `MESSAGES.en` and not in `MESSAGES.fr` has no business on a French page,
 * and the reverse for English. That makes the check exact and self-maintaining
 * — add a string to both dictionaries and it is automatically exempt; add it to
 * one and forget the other, and the page that shows it fails here.
 *
 * ## What it cannot reach
 *
 * The authenticated app needs a session, which this environment has no
 * credentials for. Those screens are covered by the dictionary's own type
 * check — French is typed against English, so a missing key is a build error —
 * and by `grep` for hardcoded attributes. This harness covers what a browser
 * can actually open.
 *
 *   node qa/language-leaks.mjs
 */

import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";

const problems = [];
const bad = (s) => { problems.push(s); console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

/**
 * Pull the leaf strings out of the dictionary source.
 *
 * Reading the TypeScript rather than importing it keeps this a plain script
 * with no build step. Only strings long enough to be unambiguous are used —
 * "Blink", "FAQ" and "Instagram" are identical in both languages and would
 * otherwise report themselves.
 */
function dictionaryStrings(source, startMarker, endMarker) {
  const body = source.slice(source.indexOf(startMarker), source.indexOf(endMarker));
  const out = new Set();
  for (const m of body.matchAll(/"((?:[^"\\]|\\.){12,})"/g)) {
    const value = m[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
    // Skip anything with a placeholder or markup — it never renders verbatim.
    if (value.includes("{") || value.includes("<")) continue;
    out.add(value);
  }
  return out;
}

const source = readFileSync(new URL("../src/lib/messages.ts", import.meta.url), "utf8");
const enOnly = dictionaryStrings(source, "const en = {", "const fr: Messages = {");
const frOnly = dictionaryStrings(source, "const fr: Messages = {", "export const MESSAGES");

// A phrase present in both dictionaries is language-neutral (a brand name, a
// shared label) and can never be a leak.
for (const shared of [...enOnly].filter((s) => frOnly.has(s))) {
  enOnly.delete(shared);
  frOnly.delete(shared);
}

/**
 * English words that should never survive on a French page.
 *
 * The dictionary comparison above only catches a string that *made it into*
 * `MESSAGES.en`. It is blind to the worse case: a string hardcoded in a
 * component and never translated at all — which is exactly how "Upload profile
 * screenshot" sat on the French analyse screen while every automated check
 * passed. A screenshot caught it; this list is so the next one does not need
 * a human eye.
 *
 * Each entry is a word that is unambiguous in this product: it means English,
 * and it is not a brand name, a file format or a term French borrows. Matched
 * whole-word and case-insensitively.
 */
const ENGLISH_MARKERS = [
  "upload",
  "screenshot",
  "loading",
  "settings",
  "library",
  "back to",
  "sign in",
  "sign up",
  "log in",
  "your profile",
  "analyze",
  "leaderboard",
  "welcome",
  "search",
  "delete",
  "download",
  "share your",
  "save image",
];

/**
 * English that is *correct* on a French page, and why.
 *
 * Removed from the marker list after each one fired as a false positive:
 *
 *  - `continue` — also a French word ("disponibilité continue"), so it can
 *    never be a reliable signal.
 *  - `close` — likewise ("clore" → "close").
 *  - `analysis` — too close to "analyse"; `analyze` alone is decisive.
 *  - `share` on its own — the privacy policy quotes the Californian
 *    "Do Not Sell or Share" mechanism by its statutory name, which must stay
 *    in English to be recognisable. `share your` catches the UI string
 *    without catching the citation.
 *
 * Brand names, file formats and protocol words (Instagram, Blink, PNG, JPG,
 * WebP, localStorage, HTTPS, JSON) are English everywhere and are simply not
 * in the list.
 */

const ROUTES = ["/", "/privacy", "/terms", "/cookies", "/legal", "/contact", "/analyze"];

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

for (const [lang, foreign, name] of [
  ["fr", enOnly, "English"],
  ["en", frOnly, "French"],
]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((l) => {
    Object.defineProperty(navigator, "languages", {
      get: () => (l === "fr" ? ["fr-FR", "fr"] : ["en-US", "en"]),
    });
    Object.defineProperty(navigator, "language", {
      get: () => (l === "fr" ? "fr-FR" : "en-US"),
    });
  }, lang);

  const page = await ctx.newPage();
  console.log(`\n=== ${lang}: looking for ${name} ===`);

  let leaks = 0;
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const text = await page.evaluate(() => document.body.innerText);

    for (const phrase of foreign) {
      if (text.includes(phrase)) {
        bad(`${route}: ${name} leaked — "${phrase.slice(0, 60)}"`);
        leaks++;
      }
    }

    // The hardcoded-string case, which the dictionary comparison cannot see.
    if (lang === "fr") {
      for (const marker of ENGLISH_MARKERS) {
        const re = new RegExp(`\\b${marker.replace(/ /g, "\\s+")}\\b`, "i");
        if (re.test(text)) {
          bad(`${route}: untranslated English — "${marker}"`);
          leaks++;
        }
      }
    }
  }

  if (leaks === 0) ok(`${ROUTES.length} routes carry no ${name}`);
  await ctx.close();
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exit(problems.length ? 1 : 0);
