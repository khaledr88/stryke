import type { Metadata } from "next";
import { Breadcrumbs, PageHeader } from "@/components/catalog/Catalog";
import { BrandTile } from "@/components/home/BrandStrip";
import { Container } from "@/components/home/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrands } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Brands", alternates: { canonical: "/brands" } };

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <>
      <PageHeader title="Brands" intro="Shop by the brands that make the game." eyebrow={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />} />
      <Container className="pt-10">
        {brands.length ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
            {brands.map((b) => (
              <li key={b.id}>
                <BrandTile brand={b} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No brands yet" />
        )}
      </Container>
    </>
  );
}
