"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Container, SectionHeading } from "@/components/home/SectionHeading";
import { Price } from "@/components/ui/Price";
import { useSaved, type SavedProduct } from "@/lib/store/saved";
import { useMounted } from "@/lib/store/ui";

export function TrackRecentlyViewed({ product }: { product: Omit<SavedProduct, "savedAt"> }) {
  const push = useSaved((s) => s.pushRecent);
  useEffect(() => {
    push(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);
  return null;
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const mounted = useMounted();
  const recent = useSaved((s) => s.recent);
  const list = mounted ? recent.filter((r) => r.id !== excludeId).slice(0, 8) : [];
  if (!list.length) return null;
  return (
    <section className="pt-20 lg:pt-24">
      <Container>
        <SectionHeading title="Recently viewed" />
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-8 lg:px-0">
          {list.map((p) => (
            <li key={p.id} className="w-36 shrink-0 lg:w-auto">
              <Link href={`/product/${p.slug}`} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden bg-carbon">
                  {p.image ? <Image src={p.image.url} alt={p.name} fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
                </span>
                <span className="mt-2 line-clamp-2 block text-sm leading-snug text-silver group-hover:text-white">{p.name}</span>
                <Price price={p.price} salePrice={p.salePrice} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
