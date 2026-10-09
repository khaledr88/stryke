import Link from "next/link";
import { Suspense } from "react";
import { filterProducts } from "@shared/catalog";
import type { ProductSummary } from "@shared/types";
import { Container } from "@/components/home/SectionHeading";
import { ProductCard } from "@/components/product/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildFacets, parseFilters, type SearchParams } from "@/lib/utils/filters";
import { DesktopFilters, MobileFilters, SortSelect } from "./Filters";

const PAGE_SIZE = 24;

export interface CatalogProps {
  products: ProductSummary[];
  searchParams: SearchParams;
  basePath: string;
  hide?: Partial<Record<"category" | "brand" | "club", boolean>>;
  emptyTitle?: string;
}

/** Product listing with server-side filtering, sorting and "load more" paging. */
export function Catalog({ products, searchParams, basePath, hide = {}, emptyTitle = "Nothing here yet" }: CatalogProps) {
  const f = parseFilters(searchParams);
  const results = filterProducts(products, f);
  const facets = buildFacets(products);
  const shown = results.slice(0, f.page * PAGE_SIZE);
  const nextParams = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v.join(",") : v]])),
  );
  nextParams.set("page", String(f.page + 1));

  if (products.length === 0) {
    return (
      <Container>
        <EmptyState title={emptyTitle} body="New stock is on its way. In the meantime, explore the rest of the store." action={<ButtonLink href="/shop">Browse all products</ButtonLink>} />
      </Container>
    );
  }

  return (
    <Container className="grid gap-10 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr]">
      <Suspense>
        <DesktopFilters facets={facets} hide={hide} />
      </Suspense>
      <div>
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-sm text-steel" aria-live="polite">
            {results.length} product{results.length === 1 ? "" : "s"}
            {f.q ? (
              <>
                {" "}
                for <span className="text-white">“{f.q}”</span>
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <Suspense>
              <MobileFilters facets={facets} hide={hide} total={results.length} />
              <SortSelect />
            </Suspense>
          </div>
        </div>
        {results.length === 0 ? (
          <EmptyState
            title="No matches"
            body={f.q ? "Try a different spelling, a club name or a brand." : "Try removing a filter."}
            action={<ButtonLink href={basePath} variant="secondary">Clear filters</ButtonLink>}
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-4 md:grid-cols-3 2xl:grid-cols-4">
              {shown.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} priority={i < 4} />
                </li>
              ))}
            </ul>
            {shown.length < results.length && (
              <div className="mt-14 flex flex-col items-center gap-3">
                <p className="text-sm text-steel">
                  Showing {shown.length} of {results.length}
                </p>
                <Link
                  href={`${basePath}?${nextParams.toString()}`}
                  scroll={false}
                  className="cut cut-outline inline-flex h-12 items-center px-8 font-display font-semibold uppercase tracking-[0.14em] text-white hover:bg-white hover:text-ink"
                >
                  Load more
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  );
}

export function PageHeader({
  title,
  intro,
  eyebrow,
  children,
}: {
  title: string;
  intro?: string;
  eyebrow?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-line pt-10 pb-10 lg:pt-16 lg:pb-14">
      <Container className="relative">
        {eyebrow ? <div className="label mb-4 flex items-center gap-3 text-[0.72rem] text-steel">{eyebrow}</div> : null}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="display text-[3rem] text-white sm:text-6xl lg:text-7xl">{title}</h1>
            {intro ? <p className="mt-3 max-w-2xl text-silver">{intro}</p> : null}
          </div>
          {children}
        </div>
      </Container>
    </header>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 normal-case tracking-[0.12em]">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-steel/50">/</span>}
            {it.href ? (
              <Link href={it.href} className="hover:text-white">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-silver">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
