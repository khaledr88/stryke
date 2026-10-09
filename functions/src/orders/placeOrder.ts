import { randomInt } from "node:crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { COL, ORDER_NUMBER_PREFIX, SETTINGS_DOC } from "@shared/constants";
import { mergeSettings } from "@shared/settings";
import { formatMoney } from "@shared/money";
import { normalizePhone, whatsappLink } from "@shared/phone";
import { priceCart, type PricingProduct } from "@shared/pricing";
import { placeOrderSchema } from "@shared/schemas";
import { plain } from "@shared/serialize";
import type { PlacedOrderReceipt, Product, StoreSettings } from "@shared/types";
import { parse } from "../lib/guards";
import { applyStockDelta, productFromSnap, stockFields } from "../lib/products";
import { enforceRateLimits, hashKey } from "../lib/rateLimit";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newOrderNumber(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${ORDER_NUMBER_PREFIX}-${s}`;
}

export interface PlaceOrderContext {
  ip: string | null;
  now?: number;
}

/**
 * Creates a guest Cash-on-Delivery order.
 *
 * Everything the browser sends except the customer's own details is treated as
 * a request, not a fact: products, prices, delivery fees and stock are read and
 * calculated here inside a Firestore transaction, so two customers can never buy
 * the last unit of the same size.
 */
export async function placeOrderCore(db: Firestore, raw: unknown, ctx: PlaceOrderContext): Promise<{ receipt: PlacedOrderReceipt; slugs: string[] }> {
  const input = parse(placeOrderSchema, raw);
  if (input.company) throw new HttpsError("invalid-argument", "Invalid request.");

  const phone = normalizePhone(input.customer.phone);
  if (!phone) throw new HttpsError("invalid-argument", "Enter a valid phone number.", { fields: { "customer.phone": "Invalid phone" } });
  const whatsapp = input.customer.whatsapp ? normalizePhone(input.customer.whatsapp) : null;
  const now = ctx.now ?? Date.now();

  // Idempotency: a retried submission returns the original order.
  const requestRef = db.collection(COL.orderRequests).doc(input.requestId);
  const prior = await requestRef.get();
  if (prior.exists) return { receipt: plain<PlacedOrderReceipt>(prior.get("receipt")), slugs: [] };

  const limits = [{ key: hashKey("phone", phone), max: 5, windowSeconds: 3600 }];
  if (ctx.ip) limits.push({ key: hashKey("ip", ctx.ip), max: 10, windowSeconds: 3600 });
  await enforceRateLimits(db, limits, now);

  const productIds = [...new Set(input.lines.map((l) => l.productId))];
  const productRefs = productIds.map((id) => db.collection(COL.products).doc(id));
  const settingsRef = db.collection(COL.storeSettings).doc(SETTINGS_DOC);

  return db.runTransaction(async (tx) => {
    const again = await tx.get(requestRef);
    if (again.exists) return { receipt: plain<PlacedOrderReceipt>(again.get("receipt")), slugs: [] };

    const [settingsSnap, ...productSnaps] = await tx.getAll(settingsRef, ...productRefs);
    const settings = mergeSettings(settingsSnap.exists ? plain<StoreSettings>(settingsSnap.data()) : null);
    const products = new Map<string, Product>();
    for (const snap of productSnaps) {
      const p = productFromSnap(snap);
      if (p) products.set(p.id, p);
    }

    const priced = priceCart(input.lines, products as Map<string, PricingProduct>, settings, input.customer.governorate);
    if (priced.problems.length) {
      throw new HttpsError("failed-precondition", priced.problems[0].message, { problems: priced.problems });
    }

    // Pick an unused order number (collisions are astronomically rare, but checked).
    const candidates = [newOrderNumber(), newOrderNumber(), newOrderNumber()];
    const numberSnaps = await tx.getAll(...candidates.map((n) => db.collection(COL.orders).doc(n)));
    const freeIndex = numberSnaps.findIndex((s) => !s.exists);
    if (freeIndex < 0) throw new HttpsError("aborted", "Please try again.");
    const number = candidates[freeIndex];
    const orderRef = db.collection(COL.orders).doc(number);
    const ts = Timestamp.fromMillis(now);

    // Reserve stock.
    const touched = new Map<string, Product>();
    for (const item of priced.items) {
      const current = touched.get(item.productId) ?? products.get(item.productId)!;
      touched.set(item.productId, {
        ...current,
        variants: applyStockDelta(current.variants, item.variantId, -item.quantity),
        salesCount: (current.salesCount ?? 0) + item.quantity,
      });
      tx.set(db.collection(COL.inventoryMovements).doc(), {
        productId: item.productId,
        variantId: item.variantId,
        productName: item.name,
        size: item.size,
        delta: -item.quantity,
        reason: "order",
        orderId: number,
        by: "checkout",
        at: ts,
      });
    }
    for (const [id, p] of touched) {
      tx.update(db.collection(COL.products).doc(id), {
        ...stockFields(p.variants),
        salesCount: p.salesCount,
        stockUpdatedAt: ts,
      });
    }

    const c = input.customer;
    // Lowercase tokens the admin can search on: order number, phone (with and
    // without country code) and each word of the customer's name.
    const digits = phone.replace("+", "");
    const searchTokens = [
      ...new Set([
        number.toLowerCase(),
        number.toLowerCase().replace(`${ORDER_NUMBER_PREFIX.toLowerCase()}-`, ""),
        digits,
        digits.replace(/^961/, ""),
        ...c.fullName.toLowerCase().split(/\s+/).filter(Boolean),
      ]),
    ];
    tx.create(orderRef, {
      number,
      status: "pending",
      items: priced.items,
      itemCount: priced.itemCount,
      subtotal: priced.subtotal,
      deliveryFee: priced.deliveryFee,
      discount: priced.discount,
      total: priced.total,
      currency: settings.currency,
      payment: { method: input.paymentMethod, status: "unpaid" },
      customer: { fullName: c.fullName, phone, whatsapp, email: c.email || null },
      delivery: {
        governorate: c.governorate,
        city: c.city,
        street: c.street,
        building: c.building,
        floor: c.floor,
        instructions: c.instructions,
      },
      notes: c.notes,
      internalNotes: [],
      statusHistory: [{ status: "pending", at: now, by: "customer" }],
      stockReleased: false,
      searchTokens,
      source: "web",
      createdAt: ts,
      updatedAt: ts,
    });

    const storeWhatsapp = settings.orders.whatsappConfirmation ? settings.contact.whatsapp : "";
    const receipt: PlacedOrderReceipt = {
      orderId: number,
      number,
      total: priced.total,
      subtotal: priced.subtotal,
      deliveryFee: priced.deliveryFee,
      currency: settings.currency,
      itemCount: priced.itemCount,
      items: priced.items.map((i) => ({
        name: i.name,
        size: i.size,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
        image: i.image,
        customization: i.customization,
      })),
      whatsappUrl: storeWhatsapp
        ? whatsappLink(
            storeWhatsapp,
            `Hi ${settings.storeName}, I just placed order ${number} (${formatMoney(priced.total, settings.currency)}, cash on delivery). Please confirm.`,
          )
        : null,
      createdAt: now,
    };
    tx.set(requestRef, {
      orderId: number,
      receipt,
      createdAt: ts,
      expireAt: Timestamp.fromMillis(now + 1000 * 60 * 60 * 24),
    });

    return { receipt, slugs: [...touched.values()].map((p) => p.slug) };
  });
}
