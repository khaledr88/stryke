import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { AppError } from "../lib/errors";
import { COL, ORDER_STATUS_LABELS, canTransition, type OrderStatus } from "@shared/constants";
import { addOrderNoteSchema, updateOrderStatusSchema } from "@shared/schemas";
import { plain } from "@shared/serialize";
import type { Order, Product } from "@shared/types";
import { auditInTx } from "../lib/audit";
import { parse, type Actor } from "../lib/guards";
import { applyStockDelta, productFromSnap, stockFields } from "../lib/products";

export async function updateOrderStatusCore(db: Firestore, actor: Actor, raw: unknown, now = Date.now()) {
  const input = parse(updateOrderStatusSchema, raw);
  const orderRef = db.collection(COL.orders).doc(input.orderId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new AppError("not-found", "Order not found.");
    const order = plain<Order>(snap.data());
    const from = order.status as OrderStatus;
    const to = input.status;
    if (!canTransition(from, to)) {
      throw new AppError(
        "failed-precondition",
        `An order that is ${ORDER_STATUS_LABELS[from].toLowerCase()} cannot be moved to ${ORDER_STATUS_LABELS[to].toLowerCase()}.`,
      );
    }

    const ts = Timestamp.fromMillis(now);
    const slugs: string[] = [];
    const update: Record<string, unknown> = {
      status: to,
      updatedAt: ts,
      statusHistory: FieldValue.arrayUnion({ status: to, at: now, by: actor.email ?? actor.uid, ...(input.note ? { note: input.note } : {}) }),
    };

    if (to === "cancelled" && !order.stockReleased && input.restock) {
      // Reads must precede writes in a transaction.
      const ids = [...new Set(order.items.map((i) => i.productId))];
      const snaps = ids.length ? await tx.getAll(...ids.map((id) => db.collection(COL.products).doc(id))) : [];
      const products = new Map<string, Product>();
      for (const s of snaps) {
        const p = productFromSnap(s);
        if (p) products.set(p.id, p);
      }
      for (const item of order.items) {
        const p = products.get(item.productId);
        if (!p || !p.variants.some((v) => v.id === item.variantId)) continue; // product or size was deleted since
        products.set(p.id, {
          ...p,
          variants: applyStockDelta(p.variants, item.variantId, item.quantity),
          salesCount: Math.max(0, (p.salesCount ?? 0) - item.quantity),
        });
        tx.set(db.collection(COL.inventoryMovements).doc(), {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.name,
          size: item.size,
          delta: item.quantity,
          reason: "cancellation",
          orderId: order.number,
          by: actor.email ?? actor.uid,
          at: ts,
        });
      }
      for (const p of products.values()) {
        tx.update(db.collection(COL.products).doc(p.id), { ...stockFields(p.variants), salesCount: p.salesCount, stockUpdatedAt: ts });
        slugs.push(p.slug);
      }
      update.stockReleased = true;
    }
    if (to === "cancelled") update.cancelledAt = ts;
    if (to === "delivered") {
      update.deliveredAt = ts;
      update["payment.status"] = "paid";
    }

    tx.update(orderRef, update);
    auditInTx(db, tx, actor, {
      action: "order.status",
      target: { type: "order", id: order.number },
      details: { from, to, restocked: Boolean(update.stockReleased), note: input.note || undefined },
    });
    return { orderId: order.number, status: to, slugs };
  });
}

export async function addOrderNoteCore(db: Firestore, actor: Actor, raw: unknown, now = Date.now()) {
  const input = parse(addOrderNoteSchema, raw);
  const ref = db.collection(COL.orders).doc(input.orderId);
  const note = { id: randomUUID(), text: input.text, by: actor.email ?? actor.uid, at: now };
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("not-found", "Order not found.");
    tx.update(ref, { internalNotes: FieldValue.arrayUnion(note), updatedAt: Timestamp.fromMillis(now) });
    auditInTx(db, tx, actor, { action: "order.note", target: { type: "order", id: input.orderId } });
  });
  return note;
}
