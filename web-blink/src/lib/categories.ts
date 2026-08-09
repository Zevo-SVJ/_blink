/**
 * Blink — profile archetypes.
 *
 * The canonical set the model may assign and the leaderboard groups by. Kept
 * here so the prompt, the category picker and the display labels can't drift
 * apart.
 *
 * The model is free to return something outside this list; unknown values are
 * shown title-cased rather than discarded, so a new archetype appearing in the
 * data doesn't vanish from the UI.
 */

export interface CategoryDef {
  /** Stored value — lowercase, stable. */
  id: string;
  label: string;
  /** Shown when a category leaderboard is selected. */
  blurb: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "larp",
    label: "Larp",
    blurb: "High status, deliberately understated. Signals wealth without explaining it.",
  },
  {
    id: "entrepreneur",
    label: "Entrepreneur",
    blurb: "Building something, and says so. Credibility over mystique.",
  },
  { id: "creator", label: "Creator", blurb: "The output is the point. Built around an audience." },
  { id: "artist", label: "Artist", blurb: "The work speaks first. Identity sits behind it." },
  { id: "athlete", label: "Athlete", blurb: "Performance and discipline are the throughline." },
  { id: "music", label: "Music", blurb: "Sound, shows and releases carry the profile." },
  { id: "fashion", label: "Fashion", blurb: "Styling and taste do the communicating." },
  { id: "business", label: "Business", blurb: "Professional, credible, clearly positioned." },
  { id: "fitness", label: "Fitness", blurb: "Training and progress as the visual language." },
  { id: "lifestyle", label: "Lifestyle", blurb: "A life presented as a coherent aesthetic." },
  { id: "travel", label: "Travel", blurb: "Place as the organising idea." },
  { id: "gaming", label: "Gaming", blurb: "Play, streams and community." },
  { id: "photography", label: "Photography", blurb: "A consistent eye across a body of images." },
  { id: "minimalist", label: "Minimalist", blurb: "Restraint as the message. Nothing surplus." },
  { id: "student", label: "Student", blurb: "Early, social, still forming a direction." },
  { id: "personal", label: "Personal", blurb: "An ordinary account, not built for an audience." },
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
 * Order categories for the picker: those that actually have ranked profiles
 * first (in canonical order), then the rest, so the list is useful on day one
 * without hiding archetypes that exist but are empty.
 */
export function orderCategories(present: string[]): CategoryDef[] {
  const presentSet = new Set(present.map((c) => c.toLowerCase()));
  const known = CATEGORIES.filter((c) => presentSet.has(c.id));
  const unknown = present
    .filter((c) => !BY_ID.has(c.toLowerCase()))
    .map((c) => ({ id: c.toLowerCase(), label: categoryLabel(c)!, blurb: "" }));
  const rest = CATEGORIES.filter((c) => !presentSet.has(c.id));
  return [...known, ...unknown, ...rest];
}
