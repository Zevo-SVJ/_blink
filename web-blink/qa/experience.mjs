/**
 * The interactive experience, in the page it ships in.
 *
 * It replaced a video, so the things worth checking changed: not whether a
 * file plays, but whether the sequence actually advances as you scroll,
 * whether the profile stays put while the reading of it changes, whether the
 * gaze is genuinely interactive, and whether the whole stage fits inside the
 * viewport it is pinned to — at every width, phones first.
 *
 *   APP_URL=http://127.0.0.1:4173 node qa/experience.mjs
 */
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

const WIDTHS = [
  ["360", 360, 740],
  ["390", 390, 844],
  ["768", 768, 1024],
  ["1280", 1280, 900],
];

const browser = await chromium.launch();

/** Scrolls to a fraction of the section's pinned travel. */
async function seek(page, k) {
  await page.evaluate((frac) => {
    const s = document.querySelector("#experience");
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    window.scrollTo({ top: top + (r.height - window.innerHeight) * frac, behavior: "instant" });
  }, k);
  await page.waitForTimeout(650);
}

for (const [label, w, h] of WIDTHS) {
  console.log(`\n=== ${label}px ===`);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(APP + "/", { waitUntil: "load" });
  await page.waitForTimeout(700);

  if (!(await page.locator("#experience").count())) {
    bad(`${label}: no experience section`);
    await page.close();
    continue;
  }

  /* It fits the screen it is pinned to. The whole thing is one stage, so
     anything hanging off the top or bottom is content nobody can reach. */
  await seek(page, 0.62);
  const fit = await page.evaluate(() => {
    const inner = document.querySelector("#experience > div").firstElementChild;
    const r = inner.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight };
  });
  if (fit.top >= 0 && fit.bottom <= fit.vh) {
    ok(`${label}: the stage fits (${fit.top}→${fit.bottom} of ${fit.vh})`);
  } else {
    bad(`${label}: the stage overflows its viewport (${fit.top}→${fit.bottom} of ${fit.vh})`);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  if (overflow <= 0) ok(`${label}: no horizontal overflow`);
  else bad(`${label}: ${overflow}px of horizontal overflow`);

  /* The profile is placed once and does not move again. That is the claim the
     whole section makes, so it is the one worth asserting. */
  const at = async () => {
    const b = await page.locator("#experience [class*='max-w-']").first().boundingBox();
    return b ? { x: Math.round(b.x), y: Math.round(b.y) } : null;
  };
  await seek(page, 0.5);
  const before = await at();
  await seek(page, 0.9);
  const after = await at();
  if (before && after && Math.abs(before.x - after.x) <= 2 && Math.abs(before.y - after.y) <= 6) {
    ok(`${label}: the profile stays put while the reading changes`);
  } else {
    bad(`${label}: the profile moved ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  }

  /* The sequence advances. Different acts, different captions. */
  const caption = async () => (await page.locator("#experience h2").first().textContent())?.trim();
  await seek(page, 0.05);
  const early = await caption();
  await seek(page, 0.9);
  const late = await caption();
  if (early && late && early !== late) ok(`${label}: the sequence advances ("${early}" → "${late}")`);
  else bad(`${label}: the caption never changed ("${early}")`);

  /* The score is a conclusion, and it resolves. */
  const score = await page.locator("#experience").getByText(/^\d\.\d$/).first().textContent()
    .catch(() => null);
  if (score) ok(`${label}: the score resolves (${score})`);
  else bad(`${label}: no score at the end of the sequence`);

  await page.close();
}

/* Who's looking is an interaction, not a slideshow. */
{
  console.log("\n=== who's looking ===");
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(APP + "/", { waitUntil: "load" });
  await page.waitForTimeout(700);
  await seek(page, 0.62);

  const reads = async () =>
    page.locator("#experience li span:last-child").allTextContents();
  const first = await reads();

  await page.getByRole("tab", { name: /professional|professionnel/i }).click();
  await page.waitForTimeout(900);
  const second = await reads();

  if (first.length && second.length && first.join() !== second.join()) {
    ok(`changing the gaze re-reads the profile (${first[0]} → ${second[0]})`);
  } else {
    bad(`the readings did not change: ${first.join()} / ${second.join()}`);
  }

  /* Shared readings must survive the change — that is what makes it a
     re-ranking of the same profile rather than a different screen. */
  const shared = first.filter((r) => second.includes(r));
  if (shared.length) ok(`${shared.length} reading(s) carried across and re-ranked (${shared.join(", ")})`);
  else bad("no reading survived the change — this is a replacement, not a re-reading");

  const selected = await page.getByRole("tab", { selected: true }).textContent();
  if (/professional|professionnel/i.test(selected ?? "")) ok("the selector reports its state to assistive tech");
  else bad(`aria-selected is on "${selected}"`);

  await page.close();
}

/* Reduced motion: the sequence must still be readable. */
{
  console.log("\n=== reduced motion ===");
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await page.goto(APP + "/", { waitUntil: "load" });
  await page.waitForTimeout(700);
  await seek(page, 0.9);
  const text = (await page.locator("#experience").textContent()) ?? "";
  if (/8\.7/.test(text)) ok("the score still resolves without motion");
  else bad("the end of the sequence is unreachable under reduced motion");
  await page.close();
}

console.log("\nPROBLEMS: " + (problems.length ? "\n  - " + problems.join("\n  - ") : "none"));
await browser.close();
process.exit(problems.length ? 1 : 0);
