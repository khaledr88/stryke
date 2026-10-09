import type { CollectionRule, Product, ProductSummary, ProductVariant } from "./types";
import { effectivePrice } from "./money";
import { normalizeSearch, variantId } from "./text";

export function stockStats(variants: Pick<ProductVariant, "stock">[]) {
  const totalStock = variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
  const minVariantStock = variants.length ? Math.min(...variants.map((v) => Math.max(0, v.stock))) : 0;
  return { totalStock, minVariantStock, inStock: totalStock > 0 };
}

export function buildVariants(
  baseSku: string,
  input: { size: string; color: string | null; sku: string; stock: number }[],
): ProductVariant[] {
  return input.map((v) => ({
    id: variantId(v.size, v.color),
    size: v.size,
    color: v.color || null,
    sku: v.sku || [baseSku, v.size, v.color].filter(Boolean).join("-").toUpperCase().replace(/\s+/g, ""),
    stock: v.stock,
  }));
}

export function isOnSale(p: Pick<Product, "price" | "salePrice">): boolean {
  return effectivePrice(p.price, p.salePrice) < p.price;
}

export function toSummary(p: Product): ProductSummary {
  const sizeAvailability = p.sizes.map((size) => ({
    size,
    available: p.variants.some((v) => v.size === size && v.stock > 0),
  }));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandId: p.brandId,
    brandName: p.brandName,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    clubId: p.clubId,
    clubName: p.clubName,
    productType: p.productType,
    price: p.price,
    salePrice: p.salePrice,
    image: p.images[0] ?? null,
    hoverImage: p.images[1] ?? null,
    sizes: sizeAvailability,
    tags: p.tags,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    isFeatured: p.isFeatured,
    isLimited: p.isLimited,
    isSample: p.isSample,
    totalStock: p.totalStock,
    inStock: p.inStock,
    onSale: p.onSale,
    salesCount: p.salesCount,
    createdAt: p.createdAt,
    season: p.season,
  };
}

export type Searchable = Pick<ProductSummary, "name" | "brandName" | "clubName" | "categoryName" | "tags" | "season" | "inStock">;

export function searchHaystack(p: Omit<Searchable, "inStock">): string {
  return normalizeSearch([p.name, p.brandName, p.clubName, p.categoryName, p.season, ...p.tags].filter(Boolean).join(" "));
}

/** Score-based matcher used by instant search. Returns 0 when not matching. */
export function searchScore(query: string, p: Searchable): number {
  const q = normalizeSearch(query);
  if (!q) return 0;
  const hay = searchHaystack(p);
  const name = normalizeSearch(p.name);
  const terms = q.split(" ");
  let score = 0;
  for (const t of terms) {
    if (!hay.includes(t)) return 0;
    if (name.startsWith(t)) score += 6;
    else if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(hay)) score += 3;
    else score += 1;
  }
  if (name.includes(q)) score += 5;
  if (p.inStock) score += 1;
  return score;
}

export function matchesCollection(p: ProductSummary, rule: CollectionRule): boolean {
  if (rule.categoryId && p.categoryId !== rule.categoryId) return false;
  if (rule.brandId && p.brandId !== rule.brandId) return false;
  if (rule.clubId && p.clubId !== rule.clubId) return false;
  if (rule.tag && !p.tags.includes(rule.tag)) return false;
  if (rule.onSale && !p.onSale) return false;
  if (rule.isNew && !p.isNew) return false;
  if (rule.isLimited && !p.isLimited) return false;
  if (rule.isBestSeller && !p.isBestSeller) return false;
  return true;
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "best-selling";

export interface ProductFilters {
  q?: string;
  categories?: string[];
  brands?: string[];
  clubs?: string[];
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  inStock?: boolean;
  isNew?: boolean;
  sort?: SortKey;
}

export function filterProducts(list: ProductSummary[], f: ProductFilters): ProductSummary[] {
  let out = list.filter((p) => {
    if (f.categories?.length && !f.categories.includes(p.categoryId)) return false;
    if (f.brands?.length && !f.brands.includes(p.brandId)) return false;
    if (f.clubs?.length && (!p.clubId || !f.clubs.includes(p.clubId))) return false;
    if (f.sizes?.length && !p.sizes.some((s) => s.available && f.sizes!.includes(s.size))) return false;
    const price = effectivePrice(p.price, p.salePrice);
    if (f.minPrice != null && price < f.minPrice) return false;
    if (f.maxPrice != null && price > f.maxPrice) return false;
    if (f.onSale && !p.onSale) return false;
    if (f.inStock && !p.inStock) return false;
    if (f.isNew && !p.isNew) return false;
    return true;
  });

  if (f.q) {
    const scored = out.map((p) => ({ p, s: searchScore(f.q!, p) })).filter((x) => x.s > 0);
    scored.sort((a, b) => b.s - a.s);
    out = scored.map((x) => x.p);
    if (!f.sort || f.sort === "featured") return out;
  }

  const sort = f.sort ?? "featured";
  const byPrice = (p: ProductSummary) => effectivePrice(p.price, p.salePrice);
  const sorted = [...out];
  switch (sort) {
    case "newest":
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "price-asc":
      sorted.sort((a, b) => byPrice(a) - byPrice(b));
      break;
    case "price-desc":
      sorted.sort((a, b) => byPrice(b) - byPrice(a));
      break;
    case "best-selling":
      sorted.sort((a, b) => b.salesCount - a.salesCount);
      break;
    default:
      sorted.sort(
        (a, b) =>
          Number(b.inStock) - Number(a.inStock) ||
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Number(b.isBestSeller) - Number(a.isBestSeller) ||
          b.createdAt - a.createdAt,
      );
  }
  return sorted;
}
