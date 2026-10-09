import type { ProductSummary } from "@shared/types";
import { Container, SectionHeading } from "@/components/home/SectionHeading";
import { ProductCard } from "./ProductCard";

/** Horizontal carousel on phones, grid from tablet up. */
export function ProductRail({
  title,
  href,
  products,
  intro,
  className = "pt-20 lg:pt-28",
}: {
  title: string;
  href?: string;
  products: ProductSummary[];
  intro?: string;
  className?: string;
}) {
  if (!products.length) return null;
  return (
    <section className={className}>
      <Container>
        <SectionHeading title={title} href={href} intro={intro} />
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-x-4 md:gap-y-10 md:overflow-visible md:px-0 xl:grid-cols-4">
          {products.map((p) => (
            <li key={p.id} className="w-[64vw] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none">
              <ProductCard product={p} sizes="(min-width:1280px) 23vw, (min-width:768px) 31vw, 64vw" />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
