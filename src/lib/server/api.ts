import "server-only";
import { revalidateTag } from "next/cache";
import { AppError } from "@core/lib/errors";
import type { AuthContext } from "@core/lib/guards";
import { verifyIdToken } from "./tokens";

/** Reads the Firebase ID token sent by the admin dashboard. Returns null when missing or invalid. */
export async function authFromRequest(request: Request): Promise<AuthContext | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await verifyIdToken(header.slice(7));
    return { uid: decoded.sub, token: decoded as Record<string, unknown> };
  } catch {
    return null;
  }
}

export function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export function refresh(tags: string[]) {
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
}

/** Runs a handler and turns errors into a consistent JSON shape: { error: { code, message, details } }. */
export async function respond(run: () => Promise<unknown>): Promise<Response> {
  try {
    const result = await run();
    return Response.json({ result }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError) return Response.json({ error: err.toJSON() }, { status: err.status });
    console.error(err);
    return Response.json({ error: { code: "internal", message: "Something went wrong. Please try again." } }, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("invalid-argument", "Invalid request body.");
  }
}
