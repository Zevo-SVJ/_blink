import { createRoot, hydrateRoot } from "react-dom/client";

import App from "./App.tsx";
import { DEFAULT_LANG, detectLanguage } from "./lib/i18n.tsx";
import "./index.css";

/**
 * Attach React to the page.
 *
 * The production build prerenders the landing into `#root` (see
 * `entry-server.tsx`), so on a cold visit the real page — real headline, real
 * button — is already painted before this bundle arrives. `hydrateRoot`
 * adopts that markup: the same DOM nodes stay on screen and simply become
 * interactive. Nothing is replaced, so there is no flash and no second hero.
 *
 * `createRoot` is the fallback for the dev server and for any route that was
 * not prerendered, where `#root` is genuinely empty. Calling `hydrateRoot` on
 * an empty container would warn and then render anyway; choosing on the actual
 * contents keeps both paths correct.
 *
 * ## Language, and why it is decided here
 *
 * The prerendered markup is English. Hydrating it with French would mismatch
 * on every translated text node; React then discards the server markup and
 * re-renders the tree, which a visitor sees as English appearing, flashing,
 * and being replaced — a layout jump on the exact page whose whole design goal
 * was to paint once.
 *
 * Deciding before mount removes the question. English adopts the prerendered
 * page as before. French renders client-side from the same bundle: no
 * mismatch, no flash of the wrong language, no second tree. The one cost is
 * that a French visitor's first paint waits for the bundle — correct beats
 * fast when the alternative is showing them the wrong language first.
 */
const container = document.getElementById("root")!;
const lang = detectLanguage();

// Set immediately: the prerendered document declares `lang="en"`, and a
// French page must say so before assistive technology starts reading it.
document.documentElement.lang = lang;

if (container.hasChildNodes() && lang === DEFAULT_LANG) {
  hydrateRoot(container, <App lang={lang} />);
} else {
  // Replacing prerendered markup rather than adopting it — clear it first so
  // the English copy can never be visible underneath while React renders.
  if (container.hasChildNodes()) container.innerHTML = "";
  createRoot(container).render(<App lang={lang} />);
}
