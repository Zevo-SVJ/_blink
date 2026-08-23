/** Every authenticated screen, at both widths, for looking at. */
import { openApp } from "./drive.mjs";

const ROUTES = [
  ["home", "/app"],
  ["library", "/library"],
  ["ranks", "/ranks"],
  ["profile", "/profile"],
  ["settings", "/settings"],
];

for (const width of ["390", "desktop"]) {
  const { browser, page } = await openApp({ width });
  for (const [name, path] of ROUTES) {
    await page.goto((process.env.APP_URL ?? "http://127.0.0.1:4173") + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `qa/shots/p7/${name}-${width}.png`, fullPage: true });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(width, name, "overflow", over);
  }
  await browser.close();
}
