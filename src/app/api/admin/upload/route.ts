import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { requireAdmin } from "@core/lib/guards";
import { AppError } from "@core/lib/errors";
import { authFromRequest } from "@/lib/server/api";

const FOLDERS = ["products", "categories", "brands", "clubs", "collections", "content"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Gives the admin's browser a short-lived, single-file upload URL for Vercel Blob.
 *
 * Works with both ways Vercel connects a Blob store to a project:
 * - the current default (BLOB_STORE_ID + Vercel OIDC, no long-lived token), and
 * - the older BLOB_READ_WRITE_TOKEN.
 *
 * Only signed-in administrators get a URL, only for images ≤ 8 MB, only in image folders.
 */
export async function POST(request: Request) {
  let body: HandleUploadPresignedBody;
  try {
    body = (await request.json()) as HandleUploadPresignedBody;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    // We don't use upload-completed callbacks, so only issue URLs.
    if (body?.type !== "blob.generate-presigned-url") throw new AppError("invalid-argument", "Unsupported upload request.");
    requireAdmin(await authFromRequest(request));
    if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
      throw new AppError("failed-precondition", "Photo storage isn't connected. In Vercel, connect a Blob store to this project and redeploy.");
    }

    const result = await handleUploadPresigned({
      body,
      request,
      // Required by the library even though callbacks are disabled above.
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY || "callbacks-not-used",
      getSignedToken: async (pathname) => {
        if (!FOLDERS.includes(pathname.split("/")[0]) || pathname.includes("..")) {
          throw new AppError("permission-denied", "Uploads are only allowed in image folders.");
        }
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          validUntil: Date.now() + 15 * 60 * 1000,
        });
        return {
          token,
          urlOptions: {
            allowedContentTypes: IMAGE_TYPES,
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: false,
            cacheControlMaxAge: 60 * 60 * 24 * 365,
          },
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    const status = err instanceof AppError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Upload failed.";
    if (status >= 500) console.error("[upload] could not issue upload URL:", err);
    return Response.json({ error: message }, { status });
  }
}
