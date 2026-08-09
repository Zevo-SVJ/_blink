/**
 * Blink — profile picture upload.
 *
 * Downscales to a square thumbnail before upload. Leaderboard rows render it
 * at ~40px and a profile header at ~80px, so anything beyond 256px is wasted
 * bytes on a screen that loads fifty of them at once.
 *
 * Stored in Supabase Storage at `<user-id>/avatar.jpg` — the path encodes
 * ownership, which is what the bucket's RLS policies key off.
 */

import { supabase } from "@/lib/supabase";

const BUCKET = "avatars";
const SIZE = 256;
const QUALITY = 0.86;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type AvatarResult =
  | { status: "ok"; url: string }
  | { status: "error"; message: string };

/** Centre-crop to a square and downscale. Returns a JPEG blob. */
async function toSquareThumbnail(file: File): Promise<Blob> {
  const bitmap = await loadImage(file);

  // Centre crop: take the largest square that fits, so faces stay centred
  // rather than the image being squashed to fit.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNSUPPORTED");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("ENCODE_FAILED"))),
      "image/jpeg",
      QUALITY,
    );
  });
}

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
      reject(new Error("DECODE_FAILED"));
    };
    img.src = url;
  });
}

/**
 * Upload a new profile picture and return its public URL.
 *
 * Upserts to a fixed path so a user only ever has one avatar object. A cache
 * key is appended to the returned URL because the path never changes — without
 * it the browser would keep showing the previous picture.
 */
export async function uploadAvatar(userId: string, file: File): Promise<AvatarResult> {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    return { status: "error", message: "Choose a PNG, JPG or WEBP image." };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return { status: "error", message: "That image is too large. Try one under 12MB." };
  }

  let thumbnail: Blob;
  try {
    thumbnail = await toSquareThumbnail(file);
  } catch (err) {
    console.error("[uploadAvatar] resize failed", err);
    return { status: "error", message: "Blink couldn't read that image. Try another one." };
  }

  const path = `${userId}/avatar.jpg`;

  try {
    const { error } = await supabase.storage.from(BUCKET).upload(path, thumbnail, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (error) {
      console.error("[uploadAvatar] storage error", error.message);
      // A missing bucket means migration 0003 hasn't been applied yet; say
      // something actionable rather than "upload failed".
      const missingBucket = /bucket.*not found/i.test(error.message);
      return {
        status: "error",
        message: missingBucket
          ? "Profile pictures aren't enabled on this project yet."
          : "Blink couldn't upload that picture. Try again.",
      };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { status: "ok", url: `${data.publicUrl}?v=${Date.now()}` };
  } catch (err) {
    console.error("[uploadAvatar] exception", err);
    return { status: "error", message: "Blink couldn't upload that picture. Try again." };
  }
}
