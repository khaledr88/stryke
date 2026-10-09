import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@core/lib/guards";
import { AppError } from "@core/lib/errors";
import { authFromRequest } from "@/lib/server/api";

const FOLDERS = ["products", "categories", "brands", "clubs", "collections", "content"];

/**
 * Issues short-lived upload tokens for Vercel Blob so the admin's browser can
 * upload photos directly. Only signed-in administrators get a token, only for
 * images under 8 MB, and only into the store's image folders.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    if (body.type === "blob.generate-client-token") {
      requireAdmin(await authFromRequest(request));
    }
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!FOLDERS.includes(pathname.split("/")[0])) throw new AppError("permission-denied", "Uploads are only allowed in image folders.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    const status = err instanceof AppError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Upload failed.";
    return Response.json({ error: message }, { status });
  }
}
