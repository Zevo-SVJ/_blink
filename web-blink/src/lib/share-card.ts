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
import { readHeadline } from "@/lib/perception-read";
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
  /**
   * The crush read — the single most shareable thing in a Blink result.
   *
   * A card that carries only a number invites "nice", not a reply. "How your
   * crush sees you" plus one sentence is the part someone screenshots and
   * sends, so it is on the card rather than left behind in the app.
   */
  lens: { emoji: string; label: string; summary: string } | null;
  /**
   * The loudest signal that read weighs, with its number.
   *
   * This is the comparison hook: a viewer who sees "Mystery 8.4" has been
   * given a scale and immediately wants their own position on it.
   */
  signal: { label: string; score: number } | null;
}

export function toShareCardData(
  result: AnalysisResult,
  rank: number | null = null,
): ShareCardData {
  const score = computeBlinkScore(result).total;
  const crush = result.perspectives?.crush;
  const loudest = readHeadline("crush", crush, result.signals);

  return {
    handle: result.handle,
    score,
    tier: getTier(score).label,
    category: categoryLabel(result.category?.category),
    headline: result.firstImpression,
    traits: result.traits.slice(0, 3),
    rank,
    // Omitted rather than filled with a placeholder when the analysis didn't
    // produce one — the card must never claim a read that wasn't made.
    lens:
      crush?.summary?.trim()
        ? {
            emoji: crush.emoji || "❤️",
            // No pronouns: the same card is shared by the profile's owner and
            // forwarded by whoever received it.
            label: "How a crush sees this profile",
            summary: crush.summary.trim(),
          }
        : null,
    signal: loudest,
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
    // A square is 840px shorter than a story at the same width, and it now has
    // to carry the crush read as well. The ring is the only element big enough
    // to pay for it: at the old 0.155 radius the fitter dropped the read, the
    // signal and the traits, which left the square as the weak card it used to
    // be. A smaller ring buys all three back — the number is still the largest
    // thing on the card.
    padding: 0.075,
    top: 0.06,
    ringRadius: 0.09,
    gapAfterRing: 0.03,
    gapAfterHeadline: 0.022,
    // Not lower than this: below ~0.14 the stats value and the footer line
    // land within ~15px of each other and collide.
    statsFromBottom: 0.145,
    footerFromBottom: 0.045,
    headlineSize: 0.044,
  },
} as const;

/** How many lines the crush read may take. A square has room for fewer. */
const LENS_LINES: Record<ShareFormat, number> = { story: 3, square: 2 };

/** Shorten to fit `maxWidth`, ellipsising. Used where wrapping isn't an option. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

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
    // Instagram allows 30 characters; at this size that can exceed the card.
    ctx.fillText(fitText(ctx, `@${data.handle}`, contentWidth), cx, y);
  }

  const headerBottom = y;
  const progress = Math.max(0, Math.min(1, data.score / MAX_SCORE));

  /**
   * The ring, drawn at whatever size the rest of the card leaves for it.
   *
   * Called after the blocks below have been measured, because the amount of
   * room it should take depends on how much there is to say. A result with a
   * crush read, a signal and three traits needs a modest ring; one with none
   * of them would otherwise leave a third of the card empty, which is what a
   * broken export looks like. Nothing below depends on the radius, so sizing
   * it last costs nothing.
   */
  const drawRing = (radius: number, ringY: number) => {
    const stroke = Math.max(W * 0.018, radius * 0.11);

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

    // Both are sized and placed from the radius, not from the card width: the
    // square's ring is much smaller than the story's, and at a fixed offset
    // the caption printed straight through the digits.
    ctx.textAlign = "center";
    ctx.fillStyle = WHITE;
    ctx.font = `800 ${Math.round(radius * 0.64)}px ${FONT}`;
    ctx.fillText(String(data.score), cx, ringY - radius * 0.12);

    // The caption goes inside the ring only when it genuinely clears the
    // stroke. The chord at that height is far narrower than the diameter, so
    // on a small ring the words used to sit on the arc itself.
    const capY = radius * 0.5;
    const chord = 2 * Math.sqrt(Math.max(0, radius * radius - capY * capY)) - stroke * 2;
    ctx.font = `700 ${Math.round(Math.min(W * 0.023, radius * 0.19))}px ${FONT}`;
    if (ctx.measureText("BLINK SCORE").width <= chord * 0.82) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("BLINK SCORE", cx, ringY + capY);
    }
  };

  /**
   * Everything between the ring and the bottom block, measured before any of
   * it is drawn.
   *
   * The card now carries more than it used to — a perception read and a scored
   * signal on top of the tier, headline and traits — and a square is 840px
   * shorter than a story. Drawing top-down and hoping would put the traits
   * through the stats row on 1:1. So each block reports its height first, the
   * optional ones are dropped from the bottom of the priority list until the
   * stack fits, and the leftover space becomes the gaps. Nothing can clip,
   * and no format needs its own hand-tuned constants.
   */
  interface Block {
    height: number;
    /** Dropped, lowest priority first, when the stack doesn't fit. */
    optional?: boolean;
    draw: (top: number) => void;
  }

  const blocks: Block[] = [];

  // ---- Tier chip (required) ----------------------------------------------
  {
    const chipH = W * 0.072;
    blocks.push({
      height: chipH,
      draw: (top) => {
        ctx.font = `700 ${Math.round(W * 0.031)}px ${FONT}`;
        const chipW = ctx.measureText(data.tier).width + W * 0.085;
        ctx.fillStyle = "rgba(175,224,249,0.16)";
        roundRect(ctx, cx - chipW / 2, top, chipW, chipH, chipH / 2);
        ctx.fill();
        ctx.fillStyle = SKY;
        ctx.textAlign = "center";
        ctx.fillText(data.tier, cx, top + chipH / 2);
      },
    });
  }

  // ---- Headline (required) ------------------------------------------------
  {
    ctx.font = `800 ${Math.round(W * L.headlineSize)}px ${FONT}`;
    const lines = wrapLines(ctx, data.headline, contentWidth, 2);
    const lineHeight = W * L.headlineSize * 1.24;
    blocks.push({
      height: lines.length * lineHeight,
      draw: (top) => {
        ctx.fillStyle = WHITE;
        ctx.font = `800 ${Math.round(W * L.headlineSize)}px ${FONT}`;
        ctx.textAlign = "center";
        let ly = top;
        for (const line of lines) {
          ctx.fillText(line, cx, ly + lineHeight / 2);
          ly += lineHeight;
        }
      },
    });
  }

  // ---- The crush read — the reason anyone forwards this -------------------
  if (data.lens) {
    const lens = data.lens;
    const kickerSize = Math.round(W * 0.024);
    const bodySize = Math.round(W * 0.036);
    const bodyLead = bodySize * 1.34;
    const padX = W * 0.05;
    const padY = W * 0.030;

    ctx.font = `500 ${bodySize}px ${FONT}`;
    const lines = wrapLines(ctx, `“${lens.summary}”`, contentWidth - padX * 2, LENS_LINES[format.id]);
    const boxH = padY * 2 + kickerSize * 1.6 + lines.length * bodyLead;

    blocks.push({
      height: boxH,
      optional: true,
      draw: (top) => {
        ctx.fillStyle = "rgba(244,114,182,0.10)";
        roundRect(ctx, pad, top, contentWidth, boxH, W * 0.035);
        ctx.fill();
        ctx.strokeStyle = "rgba(244,114,182,0.22)";
        ctx.lineWidth = Math.max(1, W * 0.0016);
        roundRect(ctx, pad, top, contentWidth, boxH, W * 0.035);
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = `700 ${kickerSize}px ${FONT}`;
        ctx.fillText(
          `${lens.emoji}  ${lens.label.toUpperCase()}`,
          cx,
          top + padY + kickerSize * 0.6,
        );

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = `500 ${bodySize}px ${FONT}`;
        let ly = top + padY + kickerSize * 1.6;
        for (const line of lines) {
          ctx.fillText(line, cx, ly + bodyLead / 2);
          ly += bodyLead;
        }
      },
    });
  }

  // ---- The loudest signal, with its number --------------------------------
  if (data.signal) {
    const sig = data.signal;
    const labelSize = Math.round(W * 0.026);
    const barH = W * 0.018;
    const rowH = labelSize * 1.5 + barH;

    blocks.push({
      height: rowH,
      optional: true,
      draw: (top) => {
        const barW = contentWidth * 0.78;
        const barX = cx - barW / 2;

        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = `700 ${labelSize}px ${FONT}`;
        ctx.fillText(sig.label.toUpperCase(), barX, top + labelSize * 0.6);

        ctx.textAlign = "right";
        ctx.fillStyle = WHITE;
        ctx.font = `800 ${Math.round(W * 0.032)}px ${FONT}`;
        ctx.fillText(sig.score.toFixed(1), barX + barW, top + labelSize * 0.6);

        const barY = top + labelSize * 1.5;
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        roundRect(ctx, barX, barY, barW, barH, barH / 2);
        ctx.fill();
        const pct = Math.max(0, Math.min(1, sig.score / 10));
        if (pct > 0) {
          ctx.fillStyle = SKY;
          roundRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, barH / 2);
          ctx.fill();
        }
        ctx.textAlign = "center";
      },
    });
  }

  // ---- Traits -------------------------------------------------------------
  if (data.traits.length > 0) {
    const chipHeight = W * 0.062;
    blocks.push({
      height: chipHeight,
      optional: true,
      draw: (top) => {
        ctx.font = `600 ${Math.round(W * 0.029)}px ${FONT}`;
        ctx.textAlign = "center";
        const gap = W * 0.02;
        const widths = data.traits.map((t) => ctx.measureText(t).width + W * 0.058);

        // Drop traits that would run past the edge rather than letting them
        // clip — this is what broke on the square format.
        let usable = data.traits.length;
        let running = widths.reduce((a, b) => a + b, 0) + gap * (usable - 1);
        while (usable > 1 && running > contentWidth) {
          usable -= 1;
          running = widths.slice(0, usable).reduce((a, b) => a + b, 0) + gap * (usable - 1);
        }

        let x = cx - running / 2;
        for (let i = 0; i < usable; i++) {
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          roundRect(ctx, x, top, widths[i], chipHeight, chipHeight / 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fillText(data.traits[i], x + widths[i] / 2, top + chipHeight / 2);
          x += widths[i] + gap;
        }
      },
    });
  }

  // ---- Size the ring, fit the stack, then place both ----------------------
  const hasStats = data.rank !== null || data.category !== null;
  const bottomTop = H - H * L.statsFromBottom - W * (hasStats ? 0.075 : 0.02);
  const minGap = W * 0.02;

  // How much room the blocks want, before the ring takes its share.
  const wanted = blocks.reduce((sum, blk) => sum + blk.height, 0) + minGap * (blocks.length - 1);
  const forRing = bottomTop - headerBottom - W * L.gapAfterRing - wanted - minGap;
  // The band is wide: a full card settles near the format's nominal radius, a
  // nearly-empty one grows the ring to fill what would otherwise be a void.
  const radius = Math.max(
    W * L.ringRadius * 0.72,
    Math.min(W * L.ringRadius * 1.5, forRing / 2),
  );
  const ringY = headerBottom + W * L.gapAfterRing + radius;
  drawRing(radius, ringY);

  y = ringY + radius;
  const available = bottomTop - y;

  const chosen = [...blocks];
  const stackHeight = () => chosen.reduce((sum, blk) => sum + blk.height, 0);
  // Drop the least important optional block until the stack plus its minimum
  // gaps fits. Required blocks are never dropped — if they alone overflow the
  // card, the format itself is wrong and that is a bug worth seeing.
  while (
    stackHeight() + minGap * (chosen.length - 1) > available &&
    chosen.some((blk) => blk.optional)
  ) {
    for (let i = chosen.length - 1; i >= 0; i--) {
      if (chosen[i].optional) {
        chosen.splice(i, 1);
        break;
      }
    }
  }

  // Spread whatever is left over evenly, so the card never has a dead band.
  const slack = Math.max(0, available - stackHeight());
  const gap = chosen.length > 1 ? Math.min(W * 0.075, slack / (chosen.length - 1)) : 0;

  let cursor = y + Math.max(minGap, (available - stackHeight() - gap * (chosen.length - 1)) / 2);
  for (const blk of chosen) {
    blk.draw(cursor);
    cursor += blk.height + gap;
  }

  ctx.textAlign = "center";

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
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `700 ${Math.round(W * 0.022)}px ${FONT}`;
      ctx.fillText(label, colX, rowY);
      ctx.fillStyle = WHITE;
      ctx.font = `800 ${Math.round(W * 0.042)}px ${FONT}`;
      // A category like "photography-and-visual-storytelling" is wider than
      // its column and used to run off the edge of the card entirely. Values
      // are centred, so overflow escaped on both sides at once.
      ctx.fillText(fitText(ctx, value, colWidth - W * 0.02), colX, rowY + W * 0.055);
    });
  }

  // The footer is the only line on the card addressed to the viewer rather
  // than about the subject. It names the thing they just read — a perception,
  // not a score — because that is what makes someone want their own.
  {
    const footY = H - H * L.footerFromBottom;
    const size = Math.round(W * 0.026);
    ctx.font = `600 ${size}px ${FONT}`;
    const lead = "See how people see you  ·  ";
    ctx.font = `800 ${size}px ${FONT}`;
    const markW = ctx.measureText("Blink").width;
    ctx.font = `600 ${size}px ${FONT}`;
    const leadW = ctx.measureText(lead).width;

    ctx.textAlign = "left";
    const startX = cx - (leadW + markW) / 2;
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillText(lead, startX, footY);
    ctx.fillStyle = SKY;
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.fillText("Blink", startX + leadW, footY);
    ctx.textAlign = "center";
  }

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
