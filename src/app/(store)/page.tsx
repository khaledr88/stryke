import type { Metadata } from "next";
import Link from "next/link";
import type { HomeSectionKey, ProductSummary } from "@shared/types";
import { BrandStrip } from "@/components/home/BrandStrip";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { ClubStrip } from "@/components/home/ClubStrip";
import { Hero } from "@/components/home/Hero";
import { PromoBanners } from "@/components/home/PromoBanners";
import { Container, SectionHeading } from "@/components/home/SectionHeading";
import { ProductRail } from "@/components/product/ProductRail";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { getBrands, getCategories, getClubs, getCollections, getHomepage, getProductSummaries, getSettings } from "@/lib/server/catalog";
import { absoluteUrl } from "@/lib/utils/site";

export const metadata: Metadata = {
  title: { absolute: "STRYKE — Football Jerseys, Boots & Sportswear in Lebanon" },
  alternates: { canonical: "/" },
};

function bestSellers(products: ProductSummary[]) {
  const flagged = products.filter((p) => p.isBestSeller && p.inStock);
  const selling = products.filter((p) => !p.isBestSeller && p.inStock && p.salesCount > 0).sort((a, b) => b.salesCount - a.salesCount);
  return [...flagged.sort((a, b) => b.salesCount - a.salesCount), ...selling].slice(0, 8);
}

export default async function HomePage() {
  const [home, categories, brands, clubs, products, collections, settings] = await Promise.all([
    getHomepage(),
    getCategories(),
    getBrands(),
    getClubs(),
    getProductSummaries(),
    getCollections(),
    getSettings(),
  ]);

  const orderedCategories = [
    ...home.categoryOrder.map((id) => categories.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    ...categories.filter((c) => !home.categoryOrder.includes(c.id)),
  ];
  const counts = products.reduce<Record<string, number>>((acc, p) => ((acc[p.categoryId] = (acc[p.categoryId] ?? 0) + 1), acc), {});
  const newest = [...products].filter((p) => p.inStock).sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
  const featured = products.filter((p) => p.isFeatured && p.inStock).slice(0, 8);
  const featuredCollections = home.featuredCollectionIds.map((id) => collections.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c));

  const sections: Record<HomeSectionKey, React.ReactNode> = {
    categories: <CategoryTiles key="categories" categories={orderedCategories} counts={counts} />,
    bestSellers: <ProductRail key="best" title="Best sellers" href="/shop?sort=best-selling" products={bestSellers(products)} />,
    brands: <BrandStrip key="brands" brands={brands} />,
    clubs: <ClubStrip key="clubs" clubs={clubs} />,
    promos: <PromoBanners key="promos" promos={home.promos} />,
    newArrivals: <ProductRail key="new" title="New arrivals" href="/shop?sort=newest" products={newest} />,
    featured: (
      <div key="featured">
        <ProductRail title="Featured" href="/shop" products={featured} />
        {featuredCollections.length > 0 && (
          <section className="pt-20 lg:pt-28">
            <Container>
              <SectionHeading title="Collections" href="/collections" />
              <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
                {featuredCollections.map((c) => (
                  <li key={c.id} className="bg-ink">
                    <Link href={`/collections/${c.slug}`} className="group block p-6 transition-colors hover:bg-carbon">
                      <p className="text-sm text-steel">{c.subtitle}</p>
                      <p className="display mt-1 text-3xl text-white">{c.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        )}
      </div>
    ),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: settings.storeName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/stryke-logo.png"),
    ...(settings.contact.phone ? { telephone: settings.contact.phone } : {}),
    ...(settings.contact.address ? { address: { "@type": "PostalAddress", streetAddress: settings.contact.address, addressCountry: "LB" } } : {}),
    ...(settings.social.instagram ? { sameAs: [settings.social.instagram] } : {}),
    currenciesAccepted: settings.currency,
    paymentAccepted: "Cash",
    areaServed: "LB",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero slides={home.heroSlides} />
      {home.sectionOrder.filter((k) => !home.hiddenSections.includes(k)).map((k) => sections[k])}
      <RecentlyViewed />
    </>
  );
}
