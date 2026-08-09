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
 * The model may still return something outside this list; unknown values are
 * title-cased rather than dropped, so data never disappears from the UI.
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

/** Display label for a stored category, tolerating unknown values. */
export function categoryLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  const known = BY_ID.get(id.toLowerCase());
  if (known) return known.label;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function categoryBlurb(id: string | null | undefined): string | null {
  if (!id) return null;
  return BY_ID.get(id.toLowerCase())?.blurb ?? null;
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
export function pickerCategories(present: string[] = []): CategoryDef[] {
  const extra = Array.from(new Set(present.map((c) => c.toLowerCase())))
    .filter((c) => !BY_ID.has(c))
    .map((c) => ({ id: c, label: categoryLabel(c)!, blurb: "" }));
  return [...CATEGORIES, ...extra];
}

/**
 * Only the categories that currently hold ranked profiles.
 *
 * Still used where an empty board would be actively misleading rather than
 * merely quiet — nothing in the picker path.
 */
export function availableCategories(present: string[]): CategoryDef[] {
  const presentSet = new Set(present.map((c) => c.toLowerCase()));
  const known = CATEGORIES.filter((c) => presentSet.has(c.id));
  const unknown = present
    .map((c) => c.toLowerCase())
    .filter((c) => !BY_ID.has(c))
    .map((c) => ({ id: c, label: categoryLabel(c)!, blurb: "" }));
  return [...known, ...unknown];
}
