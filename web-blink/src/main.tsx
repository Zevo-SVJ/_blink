import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

/**
 * Remove the static boot shell.
 *
 * `index.html` paints a copy of the hero before any JavaScript runs, because
 * an empty `#root` meant 1.8 s of blank navy on a phone. Two frames after
 * React's first render the real hero is on screen, so the stand-in goes.
 *
 * Two frames, not one: the first commits the DOM, the second is the paint. On
 * a slow device removing it after one frame briefly shows nothing.
 */
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.getElementById("boot")?.setAttribute("hidden", "");
  });
});
