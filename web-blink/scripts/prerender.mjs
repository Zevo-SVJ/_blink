/**
 * Render the real landing page into dist/index.html at build time.
 *
 * Runs after both Vite builds:
 *
 *   1. the client build, which produces dist/ and its hashed assets
 *   2. the SSR build, which produces dist-ssr/entry-server.js
 *
 * It imports the SSR bundle, renders each route below to a string, and writes
 * the result inside `<div id="root">`. Nothing else in the HTML changes, so
 * the script tags, preloads and meta tags Vite generated stay exactly as they
 * were and the client bundle still boots normally — it just finds the page
 * already there and hydrates it.
 *
 * Only routes whose first paint does not depend on a signed-in session are
 * prerendered. `/analyze` and everything behind auth render differently per
 * user, and shipping one visitor's shell to everyone would be both wrong and
 * a privacy problem; those keep the empty `#root` and `createRoot`.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

/**
 * Route → output file.
 *
 * Only the landing. It is the route with the problem, the one nearly every
 * visitor sees first, and the only one whose component is in the initial
 * bundle rather than behind `lazy()`.
 *
 * The legal pages were tried here too and are deliberately not included:
 * `renderToString` does not wait for lazy chunks, so they rendered their
 * Suspense fallback — a background and nothing else. Shipping that would
 * recreate the exact bug this build removes, just on quieter routes.
 */
const ROUTES = [["/", "index.html"]];

const { render } = await import(join(root, "dist-ssr", "entry-server.js"));
let template = await readFile(join(dist, "index.html"), "utf8");

/**
 * Inline the stylesheet.
 *
 * A `<link rel="stylesheet">` is render-blocking, so with the markup already
 * in the HTML the *only* thing standing between the reader and a painted page
 * was one more round trip for the CSS. Measured on Fast 3G with 4× CPU: the
 * stylesheet landed at 369ms and first paint did not happen until 968ms.
 *
 * Inlining removes that request entirely — the HTML arrives self-sufficient
 * and can paint as soon as it is parsed. The cost is that the CSS is no longer
 * cached separately across navigations, which is the right trade for a product
 * where the landing page is almost always the first thing anyone loads and
 * every subsequent route is a client-side transition anyway.
 */
const cssHref = template.match(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/);
if (cssHref) {
  const css = await readFile(join(dist, cssHref[1].replace(/^\//, "")), "utf8");
  template = template.replace(cssHref[0], `<style>${css}</style>`);
  console.log(`  inlined ${(css.length / 1024).toFixed(1)} kB of CSS`);
}

const MARKER = '<div id="root"></div>';
if (!template.includes(MARKER)) {
  throw new Error("prerender: could not find an empty #root in dist/index.html");
}

let count = 0;
for (const [url, file] of ROUTES) {
  let html;
  try {
    html = render(url);
  } catch (err) {
    // A route that cannot be rendered without a browser is a bug worth seeing,
    // not something to paper over with an empty shell.
    throw new Error(`prerender: ${url} failed — ${err.message}`);
  }

  const out = template.replace(MARKER, `<div id="root">${html}</div>`);
  const target = join(dist, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, out);
  count += 1;
  console.log(`  prerendered ${url.padEnd(10)} → ${file} (${(out.length / 1024).toFixed(1)} kB)`);
}

console.log(`prerender: ${count} route${count === 1 ? "" : "s"} written`);
