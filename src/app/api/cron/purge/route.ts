import { Timestamp } from "firebase-admin/firestore";
import { COL } from "@shared/constants";
import { adminDb } from "@/lib/server/firebase";

/**
 * Daily clean-up of expired rate-limit and idempotency records (Vercel Cron,
 * see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const db = adminDb();
  const now = Timestamp.now();
  const removed: Record<string, number> = {};
  for (const col of [COL.rateLimits, COL.orderRequests]) {
    const snap = await db.collection(col).where("expireAt", "<", now).limit(400).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
    removed[col] = snap.size;
  }
  return Response.json({ ok: true, removed });
}
