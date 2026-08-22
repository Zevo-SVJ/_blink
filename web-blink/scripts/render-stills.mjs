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

/* The beats worth looking at, named. Derived from the edit so a moment that
   moves is still photographed at the same point in its own life. */
const { MOMENTS } = await import("../src/remotion/timeline.ts").catch(() => ({}));

const frames = process.env.FRAMES
  ? process.env.FRAMES.split(",").map((f) => ({ frame: Number(f), name: `f${f}` }))
  : defaultBeats(composition.durationInFrames);

function defaultBeats(total) {
  // Head, a third in, and the tail of every moment, plus the true first and
  // last frames — the two that a thumbnail and a loop are taken from.
  const beats = [];
  for (const m of MOMENTS ?? []) {
    beats.push({ frame: m.from, name: `${m.id}-in` });
    beats.push({ frame: m.from + Math.floor(m.duration * 0.55), name: `${m.id}-mid` });
  }
  beats.push({ frame: total - 1, name: "last" });
  return beats.filter((b) => b.frame >= 0 && b.frame < total);
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

/* Contact sheets, one per act, so pacing can be read and not just frames. */
const { ACTS } = await import("../src/remotion/timeline.ts");
const sheets = ACTS.map((act) => ({
  ...act,
  shots: written.filter((w) => w.frame >= act.from && w.frame < act.to),
}));

for (const sheet of sheets) {
  if (!sheet.shots.length) continue;
  const html = `<!doctype html><meta charset="utf-8">
<body style="margin:0;background:#0b0f1a;display:inline-flex;gap:12px;padding:16px;font:12px system-ui">
${sheet.shots
  .map(
    (s) => `<figure style="margin:0">
<figcaption style="color:#7fa;padding-bottom:5px">f${s.frame} · ${s.name}</figcaption>
<img src="data:image/png;base64,${fs.readFileSync(s.file).toString("base64")}" style="width:186px;display:block;border-radius:9px">
</figure>`,
  )
  .join("")}
</body>`;
  fs.writeFileSync(path.join(OUT, `sheet${TAG}-${sheet.id}.html`), html);
}
console.log(`Contact sheets: ${sheets.map((s) => `sheet${TAG}-${s.id}.html`).join(", ")}`);
