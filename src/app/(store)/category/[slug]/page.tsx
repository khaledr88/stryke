import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, Catalog, PageHeader } from "@/components/catalog/Catalog";
import { getCategoryBySlug, getProductSummaries } from "@/lib/server/catalog";
import type { SearchParams } from "@/lib/utils/filters";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug);
  if (!c) return { title: "Not found" };
  return {
    title: c.name,
    description: c.description || `Shop ${c.name.toLowerCase()} at STRYKE. Delivered across Lebanon.`,
    alternates: { canonical: `/category/${c.slug}` },
    openGraph: c.image ? { images: [c.image.url] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [category, all] = await Promise.all([getCategoryBySlug(slug), getProductSummaries()]);
  if (!category) notFound();
  const products = all.filter((p) => p.categoryId === category.id);
  return (
    <>
      <PageHeader
        title={category.name}
        intro={category.description}
        eyebrow={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.name }]} />}
      />
      <div className="pt-8">
        <Catalog products={products} searchParams={sp} basePath={`/category/${category.slug}`} hide={{ category: true }} emptyTitle={`No ${category.name.toLowerCase()} yet`} />
      </div>
    </>
  );
}
