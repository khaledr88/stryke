"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Boxes,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Package,
  Palette,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  X,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { firebase } from "@/lib/firebase/client";
import { useAdminAuth } from "@/lib/admin/auth";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "./ui";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, badge: "pending" as const },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { section: "Catalogue" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/clubs", label: "Clubs", icon: Shield },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { section: "Website" },
  { href: "/admin/content", label: "Homepage", icon: Palette },
  { href: "/admin/settings", label: "Store settings", icon: Settings },
  { href: "/admin/activity", label: "Activity log", icon: Activity },
] as const;

function usePendingCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(firebase().db, "orders"), where("status", "==", "pending"));
    return onSnapshot(q, (s) => setCount(s.size), () => setCount(0));
  }, [enabled]);
  return count;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { status, user, signOut } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (v: boolean) => setOpenFor(v ? pathname : null);
  const pending = usePendingCount(status === "admin");

  useEffect(() => {
    if (status === "signed-out" || status === "not-admin") router.replace("/admin/login");
  }, [status, router]);

  if (status !== "admin") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Checking access…" />
      </div>
    );
  }

  const nav = (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {NAV.map((item, i) =>
          "section" in item ? (
            <li key={i} className="px-3 pt-5 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-steel/70">
              {item.section}
            </li>
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={(item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)) ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 px-3 text-sm transition-colors",
                  (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))
                    ? "bg-white/[0.07] text-white shadow-[inset_2px_0_0_var(--color-red)]"
                    : "text-silver hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <item.icon className="size-[18px]" strokeWidth={1.7} />
                <span className="flex-1">{item.label}</span>
                {"badge" in item && pending > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red px-1.5 text-[11px] font-bold text-white">{pending}</span>}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <Link href="/" target="_blank" className="flex h-10 items-center gap-3 px-3 text-sm text-silver hover:text-white">
        <ExternalLink className="size-[18px]" strokeWidth={1.7} /> View store
      </Link>
      <button type="button" onClick={() => signOut()} className="flex h-10 w-full items-center gap-3 px-3 text-sm text-silver hover:text-white">
        <LogOut className="size-[18px]" strokeWidth={1.7} /> Sign out
      </button>
      <p className="truncate px-3 pt-2 text-xs text-steel" title={user?.email ?? ""}>
        {user?.email}
      </p>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink lg:grid lg:grid-cols-[248px_1fr] print:block print:bg-white">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-[#0a0a0a] lg:flex print:hidden">
        <Link href="/admin" className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <LogoMark className="h-7 w-auto" sizes="40px" />
          <Wordmark className="h-3.5 w-auto" sizes="120px" />
          <span className="ml-auto text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-steel">Admin</span>
        </Link>
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-ink/95 px-4 backdrop-blur lg:hidden no-print">
        <button type="button" onClick={() => setOpen(true)} className="-ml-2 grid size-10 place-items-center text-silver" aria-label="Open admin menu">
          <Menu className="size-5" />
        </button>
        <LogoMark className="h-6 w-auto" sizes="32px" />
        <span className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white">Admin</span>
        {pending > 0 && (
          <Link href="/admin/orders?status=pending" className="ml-auto rounded-full bg-red px-2.5 py-1 text-xs font-bold text-white">
            {pending} pending
          </Link>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#0a0a0a]">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <Wordmark className="h-3.5 w-auto" sizes="120px" />
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center text-silver" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
