/**
 * Blink — profile archetypes.
 *
 * Deliberately short. An earlier version carried sixteen archetypes, which
 * made the category picker a wall of mostly-empty boards and gave the model
 * too many near-synonyms to choose between. These are the ones that describe
 * how people actually present themselves.
 *
 * Order is meaningful: Larp leads because it is Blink's own idea and the
 * reason the category system exists at all. The rest are mainstream.
 *
 * The model may still return something outside this list. It used to be
 * title-cased and shown as-is, which is how an analysis came to display
 * "Photography-and-visual-storytelling" — a category that exists nowhere in
 * Ranks, so the result contradicted the board it was supposed to belong to.
 * `normaliseCategory` now folds anything unrecognised onto a canonical id, or
 * to null, and it runs on the write path as well as the read path.
 */

export interface CategoryDef {
  /** Stored value — lowercase, stable. */
  id: string;
  label: string;
  /** Shown under the picker when the category is selected. */
  blurb: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "larp",
    label: "Larp",
    blurb:
      "Genuinely high status, deliberately understated. Signals wealth without ever explaining it.",
  },
  {
    id: "creator",
    label: "Creator",
    blurb: "Built around an audience. The output is the point.",
  },
  {
    id: "entrepreneur",
    label: "Entrepreneur",
    blurb: "Building something, and says so. Credibility over mystique.",
  },
  {
    id: "artist",
    label: "Artist",
    blurb: "The work speaks first. Identity sits behind it.",
  },
  {
    id: "fitness",
    label: "Fitness",
    blurb: "Training and progress as the visual language.",
  },
  {
    id: "fashion",
    label: "Fashion",
    blurb: "Styling and taste do the communicating.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    blurb: "A life presented as one coherent aesthetic.",
  },
  {
    id: "personal",
    label: "Personal",
    blurb: "An ordinary account, not built for an audience.",
  },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/**
 * Words that point at a canonical category.
 *
 * The model is asked for one of the ids, and mostly obliges, but it also
 * returns descriptive phrases. Rather than inventing a category for each, the
 * phrase is matched against these and folded onto the nearest real one.
 * Order matters: the first id whose keywords appear wins, so the more
 * specific archetypes are listed before the catch-alls.
 */
const SYNONYMS: Array<[string, string[]]> = [
  ["larp", ["larp", "quiet luxury", "old money", "understated wealth"]],
  ["creator", ["creator", "influencer", "content", "youtube", "podcast", "streamer"]],
  ["entrepreneur", ["entrepreneur", "founder", "business", "startup", "hustle", "ceo"]],
  ["artist", ["artist", "art", "photograph", "music", "design", "visual", "storytelling", "film", "craft"]],
  ["fitness", ["fitness", "gym", "training", "athlete", "sport", "run", "lift"]],
  ["fashion", ["fashion", "style", "outfit", "streetwear", "model", "beauty"]],
  ["lifestyle", ["lifestyle", "travel", "food", "aesthetic", "wellness", "luxury"]],
  ["personal", ["personal", "private", "everyday", "casual", "friends", "normal"]],
];

/** Strip to comparable letters: "Photography & Visual-Storytelling" -> "photographyvisualstorytelling". */
function fold(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * The canonical category for any value, or null when nothing fits.
 *
 * Returning null is deliberate and better than guessing: a profile with no
 * category shows no category claim, whereas a wrong one is a statement the
 * leaderboard will contradict.
 */
export function normaliseCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (BY_ID.has(lower)) return lower;

  const folded = fold(raw);
  if (!folded) return null;

  for (const c of CATEGORIES) {
    if (fold(c.id) === folded || fold(c.label) === folded) return c.id;
  }
  for (const [id, words] of SYNONYMS) {
    if (words.some((w) => folded.includes(fold(w)))) return id;
  }
  return null;
}

/**
 * Display label for a stored category.
 *
 * Always a category that exists in Ranks, or nothing at all. Rows written
 * before `normaliseCategory` guarded the write path still hold raw model
 * values, so they are folded here too rather than surfacing a board that
 * doesn't exist.
 */
export function categoryLabel(id: string | null | undefined): string | null {
  const canonical = normaliseCategory(id);
  return canonical ? (BY_ID.get(canonical)?.label ?? null) : null;
}

export function categoryBlurb(id: string | null | undefined): string | null {
  const canonical = normaliseCategory(id);
  return canonical ? (BY_ID.get(canonical)?.blurb ?? null) : null;
}

/**
 * Categories to offer in the picker.
 *
 * Every canonical category is always offered, in canonical order, whether or
 * not anyone is ranked in it yet. Hiding empty boards was the wrong call: a
 * launch-stage product then showed exactly one tab, which told users the
 * category system did not exist rather than that it was waiting for them.
 * An empty board with its own launch state is far more informative.
 *
 * Values the model produced that aren't canonical are appended, so data never
 * disappears from the UI.
 */
export function pickerCategories(_present: string[] = []): CategoryDef[] {
  // Canonical list only. Appending whatever the model happened to produce was
  // how non-existent boards reached the picker in the first place.
  return CATEGORIES;
}

/**
 * Only the categories that currently hold ranked profiles.
 *
 * Still used where an empty board would be actively misleading rather than
 * merely quiet — nothing in the picker path.
 */
export function availableCategories(present: string[]): CategoryDef[] {
  const presentSet = new Set(
    present.map((c) => normaliseCategory(c)).filter((c): c is string => !!c),
  );
  return CATEGORIES.filter((c) => presentSet.has(c.id));
}
