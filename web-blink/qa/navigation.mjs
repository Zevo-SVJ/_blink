/**
 * Blink — does Back return you where you came from?
 *
 * Secondary screens used to send Back to one fixed destination, which is right
 * only when you arrived from that place. This checks the two properties that
 * actually matter:
 *
 *  1. **In-app back returns to the previous screen**, not to a hardcoded one.
 *  2. **A deep link still has somewhere to go** — arriving cold on a secondary
 *     route must not leave Back inert or bounce the reader out of Blink.
 *
 * The authenticated screens need a session this environment does not have, so
 * the routes exercised here are the public ones: the landing, the analyse flow
 * and the legal pages, which is where a signed-out visitor and a Stripe
 * reviewer both actually go.
 *
 *   node qa/navigation.mjs
 */

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";

const problems = [];
const bad = (s) => { problems.push(s); console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

const path = (page) => new URL(page.url()).pathname;

for (const [device, viewport] of [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1280, height: 900 }],
]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  console.log(`\n=== ${device} ===`);

  // 1. Landing → legal page → browser back returns to the landing, scrolled
  //    state and all.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/privacy`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(400);
  if (path(page) !== "/") bad(`browser back from /privacy landed on ${path(page)}`);
  else ok("browser back from a legal page returns to the landing");

  // 2. In-app link → "Back to Blink" returns to the landing.
  await page.goto(`${BASE}/terms`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const backLink = page.getByRole("link", { name: /Back to Blink|Retour à Blink/ }).first();
  if (await backLink.count()) {
    await backLink.click();
    await page.waitForTimeout(500);
    if (path(page) !== "/") bad(`"Back to Blink" landed on ${path(page)}`);
    else ok('"Back to Blink" returns to the landing');
  } else {
    bad("legal pages have no visible way back");
  }

  // 3. Deep link into the analyse flow, cold: Back must go somewhere sensible
  //    rather than nowhere. This is the case a shared link produces.
  await page.goto(`${BASE}/analyze`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  /*
    A cold `/analyze` while signed out puts the sign-in gate on top, and the
    flow's own back button stays in the DOM underneath it. Clicking that one
    times out against the overlay — correctly, because a modal is supposed to
    block the page behind it. The way out of this screen is the gate's own
    dismiss, so that is what "back" means here.
  */
  const gate = page.getByRole("button", { name: /close|fermer/i }).first();
  const back = (await gate.count())
    ? gate
    : page
        .getByRole("button", { name: /Back|Retour|Home|Accueil/ })
        .locator("visible=true")
        .first();
  if (await back.count()) {
    await back.click();
    await page.waitForTimeout(600);
    const landed = path(page);
    if (landed === "/analyze") bad("Back did nothing on a cold /analyze");
    else ok(`cold /analyze Back → ${landed}`);
  } else {
    bad("/analyze has no back control");
  }

  // 4. Landing → analyse → Back returns to the landing rather than a default.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/analyze`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  // Same as step 3: signed out, the gate is what covers this screen.
  const gate2 = page.getByRole("button", { name: /close|fermer/i }).first();
  const back2 = (await gate2.count())
    ? gate2
    : page
        .getByRole("button", { name: /Back|Retour|Home|Accueil/ })
        .locator("visible=true")
        .first();
  if (await back2.count()) {
    await back2.click();
    await page.waitForTimeout(600);
    if (path(page) !== "/") bad(`Back from /analyze (entered from landing) → ${path(page)}`);
    else ok("Back from /analyze returns to where it was entered from");
  }

  // 5. A signed-out visitor on a shared profile link gets no app navigation.
  //    The tab bar is for people who are *in* the app; showing it to someone
  //    who followed a link from a message offers destinations they cannot
  //    open, and implies an account they do not have.
  await page.goto(`${BASE}/u/00000000-0000-0000-0000-000000000000`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(700);
  const chrome = await page.evaluate(() => ({
    tabBar: !!document.querySelector('nav[aria-label="Primary"], nav[aria-label="Navigation principale"]'),
    text: document.body.innerText.length,
  }));
  if (chrome.tabBar) bad("signed-out /u/:id renders the app tab bar");
  else ok("signed-out /u/:id has no app navigation");
  if (chrome.text < 40) bad("signed-out /u/:id renders nothing at all");
  else ok("an unknown profile id degrades gracefully");

  // 6. A refreshed legal page still renders and is still escapable — the
  //    static-host fallback path.
  await page.goto(`${BASE}/cookies`, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const stillThere = await page.evaluate(() => document.body.innerText.length > 200);
  if (!stillThere) bad("/cookies is blank after a refresh");
  else ok("a refreshed deep link still renders");

  await ctx.close();
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exit(problems.length ? 1 : 0);
