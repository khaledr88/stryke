import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@shared/types";
import { Media } from "@/components/ui/Media";
import { Container } from "./SectionHeading";

export function CategoryTiles({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  if (!categories.length) return null;
  return (
    <section aria-labelledby="shop-by-category" className="pt-6 lg:pt-10">
      <Container>
        <h2 id="shop-by-category" className="sr-only">
          Shop by category
        </h2>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-3 lg:overflow-visible lg:px-0">
          {categories.map((c, i) => (
            <li key={c.id} className="w-[64vw] max-w-[300px] shrink-0 snap-start sm:w-[38vw] lg:w-auto lg:max-w-none">
              <Link href={`/category/${c.slug}`} className="group relative block aspect-[3/4] overflow-hidden cut-lg cut">
                <Media
                  image={c.image}
                  alt={c.name}
                  sizes="(min-width:1024px) 20vw, 64vw"
                  priority={i < 3}
                  className="absolute inset-0"
                  imgClassName="transition-transform duration-[900ms] ease-[var(--ease-strike)] group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className="display text-[1.9rem] leading-[0.92] text-white sm:text-[2.2rem]">{c.name}</h3>
                  <p className="mt-2 flex items-center gap-2 font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-silver transition-colors group-hover:text-white">
                    Shop now
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    {counts[c.id] ? <span className="ml-auto text-steel">{counts[c.id]}</span> : null}
                  </p>
                </div>
                <span className="absolute top-0 left-0 h-[3px] w-0 bg-red transition-[width] duration-500 ease-[var(--ease-strike)] group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
