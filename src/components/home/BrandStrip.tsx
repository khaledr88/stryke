import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@shared/types";
import { Container, SectionHeading } from "./SectionHeading";

export function BrandTile({ brand }: { brand: Brand }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-carbon shadow-[inset_0_0_0_1px_var(--color-line)] transition-colors hover:bg-graphite"
    >
      {brand.logo?.url ? (
        <span className="relative h-1/2 w-3/5">
          <Image src={brand.logo.url} alt={brand.name} fill sizes="200px" className="object-contain opacity-80 brightness-0 invert transition-opacity group-hover:opacity-100" />
        </span>
      ) : (
        <span className="display px-3 text-center text-[1.6rem] leading-none text-silver transition-colors group-hover:text-white sm:text-3xl">{brand.name}</span>
      )}
      <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-red transition-[width] duration-500 ease-[var(--ease-strike)] group-hover:w-full" />
    </Link>
  );
}

export function BrandStrip({ brands }: { brands: Brand[] }) {
  if (!brands.length) return null;
  return (
    <section className="pt-20 lg:pt-28">
      <Container>
        <SectionHeading title="Shop by brand" href="/brands" />
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:gap-3">
          {brands.slice(0, 10).map((b) => (
            <li key={b.id}>
              <BrandTile brand={b} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
