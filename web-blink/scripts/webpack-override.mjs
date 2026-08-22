/**
 * The one webpack override, shared by every entry point into Remotion.
 *
 * `remotion.config.ts` is read by the CLI only — the programmatic `bundle()`
 * used by the render scripts never sees it. Keeping the override in a module
 * both can import is what stops `npx remotion studio` and `npm run
 * video:render` compiling the film two different ways, which is the kind of
 * difference that only shows up as "it looked fine in the studio".
 */

import path from "node:path";

export const webpackOverride = (current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: {
      ...current.resolve?.alias,
      "@": path.join(process.cwd(), "src"),
    },
  },
});
