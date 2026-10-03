import type { Star } from "./types";

export const PHOTO_BUCKET = "dream-photos";

export function photoUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** Accepts open.spotify.com/track/..., intl links, or spotify:track:... */
export function spotifyTrackId(input: string): string | null {
  const m = input.match(
    /(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/|spotify:track:)([A-Za-z0-9]{22})/
  );
  return m ? m[1] : null;
}

/** Fuller dreams shine brighter. */
export function starRadius(s: Pick<Star, "body" | "photo_path" | "spotify_track_id">) {
  return 3.4 + (s.body ? 1 : 0) + (s.photo_path ? 1.3 : 0) + (s.spotify_track_id ? 1.3 : 0);
}

/** Connection rows always store the smaller uuid first (matches the DB check). */
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Resize a photo in the browser so uploads stay small. */
export async function downscaleImage(file: File, max = 1080): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read photo"))), "image/jpeg", 0.8)
  );
}

export function randomSlug() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `tala-${s}`;
}
