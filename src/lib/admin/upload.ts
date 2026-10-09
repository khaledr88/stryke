"use client";

import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
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

export async function uploadImage(file: File, folder: string, onProgress?: (pct: number) => void): Promise<StoredImage> {
  const { blob, width, height, type } = await prepare(file);
  if (blob.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB after compression.`);
  const ext = type === "image/webp" ? "webp" : type.split("/")[1];
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  const path = `${folder.replace(/^\/+|\/+$/g, "")}/${id}.${ext}`;
  const storageRef = ref(firebase().storage, path);
  const task = uploadBytesResumable(storageRef, blob, { contentType: type, cacheControl: "public, max-age=31536000, immutable" });
  await new Promise<void>((resolve, reject) => {
    task.on("state_changed", (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)), reject, () => resolve());
  });
  const url = await getDownloadURL(storageRef);
  return { path, url, alt: "", ...(width ? { width, height } : {}) };
}
