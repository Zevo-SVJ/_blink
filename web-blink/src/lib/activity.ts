/**
 * Blink — the landing's activity ticker.
 *
 * ## Honesty
 *
 * These are **not** real events. Blink does not publish who scanned what, and
 * inventing named strangers who "just analyzed a profile" to pressure a
 * visitor is the kind of fake urgency that regulators treat as deceptive
 * advertising — quite apart from being a lie.
 *
 * So the feed is illustrative and says so: every notification carries a
 * "sample" marker (see `ActivityToasts`). It shows the shape of what happens on
 * Blink — people scanning profiles, climbing categories, comparing reads —
 * without claiming any particular person did any particular thing.
 *
 * ## Why the timing is generated rather than fixed
 *
 * A fixed interval is the tell. Real activity arrives in clumps: three in a few
 * seconds, then nothing for half a minute. `nextDelay` reproduces that with a
 * three-mode distribution, so the rhythm never resolves into a loop the eye can
 * predict.
 */

export interface ActivityEvent {
  handle: string;
  action: string;
}

/**
 * Handles are assembled rather than listed so the pool is large enough that a
 * visitor never sees the same name twice in a session.
 */
const FIRST = [
  "mia", "noah", "lea", "kai", "zoe", "theo", "ines", "luca", "ava", "sami",
  "nina", "eli", "maya", "jonas", "aya", "rafa", "cleo", "milo", "sana", "iris",
];
const SECOND = [
  "", ".jpg", "_", ".raw", "24", ".studio", "x", ".film", "07", ".co",
  "_official", ".daily", "3", ".exe", "____",
];

const ACTIONS = [
  "scanned a profile",
  "just got read by a stranger",
  "checked how their crush sees them",
  "climbed into the top 100",
  "ran their first Blink",
  "compared two profiles",
  "moved up 12 places",
  "unlocked a new category",
  "re-scanned after a redesign",
  "found out they read as a Larp",
  "sent their result to a friend",
  "got a Magnetic verdict",
];

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)];
}

export function makeEvent(rand: () => number = Math.random): ActivityEvent {
  return {
    handle: `${pick(FIRST, rand)}${pick(SECOND, rand)}`,
    action: pick(ACTIONS, rand),
  };
}

/**
 * Milliseconds until the next notification.
 *
 * Three modes, so the cadence is uneven the way real traffic is:
 *
 *  - **burst** (25%) — 1.4-3s, the tail of a cluster
 *  - **lull** (20%)  — 20-38s, long enough that the feed goes quiet
 *  - **normal**      — 6-15s
 *
 * The ranges deliberately overlap nothing, so no single interval dominates and
 * the sequence cannot settle into a visible loop.
 */
export function nextDelay(rand: () => number = Math.random): number {
  const roll = rand();
  if (roll < 0.25) return 1400 + rand() * 1600;
  if (roll < 0.45) return 20000 + rand() * 18000;
  return 6000 + rand() * 9000;
}
