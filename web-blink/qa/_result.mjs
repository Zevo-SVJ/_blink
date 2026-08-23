/** The result screen: layout, the section bar, and switching the gaze. */
import { openApp } from "./drive.mjs";
const APP = process.env.APP_URL ?? "http://127.0.0.1:8080";
const W = process.env.W ?? "390";
const TAG = process.env.TAG ?? "phone";

await fetch("http://127.0.0.1:54321/__mock/reset?seed=new");
const { browser, page } = await openApp({ width: W });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|ERR_CONNECTION_RESET/.test(m.text())) errors.push("console: " + m.text().slice(0, 200)); });

await page.goto(`${APP}/analyze?mock=own&delay=200`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);
const png = await page.evaluate(async () => {
  const c = document.createElement("canvas"); c.width = 1170; c.height = 2100;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#111"; x.font = "bold 54px sans-serif"; x.fillText("@sam.merrick", 70, 160);
  x.fillStyle = "#ddd"; x.beginPath(); x.arc(180, 380, 110, 0, 7); x.fill();
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
});
await page.setInputFiles('input[type="file"]', { name: "p.png", mimeType: "image/png", buffer: Buffer.from(png) });
await page.waitForTimeout(1200);
await page.locator("main button").filter({ hasText: /analyz|analyse/i }).first().click();
await page.waitForTimeout(14000);
console.log("  screen:", await page.evaluate(() => document.body.innerText.slice(0, 40).replace(/\n/g, " ")));

// The result, viewport by viewport.
const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
for (let i = 0; i <= 4; i++) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.round((max * i) / 4));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `qa/shots/analysis/${TAG}-R${i}.png` });
}

// Switching the gaze: does the profile stay put and the reading change?
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
const before = await page.evaluate(() => document.body.innerText.slice(0, 900));
const tabs = await page.$$('main [role="tab"], main button:has-text("Stranger")');
console.log("  gaze controls found:", tabs.length);
const stranger = page.locator("main button").filter({ hasText: /stranger|inconnu/i }).first();
if (await stranger.count()) {
  await stranger.click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `qa/shots/analysis/${TAG}-R-gaze-stranger.png` });
  const after = await page.evaluate(() => document.body.innerText.slice(0, 900));
  console.log("  reading changed on gaze switch:", before !== after);
} else {
  console.log("  ✗ no gaze control reachable");
}

// The floating section bar: does it overlap content?
const bar = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div,nav")].find(
    (e) => /perception/i.test(e.innerText ?? "") && getComputedStyle(e).position === "fixed",
  );
  if (!el) return "no fixed section bar";
  const r = el.getBoundingClientRect();
  return { bottom: Math.round(window.innerHeight - r.bottom), height: Math.round(r.height) };
});
console.log("  section bar:", JSON.stringify(bar));

await browser.close();
console.log(errors.length ? "\nERRORS:\n" + errors.join("\n") : "\nno console errors");
