/**
 * Resize an image File to a raw-base64 JPEG within a byte budget.
 *
 * Vercel's AI Gateway rejects request bodies above ~4.5 MB. Base64 adds ~33%
 * overhead, so we target 3 MB raw. We walk a compression ladder until we fit.
 *
 * This is the web equivalent of the Expo resize-for-upload helper.
 */

const DEFAULT_MAX_BYTES = 3_000_000;

const LADDER = [
  { width: 1280, quality: 0.82 },
  { width: 1024, quality: 0.78 },
  { width: 832, quality: 0.74 },
  { width: 640, quality: 0.7 },
  { width: 512, quality: 0.65 },
] as const;

const stripDataUriPrefix = (b64: string): string => {
  if (!b64.startsWith("data:")) return b64;
  const comma = b64.indexOf(",");
  return comma === -1 ? b64 : b64.slice(comma + 1);
};

/** Load a File into an HTMLImageElement. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("IMAGE_DECODE_FAILED"));
    };
    img.src = url;
  });
}

/** Draw image to canvas at target width, return JPEG base64 (without data: prefix). */
function encodeToBase64(
  img: HTMLImageElement,
  targetWidth: number,
  quality: number,
): string {
  const ratio = img.height / img.width;
  const w = Math.min(targetWidth, img.naturalWidth);
  const h = Math.round(w * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNSUPPORTED");
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return stripDataUriPrefix(dataUrl);
}

/** Get byte length of a base64 string. */
function base64Bytes(b64: string): number {
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
}

/**
 * Resize a File to a raw-base64 JPEG that fits within maxBytes.
 * Throws IMAGE_TOO_LARGE if no step in the ladder fits.
 */
export async function resizeForUpload(
  file: File,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const img = await loadImage(file);

  for (const step of LADDER) {
    const base64 = encodeToBase64(img, step.width, step.quality);
    if (base64Bytes(base64) <= maxBytes) {
      return { base64, mimeType: "image/jpeg" };
    }
  }

  throw new Error("IMAGE_TOO_LARGE");
}
