/**
 * The analysis flow asks for the account first.
 *
 * The result is saved to a library, moves a score and places a profile on a
 * leaderboard, so it has always needed one — the flow just used to ask at the
 * end, after the work was done. This checks that a signed-out visitor coming
 * from the landing page's button meets the *existing* sign-in modal before
 * anything else, and that backing out of it returns them to the page they
 * came from rather than stranding them on an upload screen they cannot finish.
 *
 *   APP_URL=http://127.0.0.1:4173 node qa/analyze-gate.mjs
 */
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

const browser = await chromium.launch();

for (const [label, w, h] of [["mobile", 390, 844], ["desktop", 1280, 900]]) {
  console.log(`\n=== ${label} ===`);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(APP + "/", { waitUntil: "load" });
  await page.waitForTimeout(600);

  // The landing's main call to action.
  await page.getByRole("link", { name: /first impression|première impression/i }).first().click();
  await page.waitForTimeout(1400);

  if (/\/analyze/.test(page.url())) ok("the button leads to the analysis flow");
  else bad(`went to ${page.url()}`);

  const dialog = page.locator('[role="dialog"]');
  if (await dialog.count()) ok("the sign-in screen is the first thing shown");
  else bad("no sign-in screen — the flow opened straight onto upload");

  const text = (await dialog.first().textContent()) ?? "";
  if (/google/i.test(text)) ok("with the existing Google option on it");
  else bad("the Google option is missing — is this the shipped modal?");

  // It must be the modal that already existed, not a second one.
  if ((await dialog.count()) === 1) ok("exactly one sign-in surface, not a new one alongside it");
  else bad(`${await dialog.count()} dialogs are open at once`);

  // The upload screen must not be reachable behind it.
  const uploadVisible = await page.evaluate(() => {
    const el = document.querySelector('input[type="file"]');
    return !!el && el.closest("[aria-hidden='true']") === null;
  });
  if (uploadVisible) ok("the rest of the flow is behind it, ready");
  else bad("the flow itself did not render behind the gate");

  // Backing out returns to the landing.
  await page.getByRole("button", { name: /close|fermer/i }).first().click()
    .catch(() => page.locator('[role="dialog"] button').first().click());
  await page.waitForTimeout(1200);
  if (!/\/analyze/.test(page.url())) ok(`dismissing it goes back (${new URL(page.url()).pathname})`);
  else bad("dismissing it left the visitor on an upload screen they cannot finish");

  await page.close();
}

console.log("\nPROBLEMS: " + (problems.length ? "\n  - " + problems.join("\n  - ") : "none"));
await browser.close();
process.exit(problems.length ? 1 : 0);
