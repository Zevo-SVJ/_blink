/**
 * Builds the film's whole audio kit, in the order the pieces depend on.
 *
 *   node scripts/make-audio.mjs
 *
 * The music is generated first because the SFX script owns the encode step and
 * clears the scratch directory when it is done.
 */

import { execFileSync } from "node:child_process";

for (const step of ["scripts/make-music.mjs", "scripts/make-sfx.mjs"]) {
  execFileSync(process.execPath, [step], { stdio: "inherit" });
}
