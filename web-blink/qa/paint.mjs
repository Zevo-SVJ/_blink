/**
 * Blink — is the first thing painted the *real* landing?
 *
 * The rule this guards: no placeholder hero, no fake CTA, no masking page that
 * gets swapped for the real one once the bundle arrives. The landing is
 * prerendered at build time, so the first paint must already be the page —
 * same headline, same button, same height — and hydration must not move it.
 *
 * What is measured, under 4x CPU throttling and a slow connection:
 *
 *  - **FCP / LCP** — when anything, and when the largest thing, painted.
 *  - **The hero at first paint** — the real headline present in the HTML the
 *    server sent, before any script ran.
 *  - **Layout shift** — cumulative, across hydration. A prerendered page that
 *    reflows when React adopts it is a masking page with extra steps.
 *  - **Document height** — sampled before and after hydration. The landing's
 *    animations must not change the page's height, which is what used to yank
 *    a reader upward mid-scroll.
 *
 *   node qa/paint.mjs
 */

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";

const problems = [];
const bad = (s) => { problems.push(s); console.log("  ✗ " + s); };
const ok = (s) => console.log("  ✓ " + s);

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);

for (const [device, viewport] of [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1280, height: 900 }],
]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();

  // Fast-3G-ish, with the CPU handicapped the way a mid-range phone is. This
  // is the condition the prerender exists for; on a fast desktop every
  // approach looks identical.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  console.log(`\n=== ${device} ===`);

  // The bytes the server sent, before any script could run.
  const html = await (await page.request.get(BASE)).text();
  const heroInHtml = html.includes("See yourself the way");
  const ctaInHtml = html.includes("See my first impression");
  if (!heroInHtml) bad("the served HTML does not contain the real hero");
  if (!ctaInHtml) bad("the served HTML does not contain the real CTA");
  if (heroInHtml && ctaInHtml) ok("hero and CTA are in the HTML itself");

  await page.goto(BASE, { waitUntil: "domcontentloaded" });

  const heightAtPaint = await page.evaluate(() => document.body.scrollHeight);

  // Let hydration finish and the entrance animations settle.
  await page.waitForTimeout(3500);

  const metrics = await page.evaluate(() => {
    const paints = performance.getEntriesByType("paint");
    const lcp = performance.getEntriesByType("largest-contentful-paint").at(-1);
    return {
      fcp: paints.find((p) => p.name === "first-contentful-paint")?.startTime ?? null,
      lcp: lcp?.startTime ?? null,
      height: document.body.scrollHeight,
      heroVisible: !!document.querySelector("h1"),
      ctaClickable: Array.from(document.querySelectorAll("a,button")).some((el) =>
        /See my first impression|Voir ma première impression/.test(el.textContent ?? ""),
      ),
    };
  });

  const cls = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(total), 400);
      }),
  );

  if (metrics.fcp === null) bad("no first-contentful-paint recorded");
  else if (metrics.fcp > 2000) bad(`FCP ${Math.round(metrics.fcp)}ms (over 2000ms)`);
  else ok(`FCP ${Math.round(metrics.fcp)}ms`);

  if (metrics.lcp !== null) {
    if (metrics.lcp > 2500) bad(`LCP ${Math.round(metrics.lcp)}ms (over 2500ms)`);
    else ok(`LCP ${Math.round(metrics.lcp)}ms`);
  }

  if (!metrics.heroVisible) bad("no <h1> after hydration");
  if (!metrics.ctaClickable) bad("the real CTA is not present after hydration");
  else ok("real CTA present and interactive");

  // The landing's own performance rule: hydration and the animations must not
  // change the document's height.
  const drift = Math.abs(metrics.height - heightAtPaint);
  if (drift > 24) {
    bad(`document height moved ${drift}px between first paint and settled (${heightAtPaint} → ${metrics.height})`);
  } else {
    ok(`document height stable (${heightAtPaint} → ${metrics.height})`);
  }

  if (cls > 0.1) bad(`cumulative layout shift ${cls.toFixed(3)} (over 0.1)`);
  else ok(`cumulative layout shift ${cls.toFixed(3)}`);

  await ctx.close();
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS (${problems.length})` : "\nPROBLEMS: none");
process.exit(problems.length ? 1 : 0);
