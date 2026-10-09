import type { ProductFilters, SortKey } from "@shared/catalog";
import type { ProductSummary } from "@shared/types";
import { effectivePrice } from "@shared/money";

export type SearchParams = Record<string, string | string[] | undefined>;

const SORTS: SortKey[] = ["featured", "newest", "price-asc", "price-desc", "best-selling"];
export const SORT_LABELS: Record<SortKey, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "best-selling": "Best selling",
};

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean).slice(0, 30);
const num = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(sp: SearchParams): ProductFilters & { page: number } {
  const sort = one(sp.sort) as SortKey;
  return {
    q: one(sp.q).slice(0, 80) || undefined,
    categories: list(sp.category),
    brands: list(sp.brand),
    clubs: list(sp.club),
    sizes: list(sp.size),
    minPrice: num(sp.min),
    maxPrice: num(sp.max),
    onSale: one(sp.sale) === "1",
    inStock: one(sp.instock) === "1",
    isNew: one(sp.new) === "1",
    sort: SORTS.includes(sort) ? sort : undefined,
    page: Math.max(1, Math.min(50, Number(one(sp.page)) || 1)),
  };
}

export interface Facet {
  value: string;
  label: string;
  count: number;
}

export interface Facets {
  categories: Facet[];
  brands: Facet[];
  clubs: Facet[];
  sizes: Facet[];
  priceMax: number;
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
function sizeRank(s: string) {
  const i = SIZE_ORDER.indexOf(s);
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isFinite(n) ? 100 + n : 1000;
}

export function buildFacets(products: ProductSummary[]): Facets {
  const cat = new Map<string, Facet>();
  const brand = new Map<string, Facet>();
  const club = new Map<string, Facet>();
  const size = new Map<string, Facet>();
  let priceMax = 0;
  for (const p of products) {
    const bump = (m: Map<string, Facet>, value: string, label: string) => {
      const f = m.get(value);
      if (f) f.count++;
      else m.set(value, { value, label, count: 1 });
    };
    bump(cat, p.categoryId, p.categoryName);
    bump(brand, p.brandId, p.brandName);
    if (p.clubId && p.clubName) bump(club, p.clubId, p.clubName);
    for (const s of p.sizes) if (s.available) bump(size, s.size, s.size);
    priceMax = Math.max(priceMax, effectivePrice(p.price, p.salePrice));
  }
  const byCount = (a: Facet, b: Facet) => b.count - a.count || a.label.localeCompare(b.label);
  return {
    categories: [...cat.values()].sort(byCount),
    brands: [...brand.values()].sort(byCount),
    clubs: [...club.values()].sort(byCount),
    sizes: [...size.values()].sort((a, b) => sizeRank(a.value) - sizeRank(b.value)),
    priceMax,
  };
}
