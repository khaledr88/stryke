import { FirestoreMock } from "@firebase-bridge/firestore-admin";
import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { DEFAULT_SETTINGS } from "@shared/defaults";
import type { Actor } from "../src/lib/guards";

export const admin: Actor = { uid: "admin-1", email: "owner@stryke.test" };

export function newDb(): Firestore {
  const env = new FirestoreMock();
  return env.createDatabase().firestore();
}

export async function seedStore(db: Firestore, opts: { freeThreshold?: number | null; cod?: boolean; whatsapp?: string } = {}) {
  await db.doc("storeSettings/main").set({
    ...DEFAULT_SETTINGS,
    contact: { ...DEFAULT_SETTINGS.contact, whatsapp: opts.whatsapp ?? "+96171000000" },
    delivery: {
      zones: DEFAULT_SETTINGS.delivery.zones.map((z) =>
        z.governorate === "Akkar" ? z : { ...z, fee: z.governorate === "Beirut" ? 300 : 500, enabled: true },
      ),
      freeDeliveryThreshold: opts.freeThreshold ?? null,
      note: "",
    },
    payments: { cod: { enabled: opts.cod ?? true, note: "" } },
  });
  await db.doc("brands/adidas").set({ name: "Adidas", slug: "adidas", visible: true, order: 1 });
  await db.doc("categories/football-jerseys").set({ name: "Football Jerseys", slug: "football-jerseys", visible: true, order: 1 });
  await db.doc("clubs/real-madrid").set({ name: "Real Madrid", slug: "real-madrid", visible: true, order: 1 });
}

export async function seedProduct(
  db: Firestore,
  id: string,
  over: Partial<Record<string, unknown>> = {},
  stock: Record<string, number> = { s: 5, m: 5, l: 1 },
) {
  const variants = Object.entries(stock).map(([size, n]) => ({ id: size, size: size.toUpperCase(), color: null, sku: `SKU-${size}`, stock: n }));
  const now = Timestamp.now();
  await db.doc(`products/${id}`).set({
    slug: id,
    name: `Product ${id}`,
    brandId: "adidas",
    brandName: "Adidas",
    categoryId: "football-jerseys",
    categoryName: "Football Jerseys",
    clubId: "real-madrid",
    clubName: "Real Madrid",
    season: "26/27",
    productType: "jersey",
    description: "",
    price: 11000,
    salePrice: null,
    currency: "USD",
    sku: "SKU",
    images: [{ path: "products/x/1.webp", url: "https://example.test/1.webp" }],
    imagePaths: ["products/x/1.webp"],
    sizes: variants.map((v) => v.size),
    colors: [],
    variants,
    tags: [],
    isNew: false,
    isBestSeller: false,
    isFeatured: false,
    isLimited: false,
    status: "published",
    customization: null,
    totalStock: variants.reduce((s, v) => s + v.stock, 0),
    minVariantStock: Math.min(...variants.map((v) => v.stock)),
    inStock: true,
    onSale: false,
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    ...over,
  });
}

let n = 0;
export function uuid() {
  n++;
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export function orderInput(
  lines: { productId: string; variantId: string; quantity: number; customization?: { name: string; number: string } | null; [k: string]: unknown }[],
  over: { customer?: Record<string, unknown>; requestId?: string; company?: string } = {},
) {
  return {
    customer: {
      fullName: "Karim Haddad",
      phone: "71 123 456",
      whatsapp: "",
      email: "",
      governorate: "Beirut",
      city: "Achrafieh",
      street: "Sursock St",
      building: "Bldg 12",
      floor: "3",
      instructions: "",
      notes: "",
      ...over.customer,
    },
    lines,
    paymentMethod: "cod",
    requestId: over.requestId ?? uuid(),
    ...(over.company !== undefined ? { company: over.company } : {}),
  };
}
