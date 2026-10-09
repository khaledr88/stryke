import Link from "next/link";
import type { Club } from "@shared/types";
import { Crest } from "@/components/ui/Crest";
import { Container, SectionHeading } from "./SectionHeading";

export function ClubStrip({ clubs }: { clubs: Club[] }) {
  if (!clubs.length) return null;
  const list = clubs.filter((c) => c.featured).length >= 4 ? clubs.filter((c) => c.featured) : clubs;
  return (
    <section className="pt-20 lg:pt-28">
      <Container>
        <SectionHeading title="Popular clubs" href="/clubs" />
        <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-8 lg:gap-3 lg:px-0">
          {list.slice(0, 12).map((club) => (
            <li key={club.id} className="w-[30vw] max-w-[150px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <Link
                href={`/clubs/${club.slug}`}
                className="group flex aspect-square flex-col items-center justify-center gap-2 bg-carbon p-3 shadow-[inset_0_0_0_1px_var(--color-line)] transition-colors hover:bg-graphite"
              >
                <Crest club={club} className="h-[52%] w-[52%] transition-transform duration-500 ease-[var(--ease-strike)] group-hover:scale-110" />
                <span className="line-clamp-1 text-center text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-steel group-hover:text-white">{club.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
