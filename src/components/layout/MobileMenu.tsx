"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Wordmark } from "@/components/ui/Logo";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "./Header";

export function MobileMenu({ items, secondary, whatsappUrl }: { items: NavItem[]; secondary: NavItem[]; whatsappUrl: string | null }) {
  const open = useUi((s) => s.menuOpen);
  const setOpen = useUi((s) => s.setMenuOpen);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Menu" side="left" hideTitle>
      <div className="flex min-h-full flex-col px-6 pb-[calc(2rem+var(--safe-bottom))]">
        <Wordmark className="mb-8 h-5 w-auto opacity-90" sizes="160px" />
        <nav aria-label="Mobile">
          <ul>
            {items.map((item, i) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href} className="border-b border-line">
                  <Link
                    href={item.href}
                    className={cn(
                      "display flex items-center justify-between py-3.5 text-[2.1rem] transition-colors",
                      active ? "text-white" : "text-silver hover:text-white",
                    )}
                    style={{ transitionDelay: `${i * 20}ms` }}
                  >
                    {item.label}
                    {active && <span className="strike-line" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-steel">
          {secondary.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="hover:text-white">
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cut mt-auto flex items-center justify-center gap-2 bg-[#1f8f4e] py-3.5 font-display font-semibold uppercase tracking-[0.14em] text-white"
          >
            <MessageCircle className="size-5" /> Chat on WhatsApp
          </a>
        )}
      </div>
    </Sheet>
  );
}
