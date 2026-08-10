/**
 * Prerender the landing as part of `vite build`.
 *
 * ## Why this is a plugin and not a separate npm script
 *
 * It used to be `npm run build && node scripts/prerender.mjs`. That works
 * locally and is a trap in deployment: hosts frequently run `vite build`
 * directly, or their own detected build command, and any of those silently
 * skips the prerender step. The result is an empty `#root` — a blank screen
 * until the bundle arrives, which is exactly the bug this whole mechanism
 * exists to prevent, reintroduced by a build command nobody looked at.
 *
 * As a plugin it is part of the build itself. However the client build is
 * invoked, the landing ends up in `dist/index.html`.
 *
 * ## What it does
 *
 * After the client bundle is written it runs a second, SSR build of
 * `src/entry-server.tsx` into `dist-ssr/`, imports it, renders `/` to a string,
 * inlines the stylesheet, and writes the result into `#root`.
 *
 * Only `/` is prerendered. It is the route with the load problem, the one
 * almost every visitor sees first, and the only one whose component ships in
 * the initial bundle rather than behind `lazy()` — `renderToString` does not
 * wait for lazy chunks, so any other route would render its Suspense fallback
 * and ship a blank shell.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin } from "vite";

const MARKER = '<div id="root"></div>';

export function prerender(): Plugin {
  return {
    name: "blink-prerender",
    apply: "build",
    // Runs after the bundle is on disk.
    async closeBundle() {
      // The SSR build below re-enters the plugin pipeline. Without this guard
      // it would recurse forever.
      if (process.env.BLINK_SSR_PASS === "1") return;

      const { build } = await import("vite");
      const root = process.cwd();
      const dist = join(root, "dist");

      const indexPath = join(dist, "index.html");
      let template: string;
      try {
        template = await readFile(indexPath, "utf8");
      } catch {
        // Not the client build (library/SSR output elsewhere) — nothing to do.
        return;
      }
      if (!template.includes(MARKER)) {
        this.warn("prerender: no empty #root in dist/index.html, skipping");
        return;
      }

      process.env.BLINK_SSR_PASS = "1";
      try {
        await build({
          logLevel: "warn",
          build: {
            ssr: join(root, "src", "entry-server.tsx"),
            outDir: "dist-ssr",
            emptyOutDir: true,
          },
        });
      } finally {
        delete process.env.BLINK_SSR_PASS;
      }

      const { render } = (await import(
        /* @vite-ignore */ join(root, "dist-ssr", "entry-server.js")
      )) as { render: (url: string) => string };

      /*
        The stylesheet is render-blocking, so with the markup already in the
        HTML the only thing left between the reader and a painted page was one
        more round trip. Inlining it removes that request entirely; measured on
        Fast 3G with 4x CPU, first paint went from 968ms to under 500ms.
      */
      const cssTag = template.match(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/);
      if (cssTag) {
        const css = await readFile(join(dist, cssTag[1].replace(/^\//, "")), "utf8");
        template = template.replace(cssTag[0], `<style>${css}</style>`);
      }

      const html = render("/");
      await writeFile(indexPath, template.replace(MARKER, `<div id="root">${html}</div>`));

      this.info?.(
        `prerendered / (${(html.length / 1024).toFixed(0)} kB markup, ${
          cssTag ? "CSS inlined" : "CSS external"
        })`,
      );
    },
  };
}
