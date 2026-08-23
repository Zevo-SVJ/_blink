/** Library: open an item, come back, and check the page keeps its place. */
import { openApp } from "./drive.mjs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const W = process.env.W ?? "390";
const TAG = process.env.TAG ?? "phone";
await fetch("http://127.0.0.1:54321/__mock/reset?seed=default");

const { browser, page } = await openApp({ width: W });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("console", (m) => {
  const text = m.text();
  if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|ERR_CONNECTION_RESET/.test(text)) {
    errors.push("console: " + text.slice(0, 200));
  }
});

await page.goto(APP + "/library", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);
await page.screenshot({ path: `qa/shots/walk/${TAG}-lib-0.png` });

// Scroll down so "back returns me where I was" has a visible answer.
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(500);
const wasAt = await page.evaluate(() => Math.round(window.scrollY));

// Open the row that is already on screen, without Playwright scrolling to it.
const opened = await page.evaluate(() => {
  const mid = window.innerHeight / 2;
  const row = [...document.querySelectorAll("main a, main button")].find((el) => {
    const r = el.getBoundingClientRect();
    return r.top < mid && r.bottom > mid && /@/.test(el.innerText ?? "");
  });
  if (!row) return null;
  const handle = (row.innerText.match(/@[\w.]+/) ?? [])[0];
  row.click();
  return handle;
});
await page.waitForTimeout(2200);
console.log("  opened:", opened, "->", new URL(page.url()).pathname);
console.log("  opened at scroll:", await page.evaluate(() => Math.round(window.scrollY)));
await page.screenshot({ path: `qa/shots/walk/${TAG}-lib-detail.png` });
console.log(
  "  detail shows the handle:",
  await page.evaluate((h) => document.body.innerText.includes(h ?? " "), opened),
);

await page.goBack();
await page.waitForTimeout(2200);
const backAt = await page.evaluate(() => Math.round(window.scrollY));
console.log(`  back -> ${new URL(page.url()).pathname} at ${backAt} (left at ${wasAt})`);

// Refresh the detail route directly: a shared link has to work.
await page.goto(APP + "/library", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const href = await page.evaluate(() => {
  const a = [...document.querySelectorAll("main a")].find((el) => /@/.test(el.innerText ?? ""));
  return a?.getAttribute("href") ?? null;
});
if (href) {
  await page.goto(APP + href, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2600);
  const head = await page.evaluate(() => document.body.innerText.slice(0, 60).replace(/\n/g, " "));
  console.log("  direct URL", href, "->", head);
  console.log("  opens at scroll:", await page.evaluate(() => Math.round(window.scrollY)));
  await page.screenshot({ path: `qa/shots/walk/${TAG}-lib-direct.png` });
} else {
  console.log("  no linked row found");
}

await browser.close();
console.log(errors.length ? "\nERRORS:\n" + errors.join("\n") : "\nno console errors");
