import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { prerender } from "./scripts/vite-plugin-prerender";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // `prerender` writes the real landing into dist/index.html as part of the
  // build itself, so it cannot be skipped by a host that runs `vite build`
  // rather than the npm script. See the plugin for why that matters.
  plugins: [react(), prerender()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Expose both VITE_* (Vite default) and EXPO_PUBLIC_* (Rork's cross-platform
  // public-env convention, written by tools like getOrCreateAuthConfig).
  envPrefix: ["VITE_", "EXPO_PUBLIC_"],
}));
