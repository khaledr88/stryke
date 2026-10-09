"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { cartCount, useCart } from "@/lib/store/cart";
import { useSaved } from "@/lib/store/saved";
import { useMounted, useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

/** App-style bottom bar on phones. Hidden on product and checkout pages, which have their own action bars. */
export function MobileTabBar() {
  const pathname = usePathname();
  const mounted = useMounted();
  const count = useCart((s) => cartCount(s.items));
  const openDrawer = useCart((s) => s.openDrawer);
  const saved = useSaved((s) => s.wishlist.length);
  const setSearchOpen = useUi((s) => s.setSearchOpen);

  if (pathname.startsWith("/product/") || pathname.startsWith("/checkout")) return null;

  const tab = "relative flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]";
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Shortcuts"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink/92 pb-[var(--safe-bottom)] backdrop-blur-xl lg:hidden"
    >
      <Link href="/" className={cn(tab, active("/") ? "text-white" : "text-steel")}>
        <Home className="size-5" strokeWidth={1.7} />
        Home
      </Link>
      <Link href="/shop" className={cn(tab, active("/shop") ? "text-white" : "text-steel")}>
        <LayoutGrid className="size-5" strokeWidth={1.7} />
        Shop
      </Link>
      <button type="button" onClick={() => setSearchOpen(true)} className={cn(tab, "text-steel")}>
        <Search className="size-5" strokeWidth={1.7} />
        Search
      </button>
      <Link href="/wishlist" className={cn(tab, active("/wishlist") ? "text-white" : "text-steel")}>
        <Heart className="size-5" strokeWidth={1.7} />
        Saved
        {mounted && saved > 0 && <span className="absolute top-1.5 right-[calc(50%-18px)] size-2 rounded-full bg-red" />}
      </Link>
      <button type="button" onClick={openDrawer} className={cn(tab, "text-steel")}>
        <ShoppingBag className="size-5" strokeWidth={1.7} />
        Bag
        {mounted && count > 0 && (
          <span className="absolute top-1 right-[calc(50%-22px)] grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[10px] leading-none text-white">
            {count}
          </span>
        )}
      </button>
    </nav>
  );
}
