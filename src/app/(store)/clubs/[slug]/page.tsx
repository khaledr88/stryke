import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, Catalog, PageHeader } from "@/components/catalog/Catalog";
import { Crest } from "@/components/ui/Crest";
import { getClubBySlug, getProductSummaries } from "@/lib/server/catalog";
import type { SearchParams } from "@/lib/utils/filters";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getClubBySlug(slug);
  if (!c) return { title: "Not found" };
  return {
    title: `${c.name} jerseys and kit`,
    description: `Shop ${c.name} jerseys and fan wear at STRYKE. Delivered across Lebanon, cash on delivery.`,
    alternates: { canonical: `/clubs/${c.slug}` },
  };
}

export default async function ClubPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [club, all] = await Promise.all([getClubBySlug(slug), getProductSummaries()]);
  if (!club) notFound();
  const products = all.filter((p) => p.clubId === club.id);
  return (
    <>
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ background: `radial-gradient(60% 120% at 85% 0%, ${club.colors[0]}55 0%, transparent 60%), radial-gradient(50% 100% at 100% 100%, ${club.colors[1]}33 0%, transparent 60%)` }}
        />
        <PageHeader
          title={club.name}
          intro={[club.league, club.country].filter(Boolean).join(" · ")}
          eyebrow={<Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Clubs", href: "/clubs" }, { label: club.name }]} />}
        >
          <Crest club={club} className="hidden size-28 sm:block lg:size-36" sizes="144px" />
        </PageHeader>
      </div>
      <div className="pt-8">
        <Catalog products={products} searchParams={sp} basePath={`/clubs/${club.slug}`} hide={{ club: true }} emptyTitle={`No ${club.name} products yet`} />
      </div>
    </>
  );
}
