import type { Metadata } from "next";
import { Breadcrumbs, Catalog, PageHeader } from "@/components/catalog/Catalog";
import { getProductSummaries } from "@/lib/server/catalog";
import type { SearchParams } from "@/lib/utils/filters";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return {
    title: q ? `Search: ${q}` : "Shop all",
    description: "Football jerseys, boots, sportswear and training equipment. Delivered across Lebanon, cash on delivery.",
    alternates: { canonical: "/shop" },
    robots: q ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [sp, products] = await Promise.all([searchParams, getProductSummaries()]);
  const q = typeof sp.q === "string" ? sp.q : "";
  return (
    <>
      <PageHeader
        title={q ? "Search" : "Shop all"}
        intro={q ? undefined : "Every jersey, boot and piece of kit in stock right now."}
        eyebrow={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />}
      />
      <div className="pt-8">
        <Catalog products={products} searchParams={sp} basePath="/shop" />
      </div>
    </>
  );
}
