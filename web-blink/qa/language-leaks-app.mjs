/**
 * Blink — English left behind on the French app, on the screens behind a login.
 *
 * `language-leaks.mjs` walks what a signed-out visitor can reach. Everything
 * interesting in Blink is not that: Home, Library, Ranks, Profile, Settings and
 * the whole analysis flow need a session, and they were never checked. Three
 * leaks shipped there and were found by looking at screenshots — the analyse
 * page's "Library" link, the six signal names around the profile picture, and
 * "Saving this analysis to your profile…". Each one was a literal somebody
 * typed straight into JSX.
 *
 * The oracle is the same as the signed-out harness: a phrase that exists in
 * `MESSAGES.en` and not in `MESSAGES.fr` has no business on a French page. It
 * is exact and self-maintaining — add a string to both dictionaries and it is
 * automatically exempt.
 *
 *   node qa/language-leaks-app.mjs
 */

import { readFileSync } from "node:fs";

import { openApp } from "./drive.mjs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";

const problems = [];
const bad = (s) => { problems.push(s); console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

/** Leaf strings from one dictionary, long enough to be unambiguous. */
function dictionaryStrings(source, startMarker, endMarker) {
  const body = source.slice(source.indexOf(startMarker), source.indexOf(endMarker));
  const out = new Set();
  for (const m of body.matchAll(/"((?:[^"\\]|\\.){12,})"/g)) {
    const value = m[1].replace(/\\"/g, '"').replace(/\\'/g, "'");
    if (value.includes("{") || value.includes("<")) continue;
    out.add(value);
  }
  return out;
}

const source = readFileSync(new URL("../src/lib/messages.ts", import.meta.url), "utf8");
const enOnly = dictionaryStrings(source, "const en = {", "const fr: Messages = {");
const frOnly = dictionaryStrings(source, "const fr: Messages = {", "export const MESSAGES");
for (const shared of [...enOnly].filter((s) => frOnly.has(s))) {
  enOnly.delete(shared);
  frOnly.delete(shared);
}

/**
 * Words that mean English wherever they appear in this product.
 *
 * The dictionary comparison only catches a string that made it into
 * `MESSAGES.en`. It is blind to the worse case — a literal typed into a
 * component and never translated at all — which is how every one of the three
 * leaks above got in. Each entry is unambiguous here: not a brand, not a file
 * format, not a word French borrows.
 */
const MARKERS = [
  // Not "Blink Score": it is the name of the metric and stays in English in
  // both dictionaries, exactly like "Blink" itself.
  "your profile",
  "saving this",
  "visual identity",
  "approachability",
  "analyze",
  "library",
  "settings",
  "delete",
  "download",
  "upload",
  "screenshot",
  "loading",
  "sign in",
  "sign up",
  "log in",
  "welcome",
  "search",
];

const ROUTES = ["/app", "/library", "/ranks", "/profile", "/settings", "/analyze"];

const { browser, page } = await openApp({ width: "390", lang: "fr" });
console.log("\n=== fr, signed in: looking for English ===");

let leaks = 0;
for (const route of ROUTES) {
  await page.goto(APP + route, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2400);
  const text = await page.evaluate(() => document.body.innerText);

  for (const phrase of enOnly) {
    if (text.includes(phrase)) {
      bad(`${route}: English leaked — "${phrase.slice(0, 60)}"`);
      leaks++;
    }
  }
  for (const marker of MARKERS) {
    const re = new RegExp(`\\b${marker.replace(/ /g, "\\s+")}\\b`, "i");
    if (re.test(text)) {
      bad(`${route}: untranslated English — "${marker}"`);
      leaks++;
    }
  }
}
if (leaks === 0) ok(`${ROUTES.length} signed-in routes carry no English`);

await browser.close();
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exitCode = problems.length ? 1 : 0;
