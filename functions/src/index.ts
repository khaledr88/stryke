/**
 * STRYKE Cloud Functions (2nd gen).
 *
 * Public:  placeOrder            — guest Cash-on-Delivery checkout (App Check + rate limited)
 * Admin:   saveProduct, setProductStatus, duplicateProduct, deleteProduct,
 *          adjustStock, updateOrderStatus, addOrderNote
 * Events:  syncBrandName / syncCategoryName / syncClubName, purgeExpiredRecords
 */
import { logger } from "firebase-functions";
import { defineBoolean, defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp } from "firebase-admin/firestore";
import { CACHE_TAGS, COL } from "@shared/constants";
import { REGION, bucket, db } from "./lib/app";
import { requireAdmin } from "./lib/guards";
import { notifyStorefront } from "./lib/storefront";
import { placeOrderCore } from "./orders/placeOrder";
import { addOrderNoteCore, updateOrderStatusCore } from "./orders/manageOrder";
import {
  deleteProductCore,
  duplicateProductCore,
  saveProductCore,
  setProductStatusCore,
  unreferencedPaths,
} from "./products/manageProduct";
import { adjustStockCore } from "./inventory/adjustStock";
import { syncTaxonomyName } from "./triggers/taxonomySync";

const ENFORCE_APP_CHECK = defineBoolean("ENFORCE_APP_CHECK", {
  default: false,
  description: "Reject checkout requests without a valid App Check token. Turn on in production once App Check is configured.",
});
// Read through process.env by lib/storefront.ts; declared here so deploy asks for it.
defineString("STOREFRONT_URL", { default: "", description: "Public URL of the storefront, used to refresh cached pages after changes." });
const REVALIDATE_SECRET = defineSecret("REVALIDATE_SECRET");

const adminOpts = { region: REGION, secrets: [REVALIDATE_SECRET], maxInstances: 5 };

/** Unknown errors become a generic "internal" error; expected HttpsErrors pass through. */
function guarded<T>(name: string, fn: (req: CallableRequest) => Promise<T>) {
  return async (req: CallableRequest) => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error(`${name} failed`, err);
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  };
}

const secret = () => {
  try {
    return REVALIDATE_SECRET.value();
  } catch {
    return undefined;
  }
};

async function deleteFiles(paths: string[]) {
  const safe = await unreferencedPaths(db(), paths);
  await Promise.all(
    safe.map((p) => bucket().file(p).delete({ ignoreNotFound: true }).catch((e) => logger.warn("Image delete failed", { p, e: String(e) }))),
  );
}

/* --------------------------------- Checkout -------------------------------- */

export const placeOrder = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    secrets: [REVALIDATE_SECRET],
    maxInstances: 20,
    timeoutSeconds: 30,
  },
  guarded("placeOrder", async (req) => {
    const ip = (req.rawRequest?.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.rawRequest?.ip || null;
    const { receipt, slugs } = await placeOrderCore(db(), req.data, { ip });
    if (slugs.length) {
      await notifyStorefront({ tags: [CACHE_TAGS.products, ...slugs.map(CACHE_TAGS.product)] }, secret());
    }
    logger.info("Order placed", { number: receipt.number, items: receipt.itemCount, total: receipt.total });
    return receipt;
  }),
);

/* ----------------------------------- Admin ---------------------------------- */

export const saveProduct = onCall(
  adminOpts,
  guarded("saveProduct", async (req) => {
    const actor = requireAdmin(req);
    const r = await saveProductCore(db(), actor, req.data);
    const slugTags = [r.slug, r.previousSlug].filter(Boolean).map((s) => CACHE_TAGS.product(s!));
    await notifyStorefront({ tags: [CACHE_TAGS.products, ...slugTags] }, secret());
    if (r.removedImagePaths.length) await deleteFiles(r.removedImagePaths);
    return { id: r.id, slug: r.slug, updatedAt: r.updatedAt };
  }),
);

export const setProductStatus = onCall(
  adminOpts,
  guarded("setProductStatus", async (req) => {
    const actor = requireAdmin(req);
    const r = await setProductStatusCore(db(), actor, req.data);
    await notifyStorefront({ tags: [CACHE_TAGS.products, CACHE_TAGS.product(r.slug)] }, secret());
    return r;
  }),
);

export const duplicateProduct = onCall(
  adminOpts,
  guarded("duplicateProduct", async (req) => duplicateProductCore(db(), requireAdmin(req), req.data)),
);

export const deleteProduct = onCall(
  adminOpts,
  guarded("deleteProduct", async (req) => {
    const actor = requireAdmin(req);
    const r = await deleteProductCore(db(), actor, req.data);
    await notifyStorefront({ tags: [CACHE_TAGS.products, CACHE_TAGS.product(r.slug)] }, secret());
    if (r.imagePaths.length) await deleteFiles(r.imagePaths);
    return { id: r.id };
  }),
);

export const adjustStock = onCall(
  adminOpts,
  guarded("adjustStock", async (req) => {
    const r = await adjustStockCore(db(), requireAdmin(req), req.data);
    await notifyStorefront({ tags: [CACHE_TAGS.products, CACHE_TAGS.product(r.slug)] }, secret());
    return r;
  }),
);

export const updateOrderStatus = onCall(
  adminOpts,
  guarded("updateOrderStatus", async (req) => {
    const r = await updateOrderStatusCore(db(), requireAdmin(req), req.data);
    if (r.slugs.length) await notifyStorefront({ tags: [CACHE_TAGS.products, ...r.slugs.map(CACHE_TAGS.product)] }, secret());
    return { orderId: r.orderId, status: r.status };
  }),
);

export const addOrderNote = onCall(
  adminOpts,
  guarded("addOrderNote", async (req) => addOrderNoteCore(db(), requireAdmin(req), req.data)),
);

/* ---------------------------------- Events ---------------------------------- */

function nameSync(collection: string) {
  return onDocumentUpdated({ document: `${collection}/{id}`, region: REGION, secrets: [REVALIDATE_SECRET] }, async (event) => {
    const before = event.data?.before.get("name");
    const after = event.data?.after.get("name");
    if (!after || before === after) return;
    const n = await syncTaxonomyName(db(), collection, event.params.id, after);
    logger.info("Synced product names", { collection, id: event.params.id, updated: n });
    if (n) await notifyStorefront({ tags: [CACHE_TAGS.products, CACHE_TAGS.taxonomy] }, secret());
  });
}

export const syncBrandName = nameSync(COL.brands);
export const syncCategoryName = nameSync(COL.categories);
export const syncClubName = nameSync(COL.clubs);

/**
 * Removes expired rate-limit and idempotency records. A Firestore TTL policy on
 * `expireAt` does the same thing for free; this job is a safety net.
 */
export const purgeExpiredRecords = onSchedule({ schedule: "every day 04:00", timeZone: "Asia/Beirut", region: REGION }, async () => {
  const now = Timestamp.now();
  for (const col of [COL.rateLimits, COL.orderRequests]) {
    const snap = await db().collection(col).where("expireAt", "<", now).limit(500).get();
    const batch = db().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
    logger.info("Purged expired records", { col, count: snap.size });
  }
});
