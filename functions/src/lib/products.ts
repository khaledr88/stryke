import type { DocumentSnapshot } from "firebase-admin/firestore";
import { stockStats } from "@shared/catalog";
import { withId } from "@shared/serialize";
import type { Product, ProductVariant } from "@shared/types";

export function productFromSnap(snap: DocumentSnapshot): Product | null {
  if (!snap.exists) return null;
  return withId<Product>(snap.id, snap.data());
}

/** Fields derived from variants that must be rewritten whenever stock changes. */
export function stockFields(variants: ProductVariant[]) {
  const s = stockStats(variants);
  return { variants, totalStock: s.totalStock, minVariantStock: s.minVariantStock, inStock: s.inStock };
}

export function applyStockDelta(variants: ProductVariant[], variantId: string, delta: number): ProductVariant[] {
  return variants.map((v) => (v.id === variantId ? { ...v, stock: Math.max(0, v.stock + delta) } : v));
}
