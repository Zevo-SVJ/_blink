/**
 * Blink — what every screen does when things are not fine.
 *
 * The happy path is the easy half. These are the states a real user meets and
 * nobody demos: an account with nothing in it, a backend that is down, a
 * session that has expired, a URL that does not exist, and the seconds before
 * data arrives. Each one either explains itself or leaves somebody looking at
 * a blank screen wondering whether the product is broken.
 *
 * ## What counts as a pass
 *
 * A screen is fine in a bad state when it says *something*: a heading and a
 * sentence, ideally a way out. It fails when it renders a shell — chrome, and
 * nothing between it — or when it sits on a spinner that never resolves, or
 * when it throws.
 *
 *   APP_URL=http://127.0.0.1:4173 node qa/states.mjs
 */
import { openApp } from "./drive.mjs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const MOCK = process.env.MOCK_URL ?? "http://127.0.0.1:54321";

const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

const ROUTES = ["/app", "/library", "/ranks", "/profile", "/settings"];

/** What the reader can actually read, ignoring the navigation. */
const bodyOf = (page) =>
  page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    return (main.innerText ?? "").replace(/\s+/g, " ").trim();
  });

/** Is anything still claiming to be loading? */
const stillLoading = (page) =>
  page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const text = (main.innerText ?? "").toLowerCase();
    const spinner = main.querySelector('[class*="animate-spin"], [class*="animate-pulse"]');
    return Boolean(spinner) || /loading|chargement|…$/.test(text);
  });

async function sweep(label, { seed, offline = false, expired = false }) {
  console.log(`\n=== ${label} ===`);
  await fetch(`${MOCK}/__mock/reset?seed=${seed}`).catch(() => {});

  const { browser, page } = await openApp({ width: "390", signedIn: !expired });
  const thrown = [];
  page.on("pageerror", (e) => thrown.push(String(e).slice(0, 160)));

  if (offline) {
    /* Everything the app asks the backend for fails, the way it does on a
       train. The bundle is already served from a different origin, so the app
       itself still loads — which is exactly the situation worth testing. */
    await page.route("**/127.0.0.1:54321/**", (route) => route.abort("failed"));
  }

  for (const route of ROUTES) {
    await page.goto(APP + route, { waitUntil: "domcontentloaded" });
    /* Eleven seconds, not three. supabase-js retries before a failed request
       surfaces, and the reads carry an eight-second ceiling of their own, so a
       screen that is going to show an error takes most of that. A three-second
       check reported four screens as hanging that were merely slow — and then
       hid the two that really were. */
    await page.waitForTimeout(11_000);

    if (expired && !new URL(page.url()).pathname.startsWith(route)) {
      ok(`${route}: sends a signed-out visitor to ${new URL(page.url()).pathname}`);
      continue;
    }

    const text = await bodyOf(page);
    const words = text.split(" ").filter(Boolean).length;

    if (await stillLoading(page)) {
      bad(`${route}: still loading after eleven seconds`);
    } else if (words < 6) {
      bad(`${route}: renders ${words} word(s) — "${text.slice(0, 70)}"`);
    } else {
      ok(`${route}: says something (${words} words) — "${text.slice(0, 58)}…"`);
    }
  }

  if (thrown.length) bad(`${label}: ${thrown.length} uncaught error(s) — ${thrown[0]}`);
  else ok(`${label}: nothing thrown`);

  await browser.close();
}

/* A brand new account: everything empty, but the product still works. */
await sweep("a new account, nothing analysed yet", { seed: "new" });

/* Nothing anywhere, including other people's standings. */
await sweep("an entirely empty backend", { seed: "empty" });

/* The backend is unreachable. */
await sweep("the backend is down", { seed: "default", offline: true });

/* No session at all: private routes must send you somewhere, not hang. */
await sweep("signed out, visiting private routes", { seed: "default", expired: true });

/* A URL that does not exist. */
console.log("\n=== a URL that does not exist ===");
{
  await fetch(`${MOCK}/__mock/reset?seed=default`).catch(() => {});
  const { browser, page } = await openApp({ width: "390" });
  for (const route of ["/does-not-exist", "/library/nope-not-a-real-id"]) {
    await page.goto(APP + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2800);
    const text = await bodyOf(page);
    const words = text.split(" ").filter(Boolean).length;
    const wayOut = await page.evaluate(() => {
      const main = document.querySelector("main") ?? document.body;
      return main.querySelectorAll("a, button").length > 0;
    });
    if (words < 4) bad(`${route}: renders ${words} word(s)`);
    else if (!wayOut) bad(`${route}: explains itself but offers no way out`);
    else ok(`${route}: explains itself and offers a way out — "${text.slice(0, 52)}…"`);
  }
  await browser.close();
}

await fetch(`${MOCK}/__mock/reset?seed=default`).catch(() => {});
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exitCode = problems.length ? 1 : 0;
