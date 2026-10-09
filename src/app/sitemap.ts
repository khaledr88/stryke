import type { MetadataRoute } from "next";
import { getBrands, getCategories, getClubs, getCollections, getProductSummaries } from "@/lib/server/catalog";
import { absoluteUrl } from "@/lib/utils/site";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, brands, clubs, collections] = await Promise.all([
    getProductSummaries(),
    getCategories(),
    getBrands(),
    getClubs(),
    getCollections(),
  ]);
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: absoluteUrl(path), priority, changeFrequency: "daily" });
  return [
    page("/", 1),
    page("/shop", 0.9),
    page("/clubs", 0.7),
    page("/brands", 0.7),
    page("/collections", 0.7),
    ...categories.map((c) => page(`/category/${c.slug}`, 0.8)),
    ...clubs.map((c) => page(`/clubs/${c.slug}`, 0.7)),
    ...brands.map((b) => page(`/brands/${b.slug}`, 0.6)),
    ...collections.map((c) => page(`/collections/${c.slug}`, 0.6)),
    ...products.filter((p) => !p.isSample).map((p) => ({ url: absoluteUrl(`/product/${p.slug}`), priority: 0.8, changeFrequency: "weekly" as const, images: p.image ? [p.image.url] : undefined })),
  ];
}
