/** The analysis experience, from upload to score, frame by frame. */
import { openApp } from "./drive.mjs";
const APP = process.env.APP_URL ?? "http://127.0.0.1:8080";
const W = process.env.W ?? "390";
const TAG = process.env.TAG ?? "phone";

await fetch("http://127.0.0.1:54321/__mock/reset?seed=new");
const { browser, page } = await openApp({ width: W });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|ERR_CONNECTION_RESET/.test(m.text())) errors.push("console: " + m.text().slice(0, 200)); });

// A 12-second stub so the analysing sequence can be watched properly.
await page.goto(`${APP}/analyze?mock=own&delay=9000`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);
await page.screenshot({ path: `qa/shots/analysis/${TAG}-00-upload.png` });

// Feed it a real PNG through the file input.
const png = await page.evaluate(async () => {
  const c = document.createElement("canvas");
  c.width = 1170; c.height = 2100;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#111"; x.font = "bold 54px sans-serif"; x.fillText("@sam.merrick", 70, 160);
  x.fillStyle = "#ddd"; x.beginPath(); x.arc(180, 380, 110, 0, 7); x.fill();
  for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) {
    x.fillStyle = ["#c9d6e3", "#9fb4c8", "#7f96ad"][(r + col) % 3];
    x.fillRect(40 + col * 370, 700 + r * 370, 350, 350);
  }
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
  const buf = new Uint8Array(await blob.arrayBuffer());
  return Array.from(buf);
});
await page.setInputFiles('input[type="file"]', {
  name: "profile.png", mimeType: "image/png", buffer: Buffer.from(png),
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `qa/shots/analysis/${TAG}-01-preview.png` });

// Start the analysis.
// `main` scoped: "Analyze" is also the tab bar's centre action.
const start = page.locator("main button").filter({ hasText: /analyz|analyse/i }).first();
await start.click();
// Watch the analysing sequence.
for (const [i, ms] of [1200, 2200, 2200, 2200, 2200].entries()) {
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `qa/shots/analysis/${TAG}-02-analysing-${i}.png` });
}
await page.waitForTimeout(6000);
await page.screenshot({ path: `qa/shots/analysis/${TAG}-03-result.png`, fullPage: true });
console.log("  url:", new URL(page.url()).pathname);

await browser.close();
console.log(errors.length ? "\nERRORS:\n" + errors.join("\n") : "\nno console errors");
