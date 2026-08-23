/** A real first run: landing → CTA → sign up → the app, screenshotting each step. */
import { chromium } from "playwright";
const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844);
const TAG = process.env.TAG ?? "phone";

await fetch("http://127.0.0.1:54321/__mock/reset?seed=new");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 160)));
page.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push("console: " + m.text().slice(0, 160)); });

const shot = async (name) => { await page.screenshot({ path: `qa/shots/walk/${TAG}-${name}.png` }); console.log("  ·", name, "→", new URL(page.url()).pathname); };

await page.goto(APP, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);
await shot("01-landing");

// The hero CTA — what a first-time visitor actually presses.
const cta = page.locator("main button, main a").filter({ hasText: /first impression|see my/i }).first();
await cta.click();
await page.waitForTimeout(2500);
await shot("02-after-cta");

// Fill in the form the way a person does, one field at a time.
await page.locator('input[type="email"]').fill("newcomer@example.com");
await page.waitForTimeout(400);
await shot("03-email-typed");

// The keyboard on a phone leaves roughly half the screen. Can the button
// still be reached?
if (W < 800) {
  await page.setViewportSize({ width: W, height: 430 });
  await page.waitForTimeout(500);
  await shot("04-keyboard-open");
  const submitVisible = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /create account|créer/i.test(x.innerText));
    if (!b) return "no submit button found";
    const r = b.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight ? "reachable" : `off-screen (top ${Math.round(r.top)}, bottom ${Math.round(r.bottom)}, viewport ${window.innerHeight})`;
  });
  console.log("  submit with keyboard open:", submitVisible);
  await page.setViewportSize({ width: W, height: H });
  await page.waitForTimeout(500);
}

await page.locator('input[type="password"]').fill("hunter2pass");
await page.waitForTimeout(300);
await page.locator("button", { hasText: /create account|créer/i }).first().click();
await page.waitForTimeout(3500);
await shot("05-after-signup");
console.log("  landed on:", new URL(page.url()).pathname);

for (const [name, path] of [["06-home", "/app"], ["07-library", "/library"], ["08-ranks", "/ranks"], ["09-profile", "/profile"], ["10-settings", "/settings"]]) {
  await page.goto(APP + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2400);
  await page.screenshot({ path: `qa/shots/walk/${TAG}-${name}.png`, fullPage: true });
  console.log("  ·", name);
}

await browser.close();
console.log(errors.length ? "\nERRORS:\n" + errors.join("\n") : "\nno console errors");
