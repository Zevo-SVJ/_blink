/**
 * Blink — shareable result cards.
 *
 * Composed per format rather than scaled from one layout. The previous version
 * positioned everything as a fraction of card *height*, which works for 9:16
 * and falls apart at 1:1 — the ring grew, the footer collided with the stats
 * row, and content ran past the edges.
 *
 * Now each format declares its own vertical rhythm and the content is laid out
 * top-down from a measured cursor, so nothing can overlap and nothing depends
 * on the aspect ratio being the one it was tuned against.
 *
 * Privacy: a card carries handle, score, tier, headline, traits, rank and
 * category. Never recommendations — a share is public by definition.
 */

import type { AnalysisResult } from "@/lib/analysis";
import { categoryLabel } from "@/lib/categories";
import { MAX_SCORE, computeBlinkScore, getTier } from "@/lib/ranking";

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
    category: categoryLabel(result.category?.category),
    headline: result.firstImpression,
    traits: result.traits.slice(0, 3),
    rank,
  };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const NAVY = "#04102D";
const NAVY_LIFT = "#0d2049";
const SKY = "#AFE0F9";
const WHITE = "#FFFFFF";
const FONT = `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`;

/** Per-format rhythm. Everything else is derived from a top-down cursor. */
const LAYOUT = {
  story: {
    padding: 0.1,
    top: 0.1,
    ringRadius: 0.225,
    gapAfterRing: 0.055,
    gapAfterHeadline: 0.03,
    statsFromBottom: 0.13,
    footerFromBottom: 0.055,
    headlineSize: 0.058,
  },
  square: {
    // A square has far less vertical room: the ring shrinks, the gaps tighten
    // and the stats row sits closer to the edge so nothing collides.
    padding: 0.075,
    top: 0.08,
    ringRadius: 0.155,
    gapAfterRing: 0.038,
    gapAfterHeadline: 0.022,
    // Sits higher than the story format: on a square the stats value and the
    // footer are only ~12px apart at the story's spacing, and they collide.
    statsFromBottom: 0.165,
    footerFromBottom: 0.045,
    headlineSize: 0.048,
  },
} as const;

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

/** Wrap to `maxWidth`, ellipsising once `maxLines` is reached. */
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

  if (lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) {
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

/**
 * Render a share card.
 *
 * Content flows from a top cursor down, and the footer block is anchored to
 * the bottom, so the two can never overlap regardless of how long the headline
 * wraps.
 */
export function drawShareCard(data: ShareCardData, format: ShareFormatSpec): HTMLCanvasElement {
  const { width: W, height: H } = format;
  const L = LAYOUT[format.id];

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNSUPPORTED");

  // Background — the Blink environment, lifted from the top.
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.05, 0, W / 2, H * 0.05, H * 0.7);
  glow.addColorStop(0, NAVY_LIFT);
  glow.addColorStop(1, NAVY);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // A hairline frame gives the card an edge when it lands on a white feed.
  ctx.strokeStyle = "rgba(175,224,249,0.14)";
  ctx.lineWidth = Math.max(2, W * 0.003);
  const inset = W * 0.028;
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, W * 0.055);
  ctx.stroke();

  const cx = W / 2;
  const pad = W * L.padding;
  const contentWidth = W - pad * 2;
  ctx.textAlign = "center";

  // ---- Header: wordmark + handle -----------------------------------------
  let y = H * L.top;

  ctx.fillStyle = WHITE;
  ctx.font = `800 ${Math.round(W * 0.05)}px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Blink", cx, y);

  if (data.handle) {
    y += W * 0.055;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `500 ${Math.round(W * 0.033)}px ${FONT}`;
    ctx.fillText(`@${data.handle}`, cx, y);
  }

  // ---- Score ring ---------------------------------------------------------
  const radius = W * L.ringRadius;
  const ringY = y + W * L.gapAfterRing + radius;
  const stroke = W * 0.026;
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
  ctx.font = `800 ${Math.round(radius * 0.72)}px ${FONT}`;
  ctx.fillText(String(data.score), cx, ringY - radius * 0.06);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = `700 ${Math.round(W * 0.023)}px ${FONT}`;
  ctx.fillText("BLINK SCORE", cx, ringY + radius * 0.42);

  y = ringY + radius;

  // ---- Tier chip ----------------------------------------------------------
  y += W * L.gapAfterRing;
  ctx.font = `700 ${Math.round(W * 0.031)}px ${FONT}`;
  const chipH = W * 0.072;
  const chipW = ctx.measureText(data.tier).width + W * 0.085;
  ctx.fillStyle = "rgba(175,224,249,0.16)";
  roundRect(ctx, cx - chipW / 2, y, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = SKY;
  ctx.fillText(data.tier, cx, y + chipH / 2);
  y += chipH;

  // ---- Headline -----------------------------------------------------------
  y += W * L.gapAfterHeadline * 1.6;
  ctx.fillStyle = WHITE;
  ctx.font = `800 ${Math.round(W * L.headlineSize)}px ${FONT}`;
  const headlineLines = wrapLines(ctx, data.headline, contentWidth, 2);
  const lineHeight = W * L.headlineSize * 1.24;
  for (const line of headlineLines) {
    ctx.fillText(line, cx, y + lineHeight / 2);
    y += lineHeight;
  }

  // ---- Traits -------------------------------------------------------------
  if (data.traits.length > 0) {
    y += W * L.gapAfterHeadline;
    ctx.font = `600 ${Math.round(W * 0.029)}px ${FONT}`;
    const gap = W * 0.02;
    const chipHeight = W * 0.062;
    const widths = data.traits.map((t) => ctx.measureText(t).width + W * 0.058);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (data.traits.length - 1);

    // Drop traits that would run past the edge rather than letting them clip —
    // this is what broke on the square format.
    let usable = data.traits.length;
    let running = total;
    while (usable > 1 && running > contentWidth) {
      usable -= 1;
      running =
        widths.slice(0, usable).reduce((a, b) => a + b, 0) + gap * (usable - 1);
    }

    let x = cx - running / 2;
    for (let i = 0; i < usable; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, x, y, widths[i], chipHeight, chipHeight / 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(data.traits[i], x + widths[i] / 2, y + chipHeight / 2);
      x += widths[i] + gap;
    }
  }

  // ---- Bottom block: stats, then footer ----------------------------------
  const stats: Array<[string, string]> = [];
  if (data.rank !== null) stats.push(["RANK", `#${data.rank}`]);
  if (data.category) stats.push(["CATEGORY", data.category]);

  if (stats.length > 0) {
    const rowY = H - H * L.statsFromBottom;
    const colWidth = contentWidth / stats.length;

    // Divider above the stats grounds the block instead of leaving numbers
    // floating in the lower third.
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.lineWidth = Math.max(1, W * 0.0015);
    ctx.beginPath();
    ctx.moveTo(pad, rowY - W * 0.042);
    ctx.lineTo(W - pad, rowY - W * 0.042);
    ctx.stroke();

    stats.forEach(([label, value], i) => {
      const colX = pad + colWidth * i + colWidth / 2;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `700 ${Math.round(W * 0.022)}px ${FONT}`;
      ctx.fillText(label, colX, rowY);
      ctx.fillStyle = WHITE;
      ctx.font = `800 ${Math.round(W * 0.042)}px ${FONT}`;
      ctx.fillText(value, colX, rowY + W * 0.055);
    });
  }

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = `600 ${Math.round(W * 0.024)}px ${FONT}`;
  ctx.fillText("See yourself the way others see you", cx, H - H * L.footerFromBottom);

  ctx.textBaseline = "alphabetic";
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
