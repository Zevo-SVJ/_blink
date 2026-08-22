/**
 * Renders stills across the whole film and lays them out as contact sheets.
 *
 * This is the review tool. A twenty-one second ad has beats that exist for six
 * frames, and playing it back is how those go unexamined — you register that
 * something happened, not what it looked like. Every frame is addressable, so
 * this asks for the ones that matter and photographs them.
 *
 *   node scripts/render-stills.mjs                 # every act, key beats
 *   FRAMES=0,20,48 node scripts/render-stills.mjs  # just these
 *   LANG=en node scripts/render-stills.mjs
 */

import fs from "node:fs";
import path from "node:path";

import { bundle } from "@remotion/bundler";

import { webpackOverride } from "./webpack-override.mjs";
import { renderStill, selectComposition } from "@remotion/renderer";

const LANG = process.env.LANG_FILM === "en" ? "en" : "fr";
const OUT = path.join(process.cwd(), "qa", "film");
const TAG = LANG === "en" ? "-en" : "";

fs.mkdirSync(OUT, { recursive: true });

/**
 * Which browser renders the frames.
 *
 * Remotion downloads its own Chrome Headless Shell on first use, and this
 * container's egress allowlist blocks that host. There is already a Chromium
 * here for Playwright, and Remotion is happy to drive any recent Chrome, so it
 * is pointed at that instead of at a download that cannot happen.
 */
const CHROME =
  process.env.REMOTION_CHROME ??
  // `chrome-headless-shell`, not `chrome`: Remotion launches with the old
  // `--headless` flag, which the full binary removed. The shell is the
  // standalone implementation of exactly that mode, and Playwright already
  // installed one here.
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const BROWSER = {
  ...(fs.existsSync(CHROME) ? { browserExecutable: CHROME } : {}),
  // Remotion prints a memory report per chunk, which buries the render's own
  // progress under a hundred lines of cgroup arithmetic.
  logLevel: "error",
};


console.log("Bundling …");
const serveUrl = await bundle({
  entryPoint: path.join(process.cwd(), "src", "remotion", "index.ts"),
  webpackOverride,
  onProgress: () => {},
});

const composition = await selectComposition({
  serveUrl,
  id: `BlinkAd-${LANG}`,
  inputProps: {},
  ...BROWSER,
});

console.log(
  `Composition: ${composition.width}×${composition.height}, ` +
    `${composition.durationInFrames} frames @ ${composition.fps}fps ` +
    `(${(composition.durationInFrames / composition.fps).toFixed(1)}s)`,
);

/* The beats worth looking at, named. Derived from the edit, so a beat that
   moves is still photographed at the same point in its own life. */
const T = await import("../src/remotion/timeline.ts");

const frames = process.env.FRAMES
  ? process.env.FRAMES.split(",").map((f) => ({ frame: Number(f), name: `f${f}` }))
  : defaultBeats(composition.durationInFrames);

function defaultBeats(total) {
  const beats = [];

  // Every named beat in the edit, plus a frame a few after it so both the
  // arrival and the settle are on record — a spring looks completely
  // different at its peak and at rest.
  const named = [
    ...T.HOOK_BEATS.map((f, i) => [f, `hook${i + 1}`]),
    [T.WHIP, "whip"],
    [T.PROFILE_IN, "profile"],
    [T.EYE_IN, "eye"],
    [T.SCAN_FROM, "laser-start"],
    [Math.round((T.SCAN_FROM + T.SCAN_TO) / 2), "laser-mid"],
    [T.SCAN_TO, "laser-end"],
    ...T.TAG_BEATS.map((f, i) => [f, `tag${i + 1}`]),
    [T.GLITCH, "glitch"],
    [T.FLAG_WORD, "flag-word"],
    [T.GAUGE_FROM, "gauge-start"],
    [T.GAUGE_TO, "gauge-full"],
    [T.TYPE_FROM, "typing"],
    [T.PRESS, "press"],
    [T.SLOGAN, "slogan"],
  ];

  for (const [f, name] of named) {
    beats.push({ frame: f, name });
    beats.push({ frame: f + 5, name: `${name}+5` });
  }

  // The head and tail of every scene, and the true last frame — the one a
  // loop cuts back from.
  for (const scene of T.SCENES) {
    beats.push({ frame: scene.from + scene.duration - 2, name: `${scene.id}-out` });
  }
  beats.push({ frame: total - 1, name: "last" });

  // Deduplicate by frame, keeping the first name, and sort.
  const seen = new Map();
  for (const b of beats) {
    if (b.frame >= 0 && b.frame < total && !seen.has(b.frame)) seen.set(b.frame, b);
  }
  return [...seen.values()].sort((a, b) => a.frame - b.frame);
}

console.log(`Rendering ${frames.length} stills …`);
const written = [];

for (const beat of frames) {
  const file = path.join(
    OUT,
    `${String(beat.frame).padStart(3, "0")}${TAG}-${beat.name}.png`,
  );
  await renderStill({
    composition,
    serveUrl,
    output: file,
    frame: beat.frame,
    inputProps: { lang: LANG, silent: true },
    imageFormat: "png",
    // Half size: a contact sheet is read at a glance, and 1080×1920 stills
    // are slow to write and slower to look at.
    scale: 0.5,
    overwrite: true,
    ...BROWSER,
  });
  written.push({ ...beat, file });
  process.stdout.write(".");
}

console.log(`\n${written.length} stills in qa/film/`);

/* Contact sheets, one per scene, so pacing can be read and not just frames. */
const sheets = T.SCENES.map((scene) => ({
  id: scene.id,
  shots: written.filter(
    (w) => w.frame >= scene.from && w.frame < scene.from + scene.duration,
  ),
}));

for (const sheet of sheets) {
  if (!sheet.shots.length) continue;
  const html = `<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#0b0f1a;display:inline-flex;gap:10px;padding:14px;font:11px system-ui">
${sheet.shots
  .map(
    (s) => `<figure style="margin:0">
<figcaption style="color:#7fa;padding-bottom:4px">f${s.frame} · ${s.name}</figcaption>
<img src="data:image/png;base64,${fs.readFileSync(s.file).toString("base64")}" style="width:150px;display:block;border-radius:8px">
</figure>`,
  )
  .join("")}
</body>`;
  fs.writeFileSync(path.join(OUT, `sheet${TAG}-${sheet.id}.html`), html);
}
console.log(`Contact sheets: ${sheets.map((s) => `sheet${TAG}-${s.id}.html`).join(", ")}`);
