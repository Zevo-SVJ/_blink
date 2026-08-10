import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

/**
 * `index.html` ships a painted copy of the hero inside `#root`, so something
 * real is on screen before this bundle has finished downloading.
 *
 * React's first commit replaces that markup as part of the same paint. There
 * is deliberately no timer, no `hidden` toggle and no second root: the boot
 * markup is inside the container React owns, so the handover is atomic and
 * there is never a moment with two heroes in the tree.
 */
createRoot(document.getElementById("root")!).render(<App />);
