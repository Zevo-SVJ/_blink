/**
 * Build-time rendering of the real landing page.
 *
 * ## Why this exists
 *
 * `#root` used to be empty until the JS bundle had downloaded, parsed and run.
 * Measured on Fast 3G with 4× CPU throttling: a hand-written placeholder hero
 * painted at 398ms and React's real page did not replace it until 1774ms —
 * nearly a second and a half looking at a headline and a CTA that were not the
 * ones the app actually renders, with scrolling locked the whole time.
 *
 * Every previous attempt treated the symptom: a nicer placeholder, a timer, a
 * scroll lock so the queued gesture could not misfire. The cause is simply
 * that the page did not exist yet.
 *
 * So it is rendered here, at build time, into `dist/index.html`. The first
 * bytes the browser receives *are* the landing page. React then hydrates the
 * markup already on screen rather than replacing it: same DOM nodes, same
 * headline, same button — the only change is that the button gains its
 * handler. There is no second hero to swap in, nothing to remove on a timer,
 * and no reason to lock scrolling, because the document is its full height
 * from the very first paint.
 *
 * ## What is safe to render here
 *
 * Effects do not run during `renderToString`, so nothing touches Supabase, the
 * browser APIs or `localStorage` — `AuthProvider` renders its loading state,
 * exactly as the client does on its first pass, which is what keeps hydration
 * from mismatching.
 */

import { StaticRouter } from "react-router-dom/server";
import { renderToString } from "react-dom/server";

import { AppTree } from "./App";
import "./index.css";

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <AppTree />
    </StaticRouter>,
  );
}
