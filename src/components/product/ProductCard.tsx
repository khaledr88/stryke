"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, ShoppingBag } from "lucide-react";
import type { ProductSummary } from "@shared/types";
import { Price } from "@/components/ui/Price";
import { LogoMark } from "@/components/ui/Logo";
import { useSaved } from "@/lib/store/saved";
import { useMounted, useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";
import { ProductBadges } from "./ProductBadges";

export function ProductCard({ product, priority, sizes = "(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw" }: { product: ProductSummary; priority?: boolean; sizes?: string }) {
  const openQuickView = useUi((s) => s.openQuickView);
  const notify = useUi((s) => s.notify);
  const mounted = useMounted();
  const saved = useSaved((s) => s.wishlist.some((w) => w.id === product.id));
  const toggle = useSaved((s) => s.toggleWishlist);
  const href = `/product/${product.slug}`;
  const available = product.sizes.filter((s) => s.available);
  const lowStock = product.inStock && product.totalStock > 0 && product.totalStock <= 3;

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-carbon">
        <Link href={href} className="absolute inset-0" aria-label={product.name}>
          {product.image ? (
            <>
              <Image
                src={product.image.url}
                alt={product.image.alt || product.name}
                fill
                sizes={sizes}
                priority={priority}
                className={cn(
                  "object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-strike)]",
                  product.hoverImage ? "group-hover:opacity-0" : "group-hover:scale-[1.04]",
                  !product.inStock && "opacity-60 grayscale-[35%]",
                )}
              />
              {product.hoverImage && (
                <Image
                  src={product.hoverImage.url}
                  alt=""
                  fill
                  sizes={sizes}
                  className="scale-[1.03] object-cover opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-strike)] group-hover:scale-100 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <LogoMark className="h-auto w-1/4 opacity-15" sizes="80px" />
            </div>
          )}
        </Link>

        <ProductBadges product={product} className="pointer-events-none absolute top-3 left-3" />

        <button
          type="button"
          onClick={() => {
            const added = toggle({
              id: product.id,
              slug: product.slug,
              name: product.name,
              brandName: product.brandName,
              clubName: product.clubName,
              price: product.price,
              salePrice: product.salePrice,
              image: product.image,
              inStock: product.inStock,
            });
            notify(added ? "Saved to your list" : "Removed from saved");
          }}
          aria-pressed={mounted ? saved : false}
          aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
          className="absolute top-2 right-2 grid size-10 place-items-center text-white/90 transition-colors hover:text-white"
        >
          <Heart className={cn("size-5 drop-shadow", mounted && saved && "fill-red text-red")} strokeWidth={1.7} />
        </button>

        {/* Desktop hover actions */}
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-2 gap-2 opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-strike)] group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
          <button
            type="button"
            onClick={() => openQuickView(product)}
            className="cut cut-sm flex h-10 flex-1 items-center justify-center gap-2 bg-white/95 font-display text-sm font-semibold uppercase tracking-[0.12em] text-ink backdrop-blur hover:bg-white"
          >
            <Eye className="size-4" /> Quick view
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-steel">
          {product.brandName}
          {product.clubName ? <span className="text-steel/70"> · {product.clubName}</span> : null}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[0.95rem] leading-snug text-white">
          <Link href={href} className="hover:underline hover:underline-offset-4">
            {product.name}
          </Link>
        </h3>
        {available.length > 0 && product.sizes.length > 1 && (
          <p className="mt-1 truncate text-xs text-steel" aria-label="Available sizes">
            {available
              .slice(0, 6)
              .map((s) => s.size)
              .join("  ")}
            {available.length > 6 ? `  +${available.length - 6}` : ""}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <Price price={product.price} salePrice={product.salePrice} size="sm" />
            {lowStock && <p className="text-xs text-warning">Only {product.totalStock} left</p>}
          </div>
          <button
            type="button"
            onClick={() => openQuickView(product)}
            disabled={!product.inStock}
            className="grid size-10 shrink-0 place-items-center text-silver shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors hover:bg-white hover:text-ink disabled:opacity-30"
            aria-label={product.inStock ? `Choose a size and add ${product.name} to bag` : `${product.name} is sold out`}
          >
            <ShoppingBag className="size-[18px]" strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </article>
  );
}
