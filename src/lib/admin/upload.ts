"use client";

import { upload } from "@vercel/blob/client";
import type { StoredImage } from "@shared/types";
import { firebase } from "@/lib/firebase/client";

const MAX_EDGE = 2400;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Downscale very large photos in the browser and convert to WebP before upload. */
async function prepare(file: File): Promise<{ blob: Blob; width: number; height: number; type: string }> {
  if (!ACCEPTED.includes(file.type)) throw new Error(`${file.name}: use a JPG, PNG, WebP or AVIF image.`);
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, width: 0, height: 0, type: file.type };
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  if (scale === 1 && file.type === "image/webp" && file.size < 1.5 * 1024 * 1024) {
    return { blob: file, width, height, type: file.type };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.86));
  if (!blob) return { blob: file, width, height, type: file.type };
  return { blob, width, height, type: "image/webp" };
}

/**
 * Uploads a photo straight from the browser to Vercel Blob. The site's
 * /api/admin/upload route only hands out an upload token to signed-in admins.
 */
export async function uploadImage(file: File, folder: string, onProgress?: (pct: number) => void): Promise<StoredImage> {
  const user = firebase().auth.currentUser;
  if (!user) throw new Error("Your session has ended. Sign in again.");
  const { blob, width, height, type } = await prepare(file);
  if (blob.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB after compression.`);
  const ext = type === "image/webp" ? "webp" : type.split("/")[1];
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  const pathname = `${folder.replace(/^\/+|\/+$/g, "")}/${id}.${ext}`;
  const result = await upload(pathname, blob, {
    access: "public",
    contentType: type,
    handleUploadUrl: "/api/admin/upload",
    headers: { authorization: `Bearer ${await user.getIdToken()}` },
    onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
  });
  return { path: result.pathname, url: result.url, alt: "", ...(width ? { width, height } : {}) };
}
