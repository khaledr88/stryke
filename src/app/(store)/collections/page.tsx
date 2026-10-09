import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { matchesCollection } from "@shared/catalog";
import { Breadcrumbs, PageHeader } from "@/components/catalog/Catalog";
import { Container } from "@/components/home/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Media } from "@/components/ui/Media";
import { getCollections, getProductSummaries } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Collections", alternates: { canonical: "/collections" } };

export default async function CollectionsPage() {
  const [collections, products] = await Promise.all([getCollections(), getProductSummaries()]);
  return (
    <>
      <PageHeader title="Collections" intro="Curated edits for the season, the pitch and the training ground." eyebrow={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections" }]} />} />
      <Container className="pt-10">
        {collections.length === 0 ? (
          <EmptyState title="No collections yet" />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {collections.map((c) => {
              const count = products.filter((p) => matchesCollection(p, c.rule)).length;
              return (
                <li key={c.id}>
                  <Link href={`/collections/${c.slug}`} className="group relative flex min-h-[300px] items-end overflow-hidden cut cut-lg">
                    <Media image={c.image} alt="" sizes="(min-width:768px) 50vw, 100vw" className="absolute inset-0" imgClassName="transition-transform duration-1000 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                    <div className="relative p-6 sm:p-8">
                      <p className="text-sm text-silver">{c.subtitle}</p>
                      <h2 className="display mt-1 text-4xl text-white sm:text-5xl">{c.title}</h2>
                      <p className="mt-4 inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.14em] text-white">
                        {count ? `${count} product${count === 1 ? "" : "s"}` : "Coming soon"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </>
  );
}
