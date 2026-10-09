import { createHash } from "node:crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { AppError } from "./errors";
import { COL } from "@shared/constants";

export interface Limit {
  /** Identifier of what is being limited, e.g. "ip:<hash>". Never a raw IP or phone. */
  key: string;
  max: number;
  windowSeconds: number;
}

export function hashKey(kind: string, value: string): string {
  const salt = process.env.RATE_LIMIT_SALT || process.env.GCLOUD_PROJECT || "stryke";
  return `${kind}_${createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32)}`;
}

/**
 * Fixed-window counters stored in Firestore. Each document carries `expireAt`
 * so a Firestore TTL policy (see README) removes it automatically.
 */
export async function enforceRateLimits(db: Firestore, limits: Limit[], now = Date.now()): Promise<void> {
  await db.runTransaction(async (tx) => {
    const refs = limits.map((l) => db.collection(COL.rateLimits).doc(l.key));
    const snaps = await tx.getAll(...refs);
    const updates: { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }[] = [];
    snaps.forEach((snap, i) => {
      const limit = limits[i];
      const windowStart = snap.exists ? (snap.get("windowStart") as Timestamp).toMillis() : 0;
      const inWindow = now - windowStart < limit.windowSeconds * 1000;
      const count = inWindow ? (snap.get("count") as number) : 0;
      if (count >= limit.max) {
        throw new AppError(
          "resource-exhausted",
          "Too many orders were placed from this connection. Please wait a little and try again, or contact us on WhatsApp.",
        );
      }
      updates.push({
        ref: refs[i],
        data: {
          count: count + 1,
          windowStart: inWindow ? Timestamp.fromMillis(windowStart) : Timestamp.fromMillis(now),
          expireAt: Timestamp.fromMillis(now + limit.windowSeconds * 1000 * 2),
        },
      });
    });
    for (const u of updates) tx.set(u.ref, u.data);
  });
}
