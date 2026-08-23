/**
 * The deployed landing, tested the way a first-time visitor meets it:
 * hard navigation, cache disabled, throttled network and CPU.
 */
import { chromium } from "playwright";
import fs from "node:fs";
const URL = process.env.URL ?? "https://blink-ig.rork.app/";
const OUT = process.env.QA_OUT ?? "qa/shots/livehard";
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const problems = []; const bad = s => { problems.push(s); console.log("  ✗ " + s); };
const ok = s => console.log("  ✓ " + s);
const b = await chromium.launch();

for (const [label, w, h] of [["mobile", 390, 844], ["desktop", 1280, 900]]) {
  // A brand-new context every time = cold cache, cold storage.
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false,
    downloadThroughput: 1.6*1024*1024/8, uploadThroughput: 750*1024/8, latency: 150 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const errs = []; p.on("pageerror", e => errs.push(String(e)));
  p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });

  const t0 = Date.now(); const log = [];
  const tick = setInterval(async () => {
    const t = Date.now() - t0; if (t > 3000) return;
    try {
      await p.screenshot({ path: `${OUT}/${label}-${String(t).padStart(4,"0")}.png` });
      log.push({ t, ...(await p.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        navbar: !!document.querySelector("header") || !!document.querySelector("nav"),
        cta: !!document.querySelector('a[href="/analyze"]'),
        txt: (document.querySelector("h1")?.textContent ?? "").replace(/\s+/g," ").trim().slice(0,30),
        docH: document.documentElement.scrollHeight,
        y: Math.round(scrollY),
      }))) });
    } catch {}
  }, 150);

  await p.goto(URL, { waitUntil: "load" });
  await p.waitForTimeout(3400);
  clearInterval(tick);

  const paints = await p.evaluate(() => performance.getEntriesByType("paint").map(e => `${e.name}=${Math.round(e.startTime)}ms`));
  const nav = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return n ? Math.round(n.responseEnd) : null; });
  console.log(`\n== ${label} (${w}px) hard load, cache disabled, Fast 3G + 4x CPU ==`);
  console.log("  paint:", paints.join("  "), "| html done:", nav + "ms");
  const first = log.find(s => s.h1 > 0);
  const firstCta = log.find(s => s.cta);
  console.log(`  first <h1>     : ${first ? first.t + "ms" : "never"} "${first?.txt ?? ""}"`);
  console.log(`  real CTA <a>   : ${firstCta ? firstCta.t + "ms" : "never"}`);
  console.log(`  navbar         : ${log.find(s => s.navbar) ? log.find(s => s.navbar).t + "ms" : "never"}`);
  const heights = [...new Set(log.map(s => s.docH))];
  console.log(`  doc heights    : ${heights.join(" → ")}`);
  if (log.filter(s => s.h1 > 1).length) bad(`${label}: duplicate hero in ${log.filter(s=>s.h1>1).length} frames`);
  else ok("never more than one hero");
  if (!first || first.t > 900) bad(`${label}: hero took ${first?.t ?? "∞"}ms`);
  else ok(`hero at ${first.t}ms`);
  if (heights.length > 2) bad(`${label}: document height moved ${heights.join("→")}`);
  else ok("document height stable");
  if (log.some(s => s.y !== 0)) bad(`${label}: page scrolled itself`);
  else ok("no self-scroll");
  if (errs.length) bad(`${label}: console errors → ${[...new Set(errs)].slice(0,2).join(" | ")}`);
  else ok("no console errors");
  await ctx.close();
}
await b.close();
console.log("\nPROBLEMS:", problems.length ? problems.join(" | ") : "none");
