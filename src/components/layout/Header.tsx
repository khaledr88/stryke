"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cartCount, useCart } from "@/lib/store/cart";
import { useMounted, useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

export interface NavItem {
  label: string;
  href: string;
}

export function Header({ items, currency }: { items: NavItem[]; currency: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const mounted = useMounted();
  const count = useCart((s) => cartCount(s.items));
  const openDrawer = useCart((s) => s.openDrawer);
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const setMenuOpen = useUi((s) => s.setMenuOpen);
  const overHero = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !overHero;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        solid ? "bg-ink/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl backdrop-saturate-150" : "bg-gradient-to-b from-black/70 to-transparent",
      )}
    >
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Logo priority />

        <nav aria-label="Main" className="ml-6 hidden flex-1 items-center justify-center xl:flex">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-10 items-center px-3 font-display text-[0.95rem] font-semibold uppercase tracking-[0.16em] transition-colors",
                      active ? "text-white" : "text-silver hover:text-white",
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        "absolute inset-x-3 -bottom-0.5 h-[2px] origin-left skew-x-[-35deg] bg-red transition-transform duration-300 ease-[var(--ease-strike)]",
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 xl:ml-0">
          <span className="mr-2 hidden h-7 items-center px-2 font-display text-xs font-semibold tracking-[0.18em] text-steel shadow-[inset_0_0_0_1px_var(--color-line)] sm:inline-flex" title="Prices are shown in this currency">
            {currency}
          </span>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="grid size-11 place-items-center text-silver transition-colors hover:text-white"
            aria-label="Search products"
          >
            <Search className="size-[22px]" strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={openDrawer}
            className="relative grid size-11 place-items-center text-silver transition-colors hover:text-white"
            aria-label={`Bag${mounted && count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
          >
            <ShoppingBag className="size-[22px]" strokeWidth={1.6} />
            {mounted && count > 0 && (
              <span className="absolute top-1.5 right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[11px] leading-none font-bold text-white tabular-nums">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid size-11 place-items-center text-silver transition-colors hover:text-white xl:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-6" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </header>
  );
}
