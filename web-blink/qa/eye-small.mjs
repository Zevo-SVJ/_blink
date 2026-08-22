/**
 * Blink — the eye at a quarter size.
 *
 * The test that matters for the atmosphere: shrink the final frame until it is
 * a thumbnail, and see whether anything is still happening around the eye. A
 * hairline at a third opacity looks refined at full size and is simply absent
 * here, which is how "subtle" and "missing" get confused.
 *
 * Renders the last frame at 100%, 50% and 25% side by side.
 *
 *   node qa/eye-small.mjs 390
 */
import fs from "node:fs";
import { chromium } from "playwright";

const W = process.argv[2] ?? "390";
const dir = "/home/user/_blink/web-blink/qa/shots";
const b64 = fs.readFileSync(`${dir}/eye-${W}-100.png`).toString("base64");

const html = `<body style="margin:0;background:#05070f;display:flex;align-items:flex-start;gap:28px;padding:24px;font-family:system-ui">
${[100, 50, 25]
  .map(
    (pct) => `<figure style="margin:0">
  <figcaption style="color:#8aa;font-size:13px;padding-bottom:6px">${pct}%</figcaption>
  <img src="data:image/png;base64,${b64}" style="width:${(390 * pct) / 100}px;display:block">
</figure>`,
  )
  .join("")}
</body>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage({ viewport: { width: 760, height: 900 } });
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: `${dir}/small-${W}.png`, fullPage: true });
await browser.close();
console.log(`${dir}/small-${W}.png`);
