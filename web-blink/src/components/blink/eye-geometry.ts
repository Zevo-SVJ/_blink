/**
 * Blink — the shapes the eye is made of.
 *
 * Pure geometry, kept apart from the component so it can be reasoned about and
 * checked numerically. Everything here is deterministic and takes no argument
 * but openness, which is what lets the same functions render identically
 * during the build-time prerender and in the browser.
 *
 * ## The drawing box
 *
 * Wider and taller than the eye on purpose. The eye occupies the middle half;
 * the margin is where the atmosphere lives. Sizing the whole thing from one
 * `width` on the <svg> then keeps the eye and the material around it locked in
 * proportion at every viewport, with nothing measured at runtime.
 */

export const W = 1400;
export const H = 1200;
export const CX = W / 2;
export const CY = H / 2;

/**
 * Half the eye's width.
 *
 * The eye is a bit over a third of the box now. The rest is not margin — it is
 * where the atmosphere lives, and it needs to be large enough that the
 * material can be a part of the composition rather than a trim around the
 * edge of the drawing.
 */
export const EYE = 250;
export const X0 = CX - EYE;
export const X1 = CX + EYE;

/** Apex travel at full open. The upper lid does more of the work. */
const RISE = 118;
const DROP = 72;

/**
 * Where the lid's control points sit, as fractions of the half-width and of
 * the apex height.
 *
 * Two cubics per lid rather than one. A single cubic couples the corner angle
 * to the fullness of the arch — sharpen the corners and the whole lid goes
 * slack. Splitting at the apex separates them: `CORNER` sets how pointed the
 * canthus is, `ARCH` how full the curve is over the iris, and the apex is an
 * on-path point, which also means the aperture's exact height is known rather
 * than derived from a control offset.
 */
const CORNER = 0.3;
const CORNER_H = 0.62;
const ARCH = 0.44;

/**
 * How much of the opening passes before the lower lid begins to move.
 *
 * Eyes do not open symmetrically: the upper lid does nearly all of the early
 * work. Opening both at once read as a shape splitting in half rather than as
 * a lid lifting.
 */
const LOWER_DELAY = 0.2;

/**
 * The closed lid is not flat.
 *
 * A dead-straight line reads as a divider rule somebody forgot to remove; a
 * shallow downward bow reads as a closed eye. Squared, so it is gone almost as
 * soon as the eye starts to move — decayed linearly it was still a third of
 * its depth at a third open, where the aperture is only a few units tall, and
 * it dragged the whole opening below the line it started on.
 */
const REST_BOW = 14;

const bow = (p: number) => REST_BOW * (1 - p) ** 2;
const lowerAt = (p: number) => Math.max(0, (p - LOWER_DELAY) / (1 - LOWER_DELAY));

/** Trim float noise out of path data; SVG does not need 15 decimal places. */
const f = (n: number) => Math.round(n * 100) / 100;

/**
 * The aperture's apex offsets from the midline: negative up, positive down.
 *
 * At rest both are `bow`, so the two lids coincide, the path encloses no area,
 * and what remains visible is a single relaxed arc.
 */
export function apex(p: number): { up: number; down: number } {
  return { up: -RISE * p + bow(p), down: DROP * lowerAt(p) + bow(p) };
}

/** The lids at openness `p` (0 shut, 1 wide), as one closed path. */
export function lids(p: number): string {
  const { up, down } = apex(p);
  const cUp = CORNER_H * up;
  const cDown = CORNER_H * down;
  const corner = CORNER * EYE;
  const arch = ARCH * EYE;

  return [
    `M ${X0} ${CY}`,
    `C ${f(X0 + corner)} ${f(CY + cUp)}, ${f(CX - arch)} ${f(CY + up)}, ${CX} ${f(CY + up)}`,
    `C ${f(CX + arch)} ${f(CY + up)}, ${f(X1 - corner)} ${f(CY + cUp)}, ${X1} ${CY}`,
    `C ${f(X1 - corner)} ${f(CY + cDown)}, ${f(CX + arch)} ${f(CY + down)}, ${CX} ${f(CY + down)}`,
    `C ${f(CX - arch)} ${f(CY + down)}, ${f(X0 + corner)} ${f(CY + cDown)}, ${X0} ${CY}`,
    "Z",
  ].join(" ");
}

/** The iris at full open, and the pupil as a fraction of it. */
const IRIS = 66;
export const PUPIL_RATIO = 0.4;

/**
 * Clearance the iris keeps from both lids — and, usefully, what stops it
 * existing at all until the eye can hold one. Without it the iris was drawn at
 * a two-unit radius inside a sliver, which renders as a speck with a darker
 * speck punched out of it: dirt on the screen, not an eye beginning to open.
 */
const CLEARANCE = 14;
const FIT = 0.86;

/** Dead centre of the aperture, which is not the centre of the box. */
export function irisCentre(p: number): number {
  const { up, down } = apex(p);
  return CY + (up + down) / 2;
}

/** Always inside the aperture, so the lids can never slice the ring. */
export function irisRadius(p: number): number {
  const { up, down } = apex(p);
  const room = (down - up) / 2 - CLEARANCE;
  if (room <= 0) return 0;
  return Math.min(IRIS * p, FIT * room);
}

// ---------------------------------------------------------------------------
// The atmosphere
// ---------------------------------------------------------------------------
//
// ## Why this is not drawn with lines
//
// The first version made the material out of thin stroked filaments. They were
// pretty up close and they vanished entirely the moment the page was viewed at
// any distance — a 1.4-unit stroke at a third opacity has no mass, so there was
// nothing there to see. Volume cannot be drawn with outlines.
//
// So the material is now built the way smoke and ink actually read: many
// heavily elongated, softly-filled forms, overlapping at low individual
// opacity. No single one is identifiable as a shape; where several cross, the
// density rises; where they thin out, it falls. That variation is the whole
// effect, and it survives being looked at small, which is the test that
// matters.
//
// ## Why they are smeared along a spine
//
// Each plume is a curve with forms distributed along it — growing and fading
// as they travel, rotated to the tangent. That is what makes a plume look like
// something *moving away from a source* rather than a cluster placed nearby.
// Every spine begins on the eye itself, at a canthus or against a lid.
//
// Softness comes from gradients. A Gaussian blur over an area this size,
// re-rasterised on every scroll frame, is the one thing here that could
// genuinely cost frames; a gradient that reaches zero at its own edge costs
// nothing and is indistinguishable at these opacities.

export interface Vapour {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Degrees, aligned to the spine's tangent. */
  rot: number;
  opacity: number;
}

export interface Plume {
  /** Where it leaves the eye. The whole plume grows outward from this point. */
  origin: [number, number];
  vapour: Vapour[];
  /** Crisp strands running through the mass, for structure. */
  strands: string[];
  /** Fraction of the opening passed before this plume starts to form. */
  delay: number;
}

interface Spine {
  from: [number, number];
  to: [number, number];
  /** Perpendicular pull on the control point — how much the plume curls. */
  bow: number;
  /** Width of the forms at the source, and how much they swell travelling. */
  seed: number;
  swell: number;
  /** How elongated they are at the source; they round out as they disperse. */
  stretch: number;
  weight: number;
  count: number;
  delay: number;
  /** Whether a strand runs through it. Only the arcs carry one. */
  strand?: boolean;
}

/**
 * A quadratic through `from` and `to`, bowed sideways.
 *
 * Sampled rather than emitted as a path, because what travels along it is a
 * procession of forms, not a stroke.
 */
function along(s: Spine, t: number): { x: number; y: number; angle: number } {
  const [x0, y0] = s.from;
  const [x2, y2] = s.to;
  const dx = x2 - x0;
  const dy = y2 - y0;
  const len = Math.hypot(dx, dy) || 1;
  // Control point: halfway, pushed along the normal.
  const cxp = (x0 + x2) / 2 - (dy / len) * s.bow;
  const cyp = (y0 + y2) / 2 + (dx / len) * s.bow;

  const u = 1 - t;
  const x = u * u * x0 + 2 * u * t * cxp + t * t * x2;
  const y = u * u * y0 + 2 * u * t * cyp + t * t * y2;
  // Derivative, for the tangent the forms align to.
  const tx = 2 * u * (cxp - x0) + 2 * t * (x2 - cxp);
  const ty = 2 * u * (cyp - y0) + 2 * t * (y2 - cyp);
  return { x, y, angle: (Math.atan2(ty, tx) * 180) / Math.PI };
}

function vapourOf(s: Spine): Vapour[] {
  return Array.from({ length: s.count }, (_, i) => {
    const t = i / (s.count - 1);
    const { x, y, angle } = along(s, t);
    // Swells and rounds out as it disperses, and fades faster than it grows —
    // which is what stops the far end reading as a solid tail.
    const rx = s.seed * (1 + t * s.swell);
    const stretch = s.stretch - t * (s.stretch - 1.7);
    return {
      cx: f(x),
      cy: f(y),
      rx: f(rx),
      ry: f(rx / stretch),
      rot: f(angle),
      opacity: f(s.weight * (1 - t) ** 1.35 * 100) / 100,
    };
  });
}

/** A slack line traced along the spine, for the strands inside the mass. */
function strandOf(s: Spine, offset: number, wobble: number): string {
  const steps = 7;
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const { x, y, angle } = along(s, t);
    const rad = ((angle + 90) * Math.PI) / 180;
    const push = offset + Math.sin(t * Math.PI * 2.2) * wobble * (1 - t * 0.5);
    return [f(x + Math.cos(rad) * push), f(y + Math.sin(rad) * push)];
  });

  // Catmull-Rom through the samples, as cubics, so it reads as one gesture.
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [f(p1[0] + (p2[0] - p0[0]) / 6), f(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [f(p2[0] - (p3[0] - p1[0]) / 6), f(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/*
  Hand-placed, and deliberately not mirrored.

  A seeded scatter gives an even spread, and an even spread is what makes
  generated art look generated. The two sides carry different numbers of
  plumes, at different angles and lengths, and the pair that leaves the lids
  vertically keeps the eye inside the material rather than flanked by it.
*/
const SPINES: Spine[] = [
  /*
    Arcs: the long gestures that give the material direction.

    Five, not eight, and deliberately lopsided. Four a side at even angles read
    as a starburst — a wheel of trails radiating from two hubs — which is
    exactly the sci-fi vortex this is meant not to be. Structure should be
    something the eye finds, not a pattern it recognises immediately.
  */
  { from: [X0 + 4, CY], to: [-80, 232], bow: 168, seed: 54, swell: 2.6, stretch: 4.2, weight: 0.5, count: 12, delay: 0.04, strand: true },
  { from: [X0 + 12, CY - 8], to: [330, 1120], bow: -86, seed: 46, swell: 2.9, stretch: 3.8, weight: 0.4, count: 11, delay: 0.18, strand: true },
  { from: [X1 - 4, CY], to: [1500, 560], bow: -86, seed: 56, swell: 2.5, stretch: 4.4, weight: 0.48, count: 12, delay: 0.02, strand: true },
  { from: [X1 - 12, CY + 8], to: [1180, 1160], bow: 176, seed: 48, swell: 2.8, stretch: 3.7, weight: 0.38, count: 11, delay: 0.22, strand: true },
  { from: [CX - 110, CY - 84], to: [470, 40], bow: 110, seed: 40, swell: 2.9, stretch: 3.2, weight: 0.32, count: 10, delay: 0.36, strand: true },

  /*
    Pools: broad, slow, low-contrast masses.

    These are what turn trails into weather. Wide and barely visible on their
    own, they fill the space between the arcs and overlap them, so density
    varies across the picture instead of every part of it being the same
    ribbon at the same weight. Without them the composition had structure and
    no substance.
  */
  { from: [X0 + 30, CY - 20], to: [250, 380], bow: 60, seed: 96, swell: 1.5, stretch: 2.3, weight: 0.22, count: 7, delay: 0.1 },
  { from: [X1 - 30, CY + 20], to: [1150, 830], bow: -70, seed: 100, swell: 1.4, stretch: 2.2, weight: 0.2, count: 7, delay: 0.14 },
  { from: [CX, CY - 90], to: [760, 210], bow: -40, seed: 88, swell: 1.6, stretch: 2.5, weight: 0.18, count: 7, delay: 0.3 },
  { from: [CX - 40, CY + 92], to: [520, 1000], bow: 50, seed: 92, swell: 1.5, stretch: 2.4, weight: 0.16, count: 7, delay: 0.42 },
  { from: [X0 + 20, CY + 30], to: [60, 780], bow: -40, seed: 78, swell: 1.6, stretch: 2.6, weight: 0.18, count: 7, delay: 0.5 },

  /* The lower half was thinner than the upper one, which read as the material
     rising rather than surrounding — and left the bottom of the frame dead. */
  { from: [CX + 70, CY + 88], to: [1010, 1160], bow: 96, seed: 90, swell: 1.5, stretch: 2.3, weight: 0.19, count: 7, delay: 0.34 },
  { from: [X0 + 46, CY + 44], to: [300, 1080], bow: -60, seed: 84, swell: 1.6, stretch: 2.5, weight: 0.17, count: 7, delay: 0.46 },

  /* Far field: almost nothing, very wide. Depth, rather than detail. */
  { from: [X1 - 20, CY - 30], to: [1420, 120], bow: -90, seed: 120, swell: 1.3, stretch: 2.8, weight: 0.11, count: 6, delay: 0.55 },
  { from: [X0 + 20, CY + 10], to: [-40, 1120], bow: 80, seed: 116, swell: 1.3, stretch: 2.7, weight: 0.1, count: 6, delay: 0.6 },
];

export const PLUMES: Plume[] = SPINES.map((s, i) => ({
  origin: s.from,
  vapour: vapourOf(s),
  /*
    One per plume, riding just off its spine.

    Two apiece, drawn as hairlines, read as scratches over the picture rather
    than as structure inside it: too thin to belong to the mass, too hard to
    belong to the light. One thicker, fainter line per plume sits *in* the
    material instead of on top of it.
  */
  strands: s.strand ? [strandOf(s, s.seed * (i % 2 === 0 ? -0.3 : 0.34), 14)] : [],
  delay: s.delay,
}));

export interface Speck {
  x: number;
  y: number;
  r: number;
  opacity: number;
  delay: number;
}

/**
 * Motes, carried by the plumes rather than sprinkled over the box.
 *
 * Scattered freely they read as noise over a picture. Riding the spines the
 * material already follows, they look like the same substance — denser near
 * the eye, thinning as it disperses.
 */
export const SPECKS: Speck[] = SPINES.filter((s) => s.strand).flatMap((s, i) =>
  [0.18, 0.36, 0.56, 0.78].map((t, j) => {
    const { x, y, angle } = along(s, t);
    const rad = ((angle + 90) * Math.PI) / 180;
    const push = (((i * 5 + j * 11) % 9) - 4) * 7;
    return {
      x: f(x + Math.cos(rad) * push),
      y: f(y + Math.sin(rad) * push),
      r: j === 1 ? 2.6 : j === 0 ? 2.1 : 1.6,
      opacity: 0.5 * (1 - t) + 0.12,
      delay: Math.min(0.84, s.delay + t * 0.3),
    };
  }),
);
