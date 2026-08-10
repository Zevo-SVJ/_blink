import { createRoot, hydrateRoot } from "react-dom/client";

import App from "./App.tsx";
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
 */
const container = document.getElementById("root")!;

if (container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
