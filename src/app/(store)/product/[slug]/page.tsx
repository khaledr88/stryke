import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, RotateCcw, Truck } from "lucide-react";
import { effectivePrice, formatMoney } from "@shared/money";
import { PRODUCT_TYPE_LABELS } from "@shared/constants";
import { truncate } from "@shared/text";
import { Breadcrumbs } from "@/components/catalog/Catalog";
import { Container } from "@/components/home/SectionHeading";
import { ProductBadges } from "@/components/product/ProductBadges";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductRail } from "@/components/product/ProductRail";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { RecentlyViewed, TrackRecentlyViewed } from "@/components/product/RecentlyViewed";
import { Price } from "@/components/ui/Price";
import { RichText } from "@/components/ui/RichText";
import { getClubs, getProductBySlug, getRelatedProducts, getSettings } from "@/lib/server/catalog";
import { absoluteUrl } from "@/lib/utils/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const price = formatMoney(effectivePrice(p.price, p.salePrice), p.currency);
  const description = truncate(p.description?.replace(/\s+/g, " ") || `${p.name} by ${p.brandName}. ${price}. Delivered across Lebanon, cash on delivery.`, 158);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description,
      url: absoluteUrl(`/product/${p.slug}`),
      images: p.images.slice(0, 4).map((i) => ({ url: i.url, alt: i.alt || p.name })),
    },
    twitter: { card: "summary_large_image", title: p.name, description, images: p.images[0] ? [p.images[0].url] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [related, settings, clubs] = await Promise.all([getRelatedProducts(product), getSettings(), getClubs()]);
  const club = product.clubId ? clubs.find((c) => c.id === product.clubId) : null;

  const zones = settings.delivery.zones.filter((z) => z.enabled && z.fee != null);
  const fees = zones.map((z) => z.fee!);
  const minFee = fees.length ? Math.min(...fees) : null;
  const maxFee = fees.length ? Math.max(...fees) : null;
  const url = absoluteUrl(`/product/${product.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        image: product.images.map((i) => i.url),
        description: product.description || undefined,
        sku: product.sku,
        brand: { "@type": "Brand", name: product.brandName },
        category: product.categoryName,
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: product.currency,
          price: (effectivePrice(product.price, product.salePrice) / 100).toFixed(2),
          availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: settings.storeName },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: product.categoryName, item: absoluteUrl(`/shop?category=${product.categoryId}`) },
          { "@type": "ListItem", position: 3, name: product.name, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackRecentlyViewed
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          brandName: product.brandName,
          clubName: product.clubName,
          price: product.price,
          salePrice: product.salePrice,
          image: product.images[0] ?? null,
          inStock: product.inStock,
        }}
      />
      <Container className="pt-0 pb-6 sm:pt-4 lg:pt-8">
        <div className="label mb-5 hidden text-[0.7rem] text-steel sm:block">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: product.categoryName, href: `/shop?category=${product.categoryId}` },
              ...(club ? [{ label: club.name, href: `/clubs/${club.slug}` }] : []),
              { label: product.name },
            ]}
          />
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(380px,1fr)] lg:gap-14 xl:gap-20">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
            <ProductBadges product={product} max={3} className="mb-4" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              <Link href={`/shop?brand=${product.brandId}`} className="hover:text-white">
                {product.brandName}
              </Link>
              {club && (
                <>
                  {" · "}
                  <Link href={`/clubs/${club.slug}`} className="hover:text-white">
                    {club.name}
                  </Link>
                </>
              )}
            </p>
            <h1 className="display mt-2 text-[2.6rem] leading-[0.92] text-white sm:text-5xl xl:text-6xl">{product.name}</h1>
            <div className="mt-4 flex items-center gap-4">
              <Price price={product.price} salePrice={product.salePrice} currency={product.currency} size="lg" showPercent />
            </div>
            {product.season && <p className="mt-2 text-sm text-steel">Season {product.season}</p>}

            <div className="mt-8">
              <PurchasePanel product={product} />
            </div>

            <ul className="mt-8 divide-y divide-line border-y border-line text-sm">
              <li className="flex gap-3 py-4">
                <Truck className="mt-0.5 size-5 shrink-0 text-silver" strokeWidth={1.6} />
                <div>
                  <p className="text-white">Delivery across Lebanon</p>
                  <p className="text-steel">
                    {minFee != null
                      ? minFee === maxFee
                        ? `${formatMoney(minFee)} delivery`
                        : `${formatMoney(minFee)}–${formatMoney(maxFee!)} depending on your area`
                      : "Delivery fee shown at checkout"}
                    {settings.delivery.freeDeliveryThreshold ? `. Free over ${formatMoney(settings.delivery.freeDeliveryThreshold)}.` : "."}
                  </p>
                </div>
              </li>
              {settings.payments.cod.enabled && (
                <li className="flex gap-3 py-4">
                  <Banknote className="mt-0.5 size-5 shrink-0 text-silver" strokeWidth={1.6} />
                  <div>
                    <p className="text-white">Cash on delivery</p>
                    <p className="text-steel">No account or card needed — pay when it arrives.</p>
                  </div>
                </li>
              )}
              {settings.policies.returns && (
                <li className="flex gap-3 py-4">
                  <RotateCcw className="mt-0.5 size-5 shrink-0 text-silver" strokeWidth={1.6} />
                  <div>
                    <p className="text-white">Returns</p>
                    <Link href="/info/returns" className="text-steel underline underline-offset-4 hover:text-white">
                      Read our return policy
                    </Link>
                  </div>
                </li>
              )}
            </ul>

            {(product.description || product.sku) && (
              <details className="group border-b border-line" open>
                <summary className="flex h-14 cursor-pointer list-none items-center justify-between font-display text-base font-semibold uppercase tracking-[0.14em] text-white [&::-webkit-details-marker]:hidden">
                  Details
                  <span className="text-2xl leading-none text-steel transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="pb-6">
                  {product.description ? <RichText text={product.description} className="text-[0.95rem]" /> : null}
                  <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
                    <dt className="text-steel">Type</dt>
                    <dd className="text-silver">{PRODUCT_TYPE_LABELS[product.productType]}</dd>
                    <dt className="text-steel">Product code</dt>
                    <dd className="text-silver">{product.sku}</dd>
                  </dl>
                  {product.isSample && <p className="mt-4 text-sm text-warning">Sample listing for testing — not real stock.</p>}
                </div>
              </details>
            )}
          </div>
        </div>
      </Container>

      <ProductRail title="You may also like" products={related} />
      <RecentlyViewed excludeId={product.id} />
      <div className="h-20 lg:hidden" aria-hidden />
    </>
  );
}
