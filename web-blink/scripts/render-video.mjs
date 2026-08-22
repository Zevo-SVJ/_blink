/**
 * Renders the film to MP4.
 *
 * Two outputs per language, because they have different jobs:
 *
 *  - **`blink-ad-<lang>.mp4`** — 1080×1920, the deliverable. This is what gets
 *    uploaded to TikTok and Reels.
 *  - **`blink-ad-<lang>-web.mp4`** — 720×1280, what the landing page plays. A
 *    portrait video on a landing page is displayed at about 390px wide, so
 *    shipping the full-resolution master would be several megabytes for
 *    pixels no visitor's browser will ever address.
 *
 * The web cut is also rendered silent. It autoplays in a page, and autoplay
 * with sound is blocked by every browser — carrying an audio track that can
 * never be heard is bytes for nothing. The full-size cut keeps the mix.
 *
 *   node scripts/render-video.mjs           # both languages, both sizes
 *   LANG_FILM=fr node scripts/render-video.mjs
 *   ONLY=master node scripts/render-video.mjs
 */

import fs from "node:fs";
import path from "node:path";

import { bundle } from "@remotion/bundler";

import { webpackOverride } from "./webpack-override.mjs";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const LANGS = process.env.LANG_FILM ? [process.env.LANG_FILM] : ["fr", "en"];
const ONLY = process.env.ONLY;

const MASTERS = path.join(process.cwd(), "video");
const WEB = path.join(process.cwd(), "public", "video");
fs.mkdirSync(MASTERS, { recursive: true });
fs.mkdirSync(WEB, { recursive: true });

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

const CUTS = [
  {
    key: "master",
    dir: MASTERS,
    suffix: "",
    ext: "mp4",
    codec: "h264",
    scale: 1,
    silent: false,
    crf: 18,
  },
  {
    key: "web",
    dir: WEB,
    suffix: "-web",
    ext: "mp4",
    codec: "h264",
    // 720×1280 from a 1080×1920 composition.
    scale: 2 / 3,
    // Carries the mix. The page gives the viewer real controls, so the
    // sound has to be there to un-mute — a silent file would make the
    // volume button a lie.
    silent: false,
    crf: 26,
  },
  {
    /*
      VP9, offered first.

      Not a fallback — the preferred cut. On this material VP9 is roughly a
      third smaller than H.264 at the same quality, and every browser that
      autoplays video in a landing page supports it. The MP4 stays as the
      second `<source>` for Safari, which only picked up VP9 recently and
      still prefers H.264 in hardware.
    */
    key: "webm",
    dir: WEB,
    suffix: "-web",
    ext: "webm",
    codec: "vp9",
    scale: 2 / 3,
    silent: false,
    crf: 46,
  },
];

for (const lang of LANGS) {
  const composition = await selectComposition({
    serveUrl,
    id: `BlinkAd-${lang}`,
    inputProps: {},
    ...BROWSER,
  });

  for (const cut of CUTS) {
    if (ONLY && ONLY !== cut.key) continue;

    const out = path.join(cut.dir, `blink-ad-${lang}${cut.suffix}.${cut.ext}`);
    let last = -1;

    console.log(`\n${lang} · ${cut.key} → ${path.relative(process.cwd(), out)}`);
    await renderMedia({
      composition,
      serveUrl,
      codec: cut.codec,
      outputLocation: out,
      inputProps: { lang, silent: cut.silent },
      scale: cut.scale,
      crf: cut.crf,
      // Faster preset costs a few percent of size on flat colour and saves
      // minutes of wall clock on every iteration of the edit. VP9 has no
      // x264 preset.
      ...(cut.codec === "h264" ? { x264Preset: "medium" } : {}),
      // `muted` drops the stream; `audioCodec: null` alone still muxed a
      // silent AAC track, which was eight hundred kilobytes of nothing on a
      // file the landing page autoplays muted anyway.
      muted: cut.silent,
      /* WebM cannot carry AAC — VP9 pairs with Opus. Getting this wrong is
         not a quality difference, it is a hard failure at the mux. */
      ...(cut.silent
        ? {}
        : { audioCodec: cut.codec === "vp9" ? "opus" : "aac" }),
      overwrite: true,
      ...BROWSER,
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct >= last + 10) {
          last = pct;
          process.stdout.write(` ${pct}%`);
        }
      },
    });

    const kb = fs.statSync(out).size / 1024;
    console.log(`\n  ${kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`}`);
  }
}

/*
  Poster frames.

  The landing reserves the film's box by aspect ratio, so the space is already
  correct before the file arrives — but an empty box is a black rectangle for
  as long as the network takes. The poster is the film's own frame two, which
  means the section looks like the film from first paint and the swap to
  playback is invisible.

  Frame two rather than frame zero because frame zero is mid-slam: the card is
  still oversized and cropped, and a poster is a still that will be looked at
  for a second, not a sixtieth.
*/
for (const lang of LANGS) {
  const composition = await selectComposition({
    serveUrl,
    id: `BlinkAd-${lang}`,
    inputProps: {},
    ...BROWSER,
  });

  const out = path.join(WEB, `blink-ad-${lang}-poster.jpg`);
  await renderStill({
    composition,
    serveUrl,
    output: out,
    frame: 2,
    inputProps: { lang, silent: true },
    imageFormat: "jpeg",
    jpegQuality: 82,
    scale: 2 / 3,
    overwrite: true,
    ...BROWSER,
  });
  console.log(`poster ${lang}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

console.log("\nDone.");
