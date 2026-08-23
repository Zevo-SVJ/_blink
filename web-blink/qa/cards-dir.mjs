/**
 * Where the card screenshots live.
 *
 * `cards.mjs` writes them and `bounds.mjs` scans them, so the two harnesses
 * are a pair. The path used to be pasted into both as an absolute path from
 * the machine they were first written on — which meant neither ran anywhere
 * else, and nothing stopped the two copies from drifting apart. Shared, and
 * repo-relative, they cannot disagree and they run wherever the repo does.
 *
 * `qa/shots/` is already gitignored, so the output stays out of the tree.
 * Override with CARDS_DIR.
 */
import path from "node:path";

export const CARDS_DIR = path.resolve(process.env.CARDS_DIR ?? "qa/shots/cards");
