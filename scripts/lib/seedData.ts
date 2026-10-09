/**
 * Seed helpers shared by scripts/seed.ts and the end-to-end test harness.
 * Taxonomy (categories, brands, clubs, collections) and default content are
 * real starting data. Sample products are clearly flagged (isSample, "[Sample]"
 * name, "sample" tag) and are only written when explicitly requested.
 */
import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { buildVariants, isOnSale, stockStats } from "../../shared/catalog";
import { COL, SIZE_PRESETS } from "../../shared/constants";
import { DEFAULT_HOMEPAGE, DEFAULT_SETTINGS, SEED_BRANDS, SEED_CATEGORIES, SEED_CLUBS, SEED_COLLECTIONS } from "../../shared/defaults";
import type { StoreSettings } from "../../shared/types";

const now = () => Timestamp.now();
const SEEDER = "seed-script";

export async function seedTaxonomy(db: Firestore, { overwrite = false } = {}) {
  const batch = db.batch();
  const groups: [string, { slug: string }[]][] = [
    [COL.categories, SEED_CATEGORIES],
    [COL.brands, SEED_BRANDS],
    [COL.clubs, SEED_CLUBS],
    [COL.collections, SEED_COLLECTIONS],
  ];
  let written = 0;
  for (const [col, items] of groups) {
    for (const item of items) {
      const ref = db.collection(col).doc(item.slug);
      if (!overwrite && (await ref.get()).exists) continue;
      batch.set(ref, { ...item, createdAt: now(), updatedAt: now(), updatedBy: SEEDER });
      written++;
    }
  }
  await batch.commit();
  return written;
}

export async function seedSettings(db: Firestore, { sampleDelivery = false, overwrite = false } = {}) {
  const ref = db.collection(COL.storeSettings).doc("main");
  if (!overwrite && (await ref.get()).exists) return false;
  const settings: StoreSettings = sampleDelivery
    ? {
        ...DEFAULT_SETTINGS,
        // Development values only — the store owner sets real fees in /admin/settings.
        delivery: {
          ...DEFAULT_SETTINGS.delivery,
          zones: DEFAULT_SETTINGS.delivery.zones.map((z) => ({ ...z, enabled: true, fee: z.governorate === "Beirut" ? 300 : 500, eta: z.governorate === "Beirut" ? "Same or next day" : "1–3 days" })),
          freeDeliveryThreshold: 15000,
        },
        contact: { ...DEFAULT_SETTINGS.contact, whatsapp: "+96170000000" },
      }
    : DEFAULT_SETTINGS;
  await ref.set({ ...settings, updatedAt: now(), updatedBy: SEEDER });
  return true;
}

export async function seedHomepage(db: Firestore, { overwrite = false } = {}) {
  const pub = db.collection(COL.homepageContent).doc("published");
  if (!overwrite && (await pub.get()).exists) return false;
  const data = { ...DEFAULT_HOMEPAGE, featuredCollectionIds: ["new-season", "elite-boots", "training-essentials", "limited"] };
  await pub.set({ ...data, updatedAt: now(), updatedBy: SEEDER, publishedAt: now() });
  await db.collection(COL.homepageContent).doc("draft").set({ ...data, updatedAt: now(), updatedBy: SEEDER });
  return true;
}

interface SampleSpec {
  id: string;
  name: string;
  brand: string;
  category: string;
  club?: string;
  season?: string;
  type: "jersey" | "boots" | "apparel" | "equipment";
  price: number;
  sale?: number;
  images: string[];
  sizes: string[];
  stock: number[];
  tags: string[];
  flags?: Partial<Record<"isNew" | "isBestSeller" | "isFeatured" | "isLimited", boolean>>;
  print?: boolean;
  sales?: number;
}

const apparel = SIZE_PRESETS.apparel.sizes.slice(0, 6);
const boots = ["39", "40", "41", "42", "43", "44", "45"];

const SAMPLES: SampleSpec[] = [
  { id: "sample-rm-home", name: "Real Madrid Home Jersey [Sample]", brand: "adidas", category: "football-jerseys", club: "real-madrid", season: "26/27", type: "jersey", price: 10999, images: ["white-home-front", "white-home-back"], sizes: apparel, stock: [2, 6, 9, 7, 3, 1], tags: ["new-season", "sample"], flags: { isBestSeller: true, isNew: true, isFeatured: true }, print: true, sales: 41 },
  { id: "sample-fcb-home", name: "FC Barcelona Home Jersey [Sample]", brand: "nike", category: "football-jerseys", club: "fc-barcelona", season: "26/27", type: "jersey", price: 10999, images: ["blaugrana-front", "blaugrana-back"], sizes: apparel, stock: [0, 4, 8, 6, 2, 0], tags: ["new-season", "sample"], flags: { isBestSeller: true, isNew: true }, print: true, sales: 37 },
  { id: "sample-liv-home", name: "Liverpool Home Jersey [Sample]", brand: "nike", category: "football-jerseys", club: "liverpool", season: "26/27", type: "jersey", price: 9999, sale: 7999, images: ["red-home-front", "red-home-back"], sizes: apparel, stock: [3, 5, 5, 4, 2, 1], tags: ["sample"], flags: { isFeatured: true }, print: true, sales: 12 },
  { id: "sample-mci-home", name: "Manchester City Home Jersey [Sample]", brand: "puma", category: "football-jerseys", club: "manchester-city", season: "26/27", type: "jersey", price: 9999, images: ["sky-home-front"], sizes: apparel, stock: [1, 3, 4, 2, 0, 0], tags: ["new-season", "sample"], flags: { isNew: true }, sales: 6 },
  { id: "sample-boot-pink", name: "Speed Elite FG Boot [Sample]", brand: "nike", category: "football-boots", type: "boots", price: 25999, images: ["boot-pink"], sizes: boots, stock: [1, 2, 3, 3, 2, 1, 1], tags: ["elite", "sample"], flags: { isNew: true, isLimited: true }, sales: 9 },
  { id: "sample-boot-white", name: "Control Elite FG Boot [Sample]", brand: "adidas", category: "football-boots", type: "boots", price: 25999, sale: 21999, images: ["boot-white"], sizes: boots, stock: [0, 2, 4, 4, 3, 1, 0], tags: ["elite", "sample"], flags: { isBestSeller: true }, sales: 22 },
  { id: "sample-ball", name: "Match Football [Sample]", brand: "puma", category: "training-equipment", type: "equipment", price: 3999, images: ["ball-match"], sizes: ["4", "5"], stock: [10, 18], tags: ["training", "sample"], sales: 15 },
  { id: "sample-tracksuit", name: "Training Tracksuit [Sample]", brand: "under-armour", category: "sportswear", type: "apparel", price: 8999, images: ["tracksuit-black"], sizes: apparel, stock: [2, 4, 6, 5, 3, 2], tags: ["training", "sample"], flags: { isFeatured: true }, sales: 4 },
];

export async function seedSampleProducts(db: Firestore, baseUrl = "") {
  const brands = Object.fromEntries((await db.collection(COL.brands).get()).docs.map((d) => [d.id, d.get("name") as string]));
  const cats = Object.fromEntries((await db.collection(COL.categories).get()).docs.map((d) => [d.id, d.get("name") as string]));
  const clubs = Object.fromEntries((await db.collection(COL.clubs).get()).docs.map((d) => [d.id, d.get("name") as string]));
  const batch = db.batch();
  let i = 0;
  for (const s of SAMPLES) {
    const variants = buildVariants(`SMP-${s.id.slice(7).toUpperCase()}`, s.sizes.map((size, k) => ({ size, color: null, sku: "", stock: s.stock[k] ?? 0 })));
    const stats = stockStats(variants);
    const created = Timestamp.fromMillis(Date.now() - (SAMPLES.length - i++) * 86_400_000);
    batch.set(db.collection(COL.products).doc(s.id), {
      slug: s.id,
      name: s.name,
      brandId: s.brand,
      brandName: brands[s.brand] ?? s.brand,
      categoryId: s.category,
      categoryName: cats[s.category] ?? s.category,
      clubId: s.club ?? null,
      clubName: s.club ? clubs[s.club] ?? s.club : null,
      season: s.season ?? null,
      productType: s.type,
      description:
        "Sample product for testing the store. Replace or delete it before launch.\n\n- Shown only in development data\n- Prices, stock and images are placeholders",
      price: s.price,
      salePrice: s.sale ?? null,
      currency: "USD",
      sku: `SMP-${s.id.slice(7).toUpperCase()}`,
      images: s.images.map((img, k) => ({ path: "", url: `${baseUrl}/samples/${img}.webp`, alt: `${s.name} — sample image ${k + 1}`, width: 1200, height: 1500 })),
      imagePaths: [],
      sizes: s.sizes,
      colors: [],
      variants,
      tags: s.tags,
      isNew: Boolean(s.flags?.isNew),
      isBestSeller: Boolean(s.flags?.isBestSeller),
      isFeatured: Boolean(s.flags?.isFeatured),
      isLimited: Boolean(s.flags?.isLimited),
      isSample: true,
      status: "published",
      customization: s.print ? { enabled: true, price: 1500, nameMaxLength: 12, numberMin: 1, numberMax: 99 } : null,
      ...stats,
      onSale: isOnSale({ price: s.price, salePrice: s.sale ?? null }),
      salesCount: s.sales ?? 0,
      createdAt: created,
      updatedAt: created,
      contentUpdatedAt: created,
      publishedAt: created,
      createdBy: SEEDER,
    });
  }
  await batch.commit();
  return SAMPLES.length;
}
