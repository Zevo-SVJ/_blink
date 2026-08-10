/**
 * Geometry for the "How it works" perception fan.
 *
 * Lives apart from the component so the spacing rule can be asserted rather
 * than eyeballed — this is the third time a radial layout in this codebase has
 * shipped with one label pressed against the centre, and each time the cause
 * was the same: a single radius measured to each node's *centre*.
 *
 * A chip is far wider than it is tall. Placing six of them on one radius gives
 * the ones on the horizontal axis roughly half the visible clearance of the
 * ones above and below, because half their width sits inside the gap. Nodes
 * are therefore anchored by the **edge facing the core**, so the visible gap is
 * the same in every direction whatever a label happens to say.
 */

/** Clearance between the core's edge and the nearest edge of any node. */
export const FAN_CLEARANCE = 58;

/** Radius of the core node. */
export const FAN_CORE = 34;

/**
 * Where each perspective sits, in degrees clockwise from three o'clock.
 *
 * Six slots skipping straight up and straight down, so no label shares the
 * vertical axis with the core.
 *
 * The four off-axis slots sit at 40°, not the even 30° a hexagon would want.
 * At 30° the widest label ("recruiter") reaches 148px from the centre and
 * breaks out of the 288px column a 320px phone leaves — the extra 10° trades
 * a little symmetry for staying inside the page, and the test below is what
 * keeps that trade honest if the labels ever change.
 */
export const FAN_SLOTS = [-140, -90, -40, 40, 90, 140];

/**
 * Rough half-width of a chip, in px, from its label.
 *
 * An estimate rather than a measurement on purpose: measuring six absolutely
 * positioned nodes on every resize costs a layout pass per frame, and being a
 * few pixels out is invisible, while being tens of pixels out — which is what
 * a fixed radius gives you — is not.
 */
export function estimateHalfWidth(label: string): number {
  // ~5.4px per character at 10px bold, plus the emoji, plus horizontal padding.
  return (label.length * 5.4 + 14 + 20) / 2;
}

/** Half-height of a chip. Constant: they are all one line of one size. */
export const FAN_HALF_HEIGHT = 13;

/**
 * Offset from the centre for a node at `angle`, anchored by its inner edge.
 */
export function nodeOffset(
  angle: number,
  halfW: number,
  halfH: number = FAN_HALF_HEIGHT,
): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Core radius, plus the gap, plus however much of the node lies between its
  // centre and the edge that faces the core.
  const reach = FAN_CORE + FAN_CLEARANCE + Math.abs(cos) * halfW + Math.abs(sin) * halfH;
  return { x: cos * reach, y: sin * reach };
}

/**
 * The visible gap between the core's edge and a node's inner edge.
 *
 * Exposed so a test can assert the thing that actually matters — what the eye
 * sees — rather than the inputs that produce it.
 */
export function edgeClearance(angle: number, halfW: number, halfH = FAN_HALF_HEIGHT): number {
  const { x, y } = nodeOffset(angle, halfW, halfH);
  const distance = Math.hypot(x, y);
  const rad = Math.atan2(y, x);
  const halfAlongRay = Math.abs(Math.cos(rad)) * halfW + Math.abs(Math.sin(rad)) * halfH;
  return distance - FAN_CORE - halfAlongRay;
}
