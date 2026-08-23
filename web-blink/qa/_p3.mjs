import { chromium } from "playwright";
const APP = "http://127.0.0.1:4173";
const b = await chromium.launch();
for (const [label, w, h] of [["390", 390, 844], ["1280", 1280, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(APP, { waitUntil: "networkidle" });
  for (const k of [0, 0.25, 0.5, 0.75, 1]) {
    await p.evaluate((frac) => {
      const s = document.querySelector("#problem");
      const r = s.getBoundingClientRect();
      const top = r.top + window.scrollY;
      window.scrollTo({ top: top + (r.height - window.innerHeight) * frac, behavior: "instant" });
    }, k);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `qa/shots/p3/eye-${label}-${k}.png` });
  }
  // overflow check
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(label, "overflow", over);
  await p.close();
}
await b.close();
