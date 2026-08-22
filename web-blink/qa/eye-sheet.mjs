/**
 * Blink — the eye's six stages, side by side.
 *
 * Run `qa/eye.mjs` first, then this. Judging an animation frame by frame is
 * how uneven pacing survives review: each still looks fine on its own, and
 * only the strip shows that half the movement happens in one fifth of the
 * scroll, or that 60%, 80% and 100% are indistinguishable. Both of those were
 * real, and both were found here rather than in the individual shots.
 *
 *   node qa/eye-sheet.mjs 390
 */
import fs from "node:fs";
import { chromium } from "playwright";

const W = process.argv[2] ?? "390";
const dir = "/home/user/_blink/web-blink/qa/shots";
const stops = ["000", "020", "040", "060", "080", "100"];
const imgs = stops.map((s) => {
  const f = `${dir}/eye-${W}-${s}.png`;
  return { s, b64: fs.readFileSync(f).toString("base64") };
});

const html = `<body style="margin:0;background:#111;display:flex;font-family:system-ui">
${imgs
  .map(
    (i) => `<figure style="margin:0;flex:1">
  <figcaption style="color:#bbb;font-size:22px;padding:8px;text-align:center">${Number(i.s)}%</figcaption>
  <img src="data:image/png;base64,${i.b64}" style="width:100%;display:block">
</figure>`,
  )
  .join("")}
</body>`;

const b = await chromium.launch({ executablePath: process.env.CHROME });
const p = await b.newPage({ viewport: { width: 2400, height: 900 } });
await p.setContent(html);
await p.waitForTimeout(400);
await p.screenshot({ path: `${dir}/sheet-${W}.png`, fullPage: true });
await b.close();
console.log(`${dir}/sheet-${W}.png`);
