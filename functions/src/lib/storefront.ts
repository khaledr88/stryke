import { logger } from "firebase-functions";

/**
 * Tells the Next.js storefront which cached data changed so product pages,
 * stock levels and listings update immediately instead of waiting for the
 * time-based revalidation. Best effort: a failure never breaks the caller.
 */
export async function notifyStorefront(payload: { tags?: string[]; paths?: string[] }, secret: string | undefined) {
  const base = process.env.STOREFRONT_URL;
  if (!base || !secret) return;
  try {
    const res = await fetch(new URL("/api/revalidate", base), {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) logger.warn("Storefront revalidation failed", { status: res.status });
  } catch (err) {
    logger.warn("Storefront revalidation error", { error: String(err) });
  }
}
