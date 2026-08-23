import { chromium } from "playwright";
const b = await chromium.launch();
for (const [label, w, h] of [["390", 390, 844], ["1280", 1280, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); } });
  await p.evaluate(() => { const e = document.getElementById("how-it-works"); window.scrollTo({ top: e.getBoundingClientRect().top + window.scrollY - 40, behavior: "instant" }); });
  await p.waitForTimeout(700);
  const tabs = await p.$$('#how-it-works [role="tab"]');
  for (let i = 0; i < tabs.length; i++) {
    await tabs[i].click();
    await p.waitForTimeout(i === 3 ? 1500 : 900);
    await (await p.$("#how-it-works")).screenshot({ path: `qa/shots/p5/hiw-${label}-${i}.png` });
  }
  // does the section change height between steps?
  const heights = [];
  for (let i = 0; i < tabs.length; i++) { await tabs[i].click(); await p.waitForTimeout(700); heights.push(await p.evaluate(() => document.getElementById("how-it-works").getBoundingClientRect().height)); }
  console.log(label, "heights", heights.join(","), "overflow", await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  await p.close();
}
await b.close();
