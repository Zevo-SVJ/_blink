/**
 * Blink — reading the @handle off a screenshot.
 *
 * ## Why this is best-effort by design
 *
 * The goal is that nobody types a username that is already visible in the
 * image they just picked. Getting there needs OCR, and there are exactly three
 * ways to do OCR here, all with real costs:
 *
 *  1. **The browser's own `TextDetector`.** Free, no bundle cost, no network,
 *     no data leaving the device. Only shipped in Chromium on Android and
 *     ChromeOS. This is what we use when it exists.
 *  2. **A WASM OCR bundle** (Tesseract and friends). Works everywhere, costs
 *     ~2 MB and several seconds on a phone — for a field the user can type in
 *     two. Not worth it.
 *  3. **The `analyze` edge function**, which already extracts the handle. It
 *     is also a full analysis, which is precisely what this flow must not
 *     trigger.
 *
 * So: try (1), and hand back `null` otherwise. The caller keeps a text field
 * for the fallback and pre-fills it when detection worked. That is a real
 * feature where it is supported and an honest blank where it isn't — never a
 * spinner that pretends to be doing something.
 *
 * When a server-side OCR endpoint exists, `detectHandle` is the single place
 * to call it; nothing else in the flow needs to change.
 */

/** The subset of the Shape Detection API we use, typed here because it is not in lib.dom. */
interface DetectedText {
  rawValue: string;
  boundingBox: { y: number };
}

interface TextDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<DetectedText[]>;
}

type WithTextDetector = typeof globalThis & {
  TextDetector?: new () => TextDetectorLike;
};

/** Instagram handles: letters, digits, dots, underscores, up to 30 chars. */
const HANDLE = /^[a-z0-9](?:[a-z0-9._]{0,28}[a-z0-9])?$/;

/** Words that look like handles on a profile screenshot but aren't. */
const NOT_A_HANDLE = new Set([
  "posts",
  "followers",
  "following",
  "follow",
  "message",
  "instagram",
  "edit",
  "profile",
  "share",
  "contact",
  "email",
  "call",
  "www",
  "com",
  "http",
  "https",
  "search",
  "explore",
  "reels",
  "story",
  "highlights",
  "verified",
]);

export interface HandleGuess {
  handle: string;
  /** How sure we are. Below 0.5 the caller should not pre-fill silently. */
  confidence: number;
}

/** True when this device can read text out of an image without a download. */
export function canDetectHandle(): boolean {
  return typeof (globalThis as WithTextDetector).TextDetector === "function";
}

/**
 * Best guess at the @handle in a profile screenshot.
 *
 * Resolves to `null` whenever detection is unavailable, fails, or finds
 * nothing convincing — never throws, and never blocks the flow.
 */
export async function detectHandle(file: File): Promise<HandleGuess | null> {
  const Detector = (globalThis as WithTextDetector).TextDetector;
  if (typeof Detector !== "function") return null;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const lines = await new Detector().detect(bitmap);
    return pickHandle(lines, bitmap.height);
  } catch {
    return null;
  } finally {
    bitmap?.close?.();
  }
}

/**
 * Choose the most handle-like string from detected text.
 *
 * Exported for tests: the scoring is the part worth pinning down, and it can
 * be exercised without a `TextDetector`.
 */
export function pickHandle(lines: DetectedText[], imageHeight: number): HandleGuess | null {
  let best: HandleGuess | null = null;

  for (const line of lines) {
    for (const rawToken of line.rawValue.split(/\s+/)) {
      const explicit = rawToken.startsWith("@");
      const token = rawToken.replace(/^@/, "").trim().toLowerCase();

      if (!HANDLE.test(token)) continue;
      if (NOT_A_HANDLE.has(token)) continue;
      // A bare word with no handle punctuation is probably a display name.
      if (!explicit && !/[._\d]/.test(token)) continue;

      let confidence = explicit ? 0.9 : 0.55;

      // The handle sits near the top of a profile screenshot. Further down it
      // is far more likely to be a caption, a tag or a comment — and a flat
      // penalty wasn't enough: an explicit `@name` at 90% of the height still
      // scored 0.6 and got auto-filled. The penalty now grows with depth, so a
      // tightly-cropped header still passes while a comment cannot.
      const relativeY = imageHeight > 0 ? line.boundingBox.y / imageHeight : 0;
      if (relativeY > 0.35) {
        confidence -= Math.min(0.6, (0.6 * (relativeY - 0.35)) / 0.65);
      } else if (relativeY < 0.2) {
        confidence += 0.05;
      }

      if (token.length < 3) confidence -= 0.2;

      if (!best || confidence > best.confidence) {
        best = { handle: token, confidence: Math.max(0, Math.min(1, confidence)) };
      }
    }
  }

  return best && best.confidence >= 0.5 ? best : null;
}
