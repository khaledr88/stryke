import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, Catalog, PageHeader } from "@/components/catalog/Catalog";
import { getCollectionBySlug, getCollectionProducts } from "@/lib/server/catalog";
import type { SearchParams } from "@/lib/utils/filters";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) return { title: "Not found" };
  return { title: c.title, description: c.description || c.subtitle, alternates: { canonical: `/collections/${c.slug}` }, openGraph: c.image ? { images: [c.image.url] } : undefined };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();
  const products = await getCollectionProducts(collection);
  return (
    <>
      <PageHeader
        title={collection.title}
        intro={collection.description}
        eyebrow={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections", href: "/collections" }, { label: collection.title }]} />}
      />
      <div className="pt-8">
        <Catalog products={products} searchParams={sp} basePath={`/collections/${collection.slug}`} emptyTitle="This collection is being restocked" />
      </div>
    </>
  );
}
