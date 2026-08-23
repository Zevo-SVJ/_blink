import { chromium } from "playwright";
const APP = "http://127.0.0.1:4173";
const b = await chromium.launch();
const ids = process.argv[2] ? process.argv[2].split(",") : ["how-it-works","leaderboard","reactions","faq"];
for (const [label, w, h] of [["390", 390, 844], ["1280", 1280, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(APP, { waitUntil: "networkidle" });
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); }
  });
  await p.waitForTimeout(500);
  for (const id of ids) {
    const el = await p.$("#" + id);
    if (!el) { console.log("missing #" + id); continue; }
    await p.evaluate((i) => { const e = document.getElementById(i); window.scrollTo({ top: e.getBoundingClientRect().top + window.scrollY - 70, behavior: "instant" }); }, id);
    await p.waitForTimeout(600);
    await el.screenshot({ path: `qa/shots/p5/${id}-${label}.png` });
  }
  console.log(label, "overflow", await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  await p.close();
}
await b.close();
