/**
 * Blink — shareable result cards.
 *
 * Draws a composed card rather than screenshotting the UI, so the output is
 * sized for the destination (a 9:16 story is not a cropped web page) and the
 * typography stays crisp at export resolution.
 *
 * Privacy: a card carries username, score, rank, category and the one-line
 * result. It never carries recommendations — those are the account owner's,
 * and a share is by definition public.
 */

import type { AnalysisResult } from "@/lib/analysis";
import { computeBlinkScore, getTier, MAX_SCORE } from "@/lib/ranking";

export type ShareFormat = "story" | "square";

export interface ShareFormatSpec {
  id: ShareFormat;
  label: string;
  hint: string;
  width: number;
  height: number;
}

export const SHARE_FORMATS: ShareFormatSpec[] = [
  {
    id: "story",
    label: "Story",
    hint: "Instagram, TikTok, Snapchat — 9:16",
    width: 1080,
    height: 1920,
  },
  { id: "square", label: "Post", hint: "Feed and DMs — 1:1", width: 1080, height: 1080 },
];

export interface ShareCardData {
  handle: string | null;
  score: number;
  tier: string;
  category: string | null;
  headline: string;
  traits: string[];
  rank: number | null;
}

export function toShareCardData(
  result: AnalysisResult,
  rank: number | null = null,
): ShareCardData {
  const score = computeBlinkScore(result).total;
  return {
    handle: result.handle,
    score,
    tier: getTier(score).label,
    category: result.category?.category ?? null,
    headline: result.firstImpression,
    traits: result.traits.slice(0, 3),
    rank,
  };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const NAVY = "#04102D";
const NAVY_LIFT = "#0b1c42";
const SKY = "#AFE0F9";
const WHITE = "#FFFFFF";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wraps text to `maxWidth`, returning the lines actually drawn. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  // Ellipsise if we ran out of room mid-sentence.
  if (lines.length === maxLines) {
    const joined = lines.join(" ");
    const consumed = joined.split(/\s+/).length;
    if (consumed < words.length) {
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

const FONT = `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`;

/**
 * Render a share card. Returns the canvas so callers can export a blob.
 *
 * The layout is proportional to card height, so both formats share one
 * implementation and neither looks like a stretched version of the other.
 */
export function drawShareCard(data: ShareCardData, format: ShareFormatSpec): HTMLCanvasElement {
  const { width: W, height: H } = format;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNSUPPORTED");

  // Background: the Blink environment, top-lifted.
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.75);
  glow.addColorStop(0, NAVY_LIFT);
  glow.addColorStop(1, NAVY);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const pad = W * 0.1;
  const isStory = format.id === "story";

  // Wordmark.
  ctx.textAlign = "center";
  ctx.fillStyle = WHITE;
  ctx.font = `800 ${Math.round(W * 0.052)}px ${FONT}`;
  ctx.fillText("Blink", cx, H * (isStory ? 0.115 : 0.13));

  // Handle.
  if (data.handle) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `500 ${Math.round(W * 0.036)}px ${FONT}`;
    ctx.fillText(`@${data.handle}`, cx, H * (isStory ? 0.155 : 0.185));
  }

  // Score ring.
  const ringY = H * (isStory ? 0.36 : 0.44);
  const radius = W * (isStory ? 0.235 : 0.2);
  const stroke = W * 0.028;
  const progress = Math.max(0, Math.min(1, data.score / MAX_SCORE));

  ctx.lineWidth = stroke;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.arc(cx, ringY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = SKY;
  ctx.beginPath();
  ctx.arc(cx, ringY, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = WHITE;
  ctx.font = `800 ${Math.round(radius * 0.78)}px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText(String(data.score), cx, ringY - radius * 0.05);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = `700 ${Math.round(W * 0.026)}px ${FONT}`;
  ctx.fillText("BLINK SCORE", cx, ringY + radius * 0.42);

  // Tier chip.
  const chipY = ringY + radius + H * (isStory ? 0.045 : 0.055);
  ctx.font = `700 ${Math.round(W * 0.032)}px ${FONT}`;
  const chipW = ctx.measureText(data.tier).width + W * 0.09;
  const chipH = W * 0.075;
  ctx.fillStyle = "rgba(175,224,249,0.15)";
  roundRect(ctx, cx - chipW / 2, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = SKY;
  ctx.textBaseline = "middle";
  ctx.fillText(data.tier, cx, chipY + chipH / 2);
  ctx.textBaseline = "alphabetic";

  // Headline.
  let y = chipY + chipH + H * (isStory ? 0.06 : 0.07);
  ctx.fillStyle = WHITE;
  ctx.font = `800 ${Math.round(W * 0.058)}px ${FONT}`;
  const headlineLines = wrapLines(ctx, data.headline, W - pad * 2, 2);
  for (const line of headlineLines) {
    ctx.fillText(line, cx, y);
    y += W * 0.072;
  }

  // Traits.
  if (data.traits.length > 0) {
    y += H * 0.012;
    ctx.font = `600 ${Math.round(W * 0.03)}px ${FONT}`;
    const gap = W * 0.022;
    const widths = data.traits.map((t) => ctx.measureText(t).width + W * 0.062);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (data.traits.length - 1);
    let x = cx - totalW / 2;
    const h = W * 0.066;

    data.traits.forEach((trait, i) => {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, x, y, widths[i], h, h / 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.textBaseline = "middle";
      ctx.fillText(trait, x + widths[i] / 2, y + h / 2);
      ctx.textBaseline = "alphabetic";
      x += widths[i] + gap;
    });
    y += h;
  }

  // Rank + category footer row.
  const stats: Array<[string, string]> = [];
  if (data.rank !== null) stats.push(["RANK", `#${data.rank}`]);
  if (data.category) stats.push(["CATEGORY", data.category]);

  if (stats.length > 0) {
    const rowY = H * (isStory ? 0.845 : 0.86);
    const colW = (W - pad * 2) / stats.length;
    stats.forEach(([label, value], i) => {
      const colX = pad + colW * i + colW / 2;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `700 ${Math.round(W * 0.024)}px ${FONT}`;
      ctx.fillText(label, colX, rowY);
      ctx.fillStyle = WHITE;
      ctx.font = `800 ${Math.round(W * 0.045)}px ${FONT}`;
      ctx.fillText(value, colX, rowY + W * 0.062);
    });
  }

  // Footer.
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = `600 ${Math.round(W * 0.026)}px ${FONT}`;
  ctx.fillText("See yourself the way others see you", cx, H * (isStory ? 0.945 : 0.955));

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("CANVAS_EXPORT_FAILED"))),
      "image/png",
    );
  });
}

/** True when the browser can share image files natively. */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File([new Blob()], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}
