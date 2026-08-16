import path from "path";

import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ["src/**/*.browser.{test,spec}.{ts,tsx}"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        /*
          Use whatever Chromium the machine already has when `CHROME` says
          where it is.

          Playwright pins an exact browser build per version, and a CI image or
          dev container frequently ships a different one — the suite then fails
          on "Executable doesn't exist", which reads as a broken test run
          rather than a missing download. Left unset, behaviour is unchanged:
          Playwright uses its own managed browser.
        */
        launchOptions: process.env.CHROME
          ? { executablePath: process.env.CHROME }
          : undefined,
      }),
      instances: [
        {
          browser: "chromium",
        },
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
