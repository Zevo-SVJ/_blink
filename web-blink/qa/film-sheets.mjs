/**
 * Photographs the contact sheets that `scripts/render-stills.mjs` writes.
 *
 * The sheets are HTML so they can be opened in a browser, which is no use
 * when the review is happening over a terminal. This renders each one to a
 * PNG so a whole scene can be read in a single image — which is the only way
 * pacing is visible at all.
 *
 *   node scripts/render-stills.mjs && node qa/film-sheets.mjs qa/sheets
 */

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const dir = path.resolve("qa/film");
const out = path.resolve(process.argv[2] ?? "qa/sheets");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 500 },
  deviceScaleFactor: 2,
});

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  await page.goto(`file://${path.join(dir, file)}`);
  const body = await page.$("body");
  await body.screenshot({ path: path.join(out, file.replace(".html", ".png")) });
  console.log(file);
}

await browser.close();
