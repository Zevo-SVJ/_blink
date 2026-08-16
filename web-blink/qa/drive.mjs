/**
 * Blink — the shared driver for the signed-in screenshot harnesses.
 *
 * One place for the things every harness in this directory needs and gets
 * wrong differently otherwise:
 *
 *  - **`domcontentloaded`, never `load` or `networkidle`.** The app requests
 *    Google Fonts, which this network cannot reach; `load` waits for that
 *    request to time out and `networkidle` never arrives at all. Harnesses
 *    that used them hung for minutes and looked like product bugs.
 *  - **A session written before the first script runs.** supabase-js reads its
 *    session out of localStorage synchronously on construction, so seeding it
 *    after navigation means the first render is the signed-out one.
 *  - **Settling on the DOM rather than on a timer.** Every wait here polls for
 *    something the page actually says.
 *
 * Screenshots land in `qa/shots/` (gitignored). They exist to be *looked at* —
 * this file only makes taking them cheap.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const SHOTS = path.join(HERE, "shots");
export const APP = process.env.APP_URL ?? "http://localhost:8080";
export const MOCK = process.env.MOCK_URL ?? "http://127.0.0.1:54321";

/** The device widths the goal names, plus a desktop. */
export const WIDTHS = {
  "320": { width: 320, height: 640 },
  "375": { width: 375, height: 667 },
  "390": { width: 390, height: 844 },
  "430": { width: 430, height: 932 },
  desktop: { width: 1440, height: 900 },
};

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const problems = [];

export function ok(message) {
  console.log(`  ✓ ${message}`);
}

export function bad(message) {
  problems.push(message);
  console.log(`  ✗ ${message}`);
}

export function check(condition, good, wrong) {
  if (condition) ok(good);
  else bad(wrong ?? good);
  return condition;
}

export function section(title) {
  console.log(`\n=== ${title} ===`);
}

export function report() {
  console.log(`\nPROBLEMS: ${problems.length ? problems.join(" | ") : "none"}`);
  return problems.length;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * The localStorage key supabase-js derives from the project URL.
 *
 * It is `sb-<first label of the hostname>-auth-token`, so a mock on
 * `127.0.0.1` is `sb-127-auth-token`. Computing it rather than hardcoding it
 * means pointing the harness at a real project still works.
 */
export function storageKey(url = MOCK) {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

async function fetchSession() {
  const res = await fetch(`${MOCK}/__mock/session`);
  if (!res.ok) throw new Error(`mock-backend not reachable at ${MOCK}`);
  return res.json();
}

/** Replace the mock's tables wholesale. */
export async function setDb(patch) {
  const res = await fetch(`${MOCK}/__mock/db`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("mock-backend rejected the db patch");
}

export async function getDb() {
  return (await fetch(`${MOCK}/__mock/db`)).json();
}

export async function resetDb(seed = "default") {
  await fetch(`${MOCK}/__mock/reset?seed=${seed}`);
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

/**
 * A signed-in page at a given width.
 *
 * `lang` writes the same key the app's own language switch writes, so the
 * French pass exercises the real selection path rather than a query string
 * the product does not have.
 */
export async function openApp({
  width = "390",
  lang = "en",
  signedIn = true,
  browser,
} = {}) {
  const owned = !browser;
  const b =
    browser ??
    (await chromium.launch({
      executablePath: process.env.CHROME || undefined,
    }));

  const context = await b.newContext({
    viewport: WIDTHS[width] ?? WIDTHS["390"],
    deviceScaleFactor: 2,
    locale: lang === "fr" ? "fr-FR" : "en-US",
    reducedMotion: "no-preference",
  });

  const auth = signedIn ? await fetchSession() : null;
  const key = storageKey();

  await context.addInitScript(
    ({ key, auth, lang }) => {
      try {
        if (auth) window.localStorage.setItem(key, JSON.stringify(auth));
        else window.localStorage.removeItem(key);
        window.localStorage.setItem("blink.lang", lang);
      } catch {
        /* storage unavailable — the page will simply render signed out */
      }
    },
    { key, auth, lang },
  );

  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  return { browser: b, context, page, errors, ownsBrowser: owned };
}

/** Navigate and wait for the page to have painted something real. */
export async function go(page, route, { settle = 1200 } = {}) {
  await page.goto(`${APP}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(settle);
}

/** Poll until the page says `text`, or fail loudly with what it did say. */
export async function waitForText(page, text, timeout = 8000) {
  const deadline = Date.now() + timeout;
  const needle = String(text);
  while (Date.now() < deadline) {
    const found = await page.evaluate(
      (n) => (document.body.innerText ?? "").includes(n),
      needle,
    );
    if (found) return true;
    await page.waitForTimeout(100);
  }
  const body = await page.evaluate(() =>
    (document.body.innerText ?? "").replace(/\s+/g, " ").slice(0, 500),
  );
  throw new Error(`"${needle}" never appeared. Page said: ${body}`);
}

export async function text(page) {
  return page.evaluate(() => (document.body.innerText ?? "").replace(/\s+/g, " "));
}

/** The viewport, not the full page — what the user is actually looking at. */
export async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`    · ${path.relative(HERE, file)}`);
  return file;
}

export async function shotFull(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`    · ${path.relative(HERE, file)} (full)`);
  return file;
}
