import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageHeader } from "@/components/catalog/Catalog";
import { Container } from "@/components/home/SectionHeading";
import { Crest } from "@/components/ui/Crest";
import { EmptyState } from "@/components/ui/EmptyState";
import { getClubs, getProductSummaries } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Clubs", description: "Shop jerseys and fan kit by football club.", alternates: { canonical: "/clubs" } };

export default async function ClubsPage() {
  const [clubs, products] = await Promise.all([getClubs(), getProductSummaries()]);
  const counts = products.reduce<Record<string, number>>((a, p) => (p.clubId ? ((a[p.clubId] = (a[p.clubId] ?? 0) + 1), a) : a), {});
  const leagues = [...new Set(clubs.map((c) => c.league || "Other"))];
  return (
    <>
      <PageHeader title="Clubs" intro="Find your club’s kit." eyebrow={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Clubs" }]} />} />
      <Container className="space-y-14 pt-10">
        {clubs.length === 0 && <EmptyState title="No clubs yet" />}
        {leagues.map((league) => (
          <section key={league}>
            <h2 className="label mb-4 text-steel">{league}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
              {clubs
                .filter((c) => (c.league || "Other") === league)
                .map((club) => (
                  <li key={club.id}>
                    <Link href={`/clubs/${club.slug}`} className="group flex items-center gap-4 bg-carbon p-4 shadow-[inset_0_0_0_1px_var(--color-line)] transition-colors hover:bg-graphite lg:flex-col lg:py-7">
                      <Crest club={club} className="size-12 shrink-0 transition-transform duration-500 group-hover:scale-110 lg:size-16" />
                      <span className="min-w-0 lg:text-center">
                        <span className="block truncate font-display text-lg font-bold uppercase tracking-wide text-white">{club.name}</span>
                        <span className="block text-xs text-steel">{counts[club.id] ? `${counts[club.id]} product${counts[club.id] === 1 ? "" : "s"}` : "Coming soon"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </Container>
    </>
  );
}
