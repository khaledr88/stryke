import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { adminAuth } from "@/lib/server/firebase";

const bodySchema = z.object({
  tags: z.array(z.string().min(1).max(200)).max(50).default([]),
  paths: z.array(z.string().startsWith("/").max(300)).max(50).default([]),
});

function secretMatches(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function isAdminToken(header: string | null): Promise<boolean> {
  if (!header?.startsWith("Bearer ")) return false;
  try {
    const decoded = await adminAuth().verifyIdToken(header.slice(7), true);
    return decoded.admin === true;
  } catch {
    return false;
  }
}

/**
 * Refreshes cached storefront data. Called by Cloud Functions (shared secret)
 * and by the admin dashboard after it saves content (admin ID token).
 */
export async function POST(request: Request) {
  const authorized =
    secretMatches(request.headers.get("x-revalidate-secret")) || (await isAdminToken(request.headers.get("authorization")));
  if (!authorized) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ ok: false, error: "invalid body" }, { status: 400 });

  for (const tag of parsed.data.tags) revalidateTag(tag, { expire: 0 });
  for (const path of parsed.data.paths) revalidatePath(path);
  return Response.json({ ok: true, tags: parsed.data.tags, paths: parsed.data.paths });
}
