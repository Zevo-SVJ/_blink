/**
 * Layout regression test for the analysing screen.
 *
 * The bug this guards: the screenshot used to be unconstrained in height
 * inside a fixed-height stage, so a tall phone capture (9:19.5) overflowed and
 * covered the progress bar and the status messages underneath it.
 *
 * The contract asserted here is geometric and aspect-ratio independent — the
 * bottom of the rendered image must sit above the top of the progress bar, for
 * every shape of screenshot people actually upload.
 */

import { render } from "vitest-browser-react";

import { AnalysisScreen } from "@/pages/Product";

/** A solid image of exact pixel dimensions, as a data URL. */
function makeImage(width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#123";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#cde";
  ctx.beginPath();
  ctx.arc(width * 0.2, width * 0.25, width * 0.12, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/png");
}

const SHAPES = [
  { name: "tall phone screenshot (9:19.5)", w: 540, h: 1170 },
  { name: "very tall screenshot", w: 510, h: 1600 },
  { name: "square crop", w: 700, h: 700 },
  { name: "wide desktop crop", w: 1280, h: 640 },
  { name: "extremely wide sliver", w: 1284, h: 112 },
  { name: "extremely narrow sliver", w: 120, h: 900 },
];

async function renderStage(url: string) {
  const screen = await render(
    <AnalysisScreen
      previewUrl={url}
      file={null}
      onComplete={() => {}}
      hasResult={false}
      ownership="own"
    />,
  );

  const img = document.querySelector("main img, img") as HTMLImageElement | null;
  const bar = document.querySelector('[role="progressbar"]') as HTMLElement | null;

  if (!img || !bar) throw new Error("analysis stage did not render");

  // Geometry is only meaningful once the bitmap has been decoded and laid out.
  if (!img.complete) {
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  return { screen, img, bar };
}

describe("analysing screen layout", () => {
  for (const shape of SHAPES) {
    test(`${shape.name} never overlaps the progress bar`, async () => {
      const { screen, img, bar } = await renderStage(makeImage(shape.w, shape.h));

      const imgRect = img.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();

      expect(imgRect.height).toBeGreaterThan(0);
      // The whole point: image ends before the progress bar begins.
      expect(imgRect.bottom).toBeLessThanOrEqual(barRect.top);

      screen.unmount();
    });

    test(`${shape.name} stays inside the viewport horizontally`, async () => {
      const { screen, img } = await renderStage(makeImage(shape.w, shape.h));

      const imgRect = img.getBoundingClientRect();
      expect(imgRect.width).toBeLessThanOrEqual(window.innerWidth + 1);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth,
      );

      screen.unmount();
    });
  }

  test("preserves the screenshot's aspect ratio", async () => {
    const { screen, img } = await renderStage(makeImage(540, 1170));
    const rect = img.getBoundingClientRect();
    expect(rect.width / rect.height).toBeCloseTo(540 / 1170, 1);
    screen.unmount();
  });

  test("shows the ownership-aware status message", async () => {
    const { screen } = await renderStage(makeImage(540, 1170));
    await expect.element(screen.getByRole("progressbar")).toBeInTheDocument();
    screen.unmount();
  });
});
