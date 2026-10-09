import { getProductSummaries } from "@/lib/server/catalog";

/**
 * Compact catalogue index for instant search. Small enough to fetch once per
 * session; the client does the matching so results appear as you type.
 */
export async function GET() {
  const products = await getProductSummaries();
  const index = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandName: p.brandName,
    clubName: p.clubName,
    categoryName: p.categoryName,
    season: p.season,
    tags: p.tags,
    price: p.price,
    salePrice: p.salePrice,
    image: p.image?.url ?? null,
    inStock: p.inStock,
  }));
  return Response.json(index, {
    headers: { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
