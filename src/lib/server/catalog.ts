import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { CACHE_TAGS, COL, HOMEPAGE_PUBLISHED_DOC, SETTINGS_DOC } from "@shared/constants";
import { matchesCollection, toSummary } from "@shared/catalog";
import { withId, plain } from "@shared/serialize";
import { mergeHomepage, mergeSettings } from "@shared/settings";
import type {
  Brand,
  Category,
  Club,
  HomepageContent,
  Product,
  ProductCollection,
  ProductSummary,
  StoreSettings,
} from "@shared/types";
import { adminDb } from "./firebase";

/**
 * Storefront data access. Every function reads only public data (published
 * products, visible taxonomy, published homepage) and is cached with tags so
 * admin changes and Cloud Functions can refresh it on demand via /api/revalidate.
 * The time-based revalidate is only a safety net.
 */
const REVALIDATE = 300;

async function readVisible<T>(col: string): Promise<T[]> {
  const snap = await adminDb().collection(col).where("visible", "==", true).get();
  return snap.docs
    .map((d) => withId<T & { order?: number; name?: string; title?: string }>(d.id, d.data()))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name ?? a.title).localeCompare(String(b.name ?? b.title)));
}

export const getSettings = cache(
  unstable_cache(
    async (): Promise<StoreSettings> => {
      const snap = await adminDb().collection(COL.storeSettings).doc(SETTINGS_DOC).get();
      return mergeSettings(snap.exists ? plain<StoreSettings>(snap.data()) : null);
    },
    ["settings"],
    { tags: [CACHE_TAGS.settings], revalidate: REVALIDATE },
  ),
);

export const getHomepage = cache(
  unstable_cache(
    async (): Promise<HomepageContent> => {
      const snap = await adminDb().collection(COL.homepageContent).doc(HOMEPAGE_PUBLISHED_DOC).get();
      return mergeHomepage(snap.exists ? plain<HomepageContent>(snap.data()) : null);
    },
    ["homepage"],
    { tags: [CACHE_TAGS.homepage], revalidate: REVALIDATE },
  ),
);

export const getCategories = cache(
  unstable_cache(async () => readVisible<Category>(COL.categories), ["categories"], {
    tags: [CACHE_TAGS.taxonomy],
    revalidate: REVALIDATE,
  }),
);

export const getBrands = cache(
  unstable_cache(async () => readVisible<Brand>(COL.brands), ["brands"], { tags: [CACHE_TAGS.taxonomy], revalidate: REVALIDATE }),
);

export const getClubs = cache(
  unstable_cache(async () => readVisible<Club>(COL.clubs), ["clubs"], { tags: [CACHE_TAGS.taxonomy], revalidate: REVALIDATE }),
);

export const getCollections = cache(
  unstable_cache(async () => readVisible<ProductCollection>(COL.collections), ["collections"], {
    tags: [CACHE_TAGS.collections],
    revalidate: REVALIDATE,
  }),
);

/** Strip admin-only bookkeeping before anything reaches the browser. */
function publicProduct(p: Product & { createdBy?: string; stockUpdatedAt?: number }): Product {
  const { createdBy: _c, imagePaths: _i, stockUpdatedAt: _s, contentUpdatedAt: _u, ...rest } = p;
  void _c; void _i; void _s; void _u;
  return rest;
}

/**
 * All published products as lightweight summaries. Listing pages filter this
 * in memory, which is fast and cheap for catalogues up to a few thousand items
 * (see README → Scaling the catalogue).
 */
export const getProductSummaries = cache(
  unstable_cache(
    async (): Promise<ProductSummary[]> => {
      const snap = await adminDb().collection(COL.products).where("status", "==", "published").get();
      return snap.docs.map((d) => toSummary(withId<Product>(d.id, d.data())));
    },
    ["product-summaries"],
    { tags: [CACHE_TAGS.products], revalidate: REVALIDATE },
  ),
);

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  return unstable_cache(
    async () => {
      const snap = await adminDb()
        .collection(COL.products)
        .where("slug", "==", slug)
        .where("status", "==", "published")
        .limit(1)
        .get();
      if (snap.empty) return null;
      const d = snap.docs[0];
      return publicProduct(withId<Product>(d.id, d.data()));
    },
    ["product", slug],
    { tags: [CACHE_TAGS.products, CACHE_TAGS.product(slug)], revalidate: REVALIDATE },
  )();
});

export async function getCategoryBySlug(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}
export async function getBrandBySlug(slug: string) {
  return (await getBrands()).find((c) => c.slug === slug) ?? null;
}
export async function getClubBySlug(slug: string) {
  return (await getClubs()).find((c) => c.slug === slug) ?? null;
}
export async function getCollectionBySlug(slug: string) {
  return (await getCollections()).find((c) => c.slug === slug) ?? null;
}

export async function getCollectionProducts(collection: ProductCollection) {
  return (await getProductSummaries()).filter((p) => matchesCollection(p, collection.rule));
}

export async function getRelatedProducts(product: Product, limit = 8): Promise<ProductSummary[]> {
  const all = await getProductSummaries();
  const scored = all
    .filter((p) => p.id !== product.id && p.inStock)
    .map((p) => {
      let s = 0;
      if (product.clubId && p.clubId === product.clubId) s += 4;
      if (p.categoryId === product.categoryId) s += 3;
      if (p.brandId === product.brandId) s += 2;
      s += Math.min(2, p.salesCount / 20);
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.p);
}

/** Navigation model shared by the header, mobile menu and footer. */
export async function getNavigation() {
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);
  return {
    categories: categories.filter((c) => c.showInNav && c.navLabel),
    allCategories: categories,
    settings,
  };
}
