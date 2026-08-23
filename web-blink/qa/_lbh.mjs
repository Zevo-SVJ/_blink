import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); } });
await p.evaluate(() => { const e = document.getElementById("leaderboard"); window.scrollTo({ top: e.getBoundingClientRect().top + window.scrollY - 40, behavior: "instant" }); });
for (let i = 0; i < 14; i++) {
  await p.waitForTimeout(800);
  const d = await p.evaluate(() => {
    const s = document.getElementById("leaderboard");
    const grid = s.firstElementChild;
    const board = grid.children[1];
    return { sec: Math.round(s.getBoundingClientRect().height), parts: [...board.children].map(c => c.className.slice(0,26) + ':' + Math.round(c.getBoundingClientRect().height)) };
  });
  console.log(i, d.sec, JSON.stringify(d.parts));
}
await b.close();
