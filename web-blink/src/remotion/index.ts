/**
 * Remotion entry point.
 *
 * Separate from the app's own entry: the film is rendered by Remotion's
 * bundler, not Vite, and never runs inside the React app. The landing page
 * plays the rendered file.
 */

import { registerRoot } from "remotion";

import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
