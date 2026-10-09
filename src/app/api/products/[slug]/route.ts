import { getProductBySlug } from "@/lib/server/catalog";

/** Public product detail (published only) — used by quick view. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(slug);
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(product, { headers: { "cache-control": "public, max-age=30, s-maxage=60" } });
}
