/**
 * Blink — bilingual runtime (English / French).
 *
 * ## The rule
 *
 * One application, one design, one set of components. Only the words change.
 * There is no `/fr` route, no duplicated tree, and no second build.
 *
 * ## How the language is chosen
 *
 * 1. An explicit choice, if the visitor has made one (`localStorage`).
 * 2. Otherwise the browser's preferred languages, in order. The first entry
 *    that names a language Blink speaks wins, so a browser configured as
 *    `["de", "fr-CA", "en"]` gets French — French is genuinely preferred over
 *    English there, and only scanning `navigator.language` would have missed it.
 * 3. Otherwise English.
 *
 * ## Why the mount strategy matters (see `main.tsx`)
 *
 * The landing is prerendered at build time, in English, into `dist/index.html`.
 * If a French visitor's first client render disagreed with that markup, React
 * would hydrate a mismatch: every translated string is a text node, and a
 * mismatched hydration throws the server markup away and re-renders — a visible
 * flash of English followed by a re-layout, which is precisely the jump this
 * project spent its performance work removing.
 *
 * So the decision is made *before* React mounts. English hydrates the
 * prerendered page (unchanged, still instant). French renders client-side from
 * the same bundle. Nobody ever sees the other language.
 *
 * `detectLanguage` is therefore deliberately synchronous and dependency-free:
 * it has to be callable from `main.tsx` before anything else runs.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { MESSAGES, type Messages } from "@/lib/messages";

export type Lang = "en" | "fr";

export const LANGS: Lang[] = ["en", "fr"];

/** Where an explicit choice is remembered. */
const STORAGE_KEY = "blink.lang";

/**
 * The language the prerendered HTML is written in.
 *
 * Anything that runs without a browser — `renderToString`, unit tests — uses
 * this, which is what keeps the prerendered markup deterministic.
 */
export const DEFAULT_LANG: Lang = "en";

function isLang(value: unknown): value is Lang {
  return value === "en" || value === "fr";
}

/**
 * Read a stored choice. Returns null when there isn't one.
 *
 * Wrapped because `localStorage` throws outright in some privacy modes, and a
 * language preference is never worth taking the page down for.
 */
export function storedLanguage(): Lang | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLang(raw) ? raw : null;
  } catch {
    return null;
  }
}

function rememberLanguage(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // A visitor who blocks storage simply gets browser detection next time.
  }
}

/**
 * The language this visitor should see, decided synchronously.
 *
 * Matching is on the primary subtag, so `fr`, `fr-FR`, `fr-CA` and `FR-be` all
 * resolve to French, and any language Blink does not speak falls through to
 * the next preference rather than to English immediately.
 */
export function detectLanguage(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;

  const stored = storedLanguage();
  if (stored) return stored;

  const preferences: string[] = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);

  for (const preference of preferences) {
    const primary = preference.toLowerCase().split("-")[0];
    if (isLang(primary)) return primary;
  }

  return DEFAULT_LANG;
}

interface I18nValue {
  lang: Lang;
  /** The full message tree for the active language. */
  t: Messages;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /**
   * The language decided before mount. Passing it in (rather than detecting
   * inside the provider) is what guarantees the first render already matches
   * the markup React is about to adopt.
   */
  initial?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initial ?? DEFAULT_LANG);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    rememberLanguage(next);
  }, []);

  // `<html lang>` is not decoration: screen readers switch pronunciation on it,
  // and it is what tells a translation tool the page is already in French.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({ lang, t: MESSAGES[lang], setLang }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Rendering outside the provider is a wiring mistake, but it must not be a
    // blank screen: English is a correct page, just not a translated one.
    return { lang: DEFAULT_LANG, t: MESSAGES[DEFAULT_LANG], setLang: () => {} };
  }
  return context;
}

/** Shorthand for the common case — components that only need the words. */
export function useT(): Messages {
  return useI18n().t;
}
