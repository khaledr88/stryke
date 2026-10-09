import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs, Catalog, PageHeader } from "@/components/catalog/Catalog";
import { getBrandBySlug, getProductSummaries } from "@/lib/server/catalog";
import type { SearchParams } from "@/lib/utils/filters";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBrandBySlug(slug);
  if (!b) return { title: "Not found" };
  return { title: b.name, description: b.description || `Shop ${b.name} football and sportswear at STRYKE.`, alternates: { canonical: `/brands/${b.slug}` } };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [brand, all] = await Promise.all([getBrandBySlug(slug), getProductSummaries()]);
  if (!brand) notFound();
  const products = all.filter((p) => p.brandId === brand.id);
  return (
    <>
      <PageHeader
        title={brand.name}
        intro={brand.description}
        eyebrow={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands", href: "/brands" }, { label: brand.name }]} />}
      >
        {brand.logo?.url ? (
          <span className="relative block h-14 w-32">
            <Image src={brand.logo.url} alt="" fill sizes="128px" className="object-contain brightness-0 invert" />
          </span>
        ) : null}
      </PageHeader>
      <div className="pt-8">
        <Catalog products={products} searchParams={sp} basePath={`/brands/${brand.slug}`} hide={{ brand: true }} emptyTitle={`No ${brand.name} products yet`} />
      </div>
    </>
  );
}
