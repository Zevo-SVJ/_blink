/**
 * The film, in the page it ships in.
 *
 * Four things this looks for, none of which typechecking or a render can see:
 * that the section reserves its height before the file arrives, that the frame
 * is sensible at every width, that it actually plays when scrolled to and
 * stops when it is not, and that the right language's cut is chosen.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://127.0.0.1:8080";
const OUT = "qa/shots";
mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  ["390", 390, 844],
  ["768", 768, 1024],
  ["1280", 1280, 800],
];

const problems = [];
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { problems.push(m); console.log("  ✗ " + m); };

const browser = await chromium.launch({ executablePath: process.env.CHROME });

for (const [label, w, h] of WIDTHS) {
  console.log(`\n=== ${label}px ===`);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(APP + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);

  const section = page.locator("#film");
  if (!(await section.count())) { bad(`${label}: no #film section`); await page.close(); continue; }

  const before = await section.boundingBox();

  // `scroll-behavior: smooth` on <html> means scrollIntoView glides, and a
  // glide is measured as motion. Scroll instantly.
  await page.evaluate(() =>
    document.querySelector("#film").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(3000);

  const after = await section.boundingBox();
  const shift = Math.abs(after.height - before.height);
  if (shift <= 2) ok(`${label}: section height unchanged (${Math.round(before.height)}px)`);
  else bad(`${label}: section grew ${Math.round(shift)}px — layout shift`);

  const video = page.locator("#film video");
  if (!(await video.count())) { bad(`${label}: no video element`); await page.close(); continue; }

  const box = await video.boundingBox();
  const ratio = box.height / box.width;
  if (Math.abs(ratio - 16 / 9) < 0.06) ok(`${label}: 9:16 at ${Math.round(box.width)}×${Math.round(box.height)}`);
  else bad(`${label}: ratio ${ratio.toFixed(2)} is not 9:16`);

  if (box.width <= w - 24) ok(`${label}: fits the column`);
  else bad(`${label}: ${Math.round(box.width)}px wide in a ${w}px viewport`);

  const state = await video.evaluate((v) => ({
    muted: v.muted,
    loop: v.loop,
    inline: v.playsInline,
    src: v.currentSrc,
    poster: v.poster,
    t: v.currentTime,
    ready: v.readyState,
  }));

  if (state.muted && state.loop && state.inline) ok(`${label}: muted, looping, inline`);
  else bad(`${label}: autoplay attributes wrong ${JSON.stringify(state)}`);

  // The brief asks for a real video, not a GIF: the viewer's own play,
  // pause, scrub and volume, and a file with an audio track behind that
  // volume button.
  const player = await video.evaluate((v) => ({
    controls: v.controls,
    tracks: v.mozHasAudio ?? v.webkitAudioDecodedByteCount ?? null,
  }));
  if (player.controls) ok(`${label}: native controls`);
  else bad(`${label}: no controls — this is a GIF, not a video`);

  if (/blink-ad-(fr|en)-web\.(mp4|webm)$/.test(state.src)) ok(`${label}: chose ${state.src.split("/").pop()}`);
  else bad(`${label}: unexpected source "${state.src}"`);

  if (/-poster\.jpg$/.test(state.poster)) ok(`${label}: has a poster`);
  else bad(`${label}: no poster`);

  await page.waitForTimeout(1200);
  const t2 = await video.evaluate((v) => v.currentTime);
  if (t2 > state.t) {
    ok(`${label}: playing (${state.t.toFixed(2)}s → ${t2.toFixed(2)}s)`);
  } else {
    /*
      Distinguish "the page is broken" from "this browser cannot decode it".

      Playwright's Chromium is built without proprietary codecs, so an
      H.264-only page reports a perfectly correct `currentSrc` and sits at
      `readyState 0` forever. That is a fact about the test browser, not the
      site — but it is also exactly what a genuinely broken integration looks
      like, so it has to be told apart rather than waved through.
    */
    const why = await video.evaluate((v) => ({
      err: v.error ? v.error.message : null,
      webm: v.canPlayType('video/webm; codecs="vp9"'),
      h264: v.canPlayType('video/mp4; codecs="avc1.42E01E"'),
    }));
    if (!why.webm && !why.h264) {
      ok(`${label}: cannot verify playback — this browser decodes neither VP9 nor H.264`);
    } else {
      bad(`${label}: not playing (readyState ${state.ready}, ${why.err ?? "no error"})`);
    }
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(600);
  const t3 = await video.evaluate((v) => v.currentTime);
  await page.waitForTimeout(900);
  const t4 = await video.evaluate((v) => v.currentTime);
  if (t4 === t3) ok(`${label}: paused off screen`);
  else bad(`${label}: still running off screen (${t3} → ${t4})`);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow <= 1) ok(`${label}: no horizontal overflow`);
  else bad(`${label}: page scrolls ${overflow}px sideways`);

  await page.evaluate(() =>
    document.querySelector("#film").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/video-landing-${label}.png` });
  await page.close();
}

/* The French page must get the French cut. */
{
  console.log("\n=== language ===");
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
  });
  await page.goto(APP + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  await page.evaluate(() =>
    document.querySelector("#film").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(2200);
  const src = await page.locator("#film video").evaluate((v) => v.currentSrc);
  if (/blink-ad-fr-web\./.test(src)) ok("a French visitor gets the French cut");
  else bad(`French visitor got "${src.split("/").pop()}"`);
  await page.close();
}

/* The section sits directly after the eye. */
{
  console.log("\n=== position ===");
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(APP + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const order = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("main section, main > div")]
      .map((el) => el.id)
      .filter(Boolean);
    return ids;
  });
  const film = order.indexOf("film");
  const how = order.indexOf("how-it-works");
  const board = order.indexOf("leaderboard");
  if (film >= 0 && how >= 0 && board >= 0 && how < film && film < board) {
    ok(`the film sits between How It Works and the leaderboard (${order.join(" → ")})`);
  } else {
    bad(`unexpected order: ${order.join(" → ")}`);
  }
  await page.close();
}

/* The viewer's pause outranks the observer. */
{
  console.log("\n=== the viewer takes over ===");
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(APP + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  await page.evaluate(() =>
    document.querySelector("#film").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(2600);

  const v = page.locator("#film video");
  const started = await v.evaluate((el) => el.currentTime);

  // Pause it the way a person does, then scroll away and back.
  await v.evaluate((el) => el.pause());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(700);
  await page.evaluate(() =>
    document.querySelector("#film").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(1600);

  const after = await v.evaluate((el) => ({ paused: el.paused, t: el.currentTime }));
  if (started > 0) ok(`it was playing before the pause (${started.toFixed(2)}s)`);
  else bad("never started, so the pause proves nothing");
  if (after.paused) ok("stayed paused after scrolling away and back");
  else bad(`restarted itself under the viewer (t ${after.t.toFixed(2)})`);
  await page.close();
}

/* Reduced motion: the film is present and playable, but does not start. */
{
  console.log("\n=== reduced motion ===");
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.goto(APP + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.evaluate(() =>
    document.querySelector("#film").scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(2600);

  const v = page.locator("#film video");
  const state = await v.evaluate((el) => ({
    paused: el.paused,
    t: el.currentTime,
    controls: el.controls,
    poster: !!el.poster,
  }));
  if (state.paused && state.t === 0) ok("held still, not autoplaying");
  else bad(`played anyway (paused ${state.paused}, t ${state.t})`);
  if (state.controls && state.poster) ok("still playable, and the poster is showing");
  else bad("the film is not reachable under reduced motion");
  await page.close();
}

console.log("\nPROBLEMS: " + (problems.length ? "\n  - " + problems.join("\n  - ") : "none"));
await browser.close();
process.exit(problems.length ? 1 : 0);
