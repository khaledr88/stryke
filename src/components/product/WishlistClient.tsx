"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Container } from "@/components/home/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Price } from "@/components/ui/Price";
import { useSaved } from "@/lib/store/saved";
import { useMounted } from "@/lib/store/ui";

export function WishlistClient() {
  const mounted = useMounted();
  const list = useSaved((s) => s.wishlist);
  const remove = useSaved((s) => s.removeWishlist);

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="display text-5xl text-white lg:text-6xl">Saved items</h1>
      <p className="mt-2 text-steel">Saved on this device. No account needed.</p>
      {!mounted ? null : list.length === 0 ? (
        <EmptyState title="Nothing saved yet" body="Tap the heart on any product to keep it here." action={<ButtonLink href="/shop">Browse products</ButtonLink>} />
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-4 md:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <li key={p.id} className="group relative">
              <Link href={`/product/${p.slug}`} className="block">
                <span className="relative block aspect-[4/5] overflow-hidden bg-carbon">
                  {p.image ? <Image src={p.image.url} alt={p.name} fill sizes="(min-width:1280px) 22vw, 46vw" className="object-cover" /> : null}
                </span>
                <span className="mt-3 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-steel">{p.brandName}</span>
                <span className="mt-1 line-clamp-2 block text-white">{p.name}</span>
                <Price price={p.price} salePrice={p.salePrice} size="sm" />
              </Link>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute top-2 right-2 grid size-10 place-items-center bg-black/60 text-white backdrop-blur hover:bg-black"
                aria-label={`Remove ${p.name} from saved`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
