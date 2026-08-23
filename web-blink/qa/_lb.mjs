import { chromium } from "playwright";
const b = await chromium.launch();
for (const [label, w, h] of [["390", 390, 844], ["1280", 1280, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); } });
  await p.evaluate(() => { const e = document.getElementById("leaderboard"); window.scrollTo({ top: e.getBoundingClientRect().top + window.scrollY - 40, behavior: "instant" }); });
  const heights = new Set();
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(900);
    heights.add(Math.round(await p.evaluate(() => document.getElementById("leaderboard").getBoundingClientRect().height)));
    if (i % 4 === 1) await (await p.$("#leaderboard")).screenshot({ path: `qa/shots/p5/lb-${label}-${i}.png` });
  }
  console.log(label, "heights", [...heights].join(","), "overflow", await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  await p.close();
}
await b.close();
