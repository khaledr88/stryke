import { del } from "@vercel/blob";
import { CACHE_TAGS, COL } from "@shared/constants";
import { AppError } from "@core/lib/errors";
import { requireAdmin, type Actor } from "@core/lib/guards";
import { addOrderNoteCore, updateOrderStatusCore } from "@core/orders/manageOrder";
import { deleteProductCore, duplicateProductCore, saveProductCore, setProductStatusCore, unreferencedPaths } from "@core/products/manageProduct";
import { adjustStockCore } from "@core/inventory/adjustStock";
import { syncTaxonomyName } from "@core/triggers/taxonomySync";
import { authFromRequest, readJson, refresh, respond } from "@/lib/server/api";
import { adminDb } from "@/lib/server/firebase";
import type { Firestore } from "firebase-admin/firestore";

/** Removes product photos from Vercel Blob once no product uses them. Best effort. */
async function deleteImages(db: Firestore, paths: string[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !paths.length) return;
  const safe = await unreferencedPaths(db, paths);
  if (safe.length) await del(safe).catch((e) => console.warn("Image delete failed", e));
}

type Handler = (db: Firestore, actor: Actor, body: unknown) => Promise<unknown>;

const ACTIONS: Record<string, Handler> = {
  async saveProduct(db, actor, body) {
    const r = await saveProductCore(db, actor, body);
    refresh([CACHE_TAGS.products, CACHE_TAGS.product(r.slug), ...(r.previousSlug ? [CACHE_TAGS.product(r.previousSlug)] : [])]);
    await deleteImages(db, r.removedImagePaths);
    return { id: r.id, slug: r.slug, updatedAt: r.updatedAt };
  },
  async setProductStatus(db, actor, body) {
    const r = await setProductStatusCore(db, actor, body);
    refresh([CACHE_TAGS.products, CACHE_TAGS.product(r.slug)]);
    return r;
  },
  async duplicateProduct(db, actor, body) {
    return duplicateProductCore(db, actor, body);
  },
  async deleteProduct(db, actor, body) {
    const r = await deleteProductCore(db, actor, body);
    refresh([CACHE_TAGS.products, CACHE_TAGS.product(r.slug)]);
    await deleteImages(db, r.imagePaths);
    return { id: r.id };
  },
  async adjustStock(db, actor, body) {
    const r = await adjustStockCore(db, actor, body);
    refresh([CACHE_TAGS.products, CACHE_TAGS.product(r.slug)]);
    return r;
  },
  async updateOrderStatus(db, actor, body) {
    const r = await updateOrderStatusCore(db, actor, body);
    if (r.slugs.length) refresh([CACHE_TAGS.products, ...r.slugs.map(CACHE_TAGS.product)]);
    return { orderId: r.orderId, status: r.status };
  },
  async addOrderNote(db, actor, body) {
    return addOrderNoteCore(db, actor, body);
  },
  /** Called after a brand/category/club is renamed so product cards show the new name. */
  async syncTaxonomyName(db, _actor, body) {
    const b = body as { collection?: string; id?: string; name?: string };
    const allowed: string[] = [COL.brands, COL.categories, COL.clubs];
    if (!b?.collection || !allowed.includes(b.collection) || !b.id || !b.name) throw new AppError("invalid-argument", "Invalid request.");
    const updated = await syncTaxonomyName(db, b.collection, b.id, b.name);
    refresh([CACHE_TAGS.products, CACHE_TAGS.taxonomy]);
    return { updated };
  },
};

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  return respond(async () => {
    const handler = ACTIONS[action];
    if (!handler) throw new AppError("not-found", "Unknown action.");
    const actor = requireAdmin(await authFromRequest(request));
    return handler(adminDb(), actor, await readJson(request));
  });
}
