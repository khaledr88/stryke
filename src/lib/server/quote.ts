import "server-only";
import { COL, LEBANON_GOVERNORATES, SETTINGS_DOC } from "@shared/constants";
import { priceCart, type PricingProduct } from "@shared/pricing";
import { cartLineSchema } from "@shared/schemas";
import { plain, withId } from "@shared/serialize";
import { mergeSettings } from "@shared/settings";
import type { Product, StoreSettings } from "@shared/types";
import { z } from "zod";
import { adminDb } from "./firebase";

export const quoteRequestSchema = z.object({
  lines: z.array(cartLineSchema).max(30),
  governorate: z.enum(LEBANON_GOVERNORATES).nullable().default(null),
});

/**
 * Read-only price/stock check for the bag and checkout pages. Uses fresh
 * (uncached) reads so customers see sold-out sizes before submitting. The
 * order itself is still re-priced inside the placeOrder transaction.
 */
export async function quoteCart(input: z.output<typeof quoteRequestSchema>) {
  const db = adminDb();
  const ids = [...new Set(input.lines.map((l) => l.productId))];
  const refs = ids.map((id) => db.collection(COL.products).doc(id));
  const [settingsSnap, ...snaps] = await db.getAll(db.collection(COL.storeSettings).doc(SETTINGS_DOC), ...refs);
  const settings = mergeSettings(settingsSnap.exists ? plain<StoreSettings>(settingsSnap.data()) : null);
  const products = new Map<string, PricingProduct>();
  const stockByLine: Record<string, number> = {};
  for (const s of snaps) {
    if (!s.exists) continue;
    const p = withId<Product>(s.id, s.data());
    products.set(p.id, p);
    if (p.status === "published") for (const v of p.variants) stockByLine[`${p.id}|${v.id}`] = v.stock;
  }
  const governorate = input.governorate ?? "Beirut";
  const result = priceCart(input.lines, products, settings, governorate);
  const problems = input.governorate ? result.problems : result.problems.filter((p) => p.code !== "delivery_unavailable");
  return {
    items: result.items,
    itemCount: result.itemCount,
    subtotal: result.subtotal,
    deliveryFee: input.governorate ? result.deliveryFee : null,
    freeDeliveryApplied: result.freeDeliveryApplied,
    freeDeliveryThreshold: settings.delivery.freeDeliveryThreshold,
    total: input.governorate ? result.total : result.subtotal,
    currency: settings.currency,
    problems,
    stock: stockByLine,
  };
}

export type CartQuote = Awaited<ReturnType<typeof quoteCart>>;
