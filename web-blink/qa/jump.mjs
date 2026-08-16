/**
 * The landing scroll jump.
 *
 * Parks the reader inside How It Works and samples scrollY together with the
 * document height, so a jump can be attributed: if the document shrinks in the
 * same window the scroll moves, the animation is resizing the page.
 */
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:8080";
const b = await chromium.launch();
for (const [label, w, h] of [["mobile", 390, 844], ["desktop", 1280, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await p.evaluate(() => {
    const el = document.getElementById("how-it-works");
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 80, behavior: "instant" });
  });
  await p.waitForTimeout(700);
  const s = await p.evaluate(() => new Promise((res) => {
    const out = []; let n = 0;
    const id = setInterval(() => {
      out.push({ y: Math.round(scrollY), docH: document.documentElement.scrollHeight,
        sectH: Math.round(document.getElementById("how-it-works").getBoundingClientRect().height) });
      if (++n >= 80) { clearInterval(id); res(out); }
    }, 120);
  }));
  const ys = s.map((x) => x.y);
  let worst = 0;
  for (let i = 1; i < ys.length; i++) if (Math.abs(ys[i] - ys[i - 1]) > Math.abs(worst)) worst = ys[i] - ys[i - 1];
  console.log(`\n== ${label} (${w}px) ==`);
  console.log(`  worst scroll delta : ${worst}px`);
  console.log(`  document heights   : ${[...new Set(s.map((x) => x.docH))].join(", ")}`);
  console.log(`  section heights    : ${[...new Set(s.map((x) => x.sectH))].join(", ")}`);
  await ctx.close();
}
await b.close();
