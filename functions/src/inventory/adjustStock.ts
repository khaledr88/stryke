import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { COL } from "@shared/constants";
import { adjustStockSchema } from "@shared/schemas";
import { auditInTx } from "../lib/audit";
import { parse, type Actor } from "../lib/guards";
import { productFromSnap, stockFields } from "../lib/products";

/** Manual stock correction (delivery received, stock count, damage…), always logged. */
export async function adjustStockCore(db: Firestore, actor: Actor, raw: unknown, now = Date.now()) {
  const input = parse(adjustStockSchema, raw);
  const ref = db.collection(COL.products).doc(input.productId);
  return db.runTransaction(async (tx) => {
    const p = productFromSnap(await tx.get(ref));
    if (!p) throw new HttpsError("not-found", "Product not found.");
    const v = p.variants.find((x) => x.id === input.variantId);
    if (!v) throw new HttpsError("not-found", "That size no longer exists on this product.");
    const next = input.mode === "set" ? input.value : v.stock + input.value;
    if (next < 0) throw new HttpsError("failed-precondition", `Stock cannot go below zero (currently ${v.stock}).`);
    const delta = next - v.stock;
    if (delta === 0) return { productId: p.id, variantId: v.id, stock: v.stock, slug: p.slug };
    const variants = p.variants.map((x) => (x.id === v.id ? { ...x, stock: next } : x));
    const ts = Timestamp.fromMillis(now);
    tx.update(ref, { ...stockFields(variants), stockUpdatedAt: ts, updatedAt: ts });
    tx.set(db.collection(COL.inventoryMovements).doc(), {
      productId: p.id,
      variantId: v.id,
      productName: p.name,
      size: v.size,
      delta,
      reason: "adjustment",
      note: input.reason,
      by: actor.email ?? actor.uid,
      at: ts,
    });
    auditInTx(db, tx, actor, {
      action: "inventory.adjust",
      target: { type: "product", id: p.id, label: `${p.name} (${v.size})` },
      details: { from: v.stock, to: next, reason: input.reason },
    });
    return { productId: p.id, variantId: v.id, stock: next, slug: p.slug };
  });
}
