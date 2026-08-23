/**
 * Builds the film's whole audio kit, in the order the pieces depend on.
 *
 *   node scripts/make-audio.mjs
 *
 * Each script now finishes its own job: `make-music.mjs` synthesises the bed
 * and encodes it to MP3, `make-sfx.mjs` writes the five placeholder sounds
 * straight to `public/audio/` where the film reads them from. Order is
 * cosmetic, not load-bearing.
 */

import { execFileSync } from "node:child_process";

for (const step of ["scripts/make-music.mjs", "scripts/make-sfx.mjs"]) {
  execFileSync(process.execPath, [step], { stdio: "inherit" });
}
