"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { searchScore } from "@shared/catalog";
import { effectivePrice, formatMoney } from "@shared/money";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

interface Entry {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  clubName: string | null;
  categoryName: string;
  season: string | null;
  tags: string[];
  price: number;
  salePrice: number | null;
  image: string | null;
  inStock: boolean;
}

let indexPromise: Promise<Entry[]> | null = null;
function loadIndex() {
  indexPromise ??= fetch("/api/search")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

const RECENT_KEY = "stryke-recent-searches";
function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function SearchOverlay({ suggestions }: { suggestions: string[] }) {
  const open = useUi((s) => s.searchOpen);
  const setOpen = useUi((s) => s.setSearchOpen);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<Entry[] | null>(null);
  // Re-read whenever the overlay opens.
  const recent = useMemo(() => (open ? readRecent() : []), [open]);
  const [active, setActive] = useState(-1);
  const deferred = useDeferredValue(query);

  useEffect(() => {
    if (!open) return;
    loadIndex().then(setIndex);
    const t = window.setTimeout(() => input.current?.focus(), 50);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const results = useMemo(() => {
    if (!index || deferred.trim().length < 2) return [];
    return index
      .map((p) => ({ p, s: searchScore(deferred, p) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.p);
  }, [index, deferred]);

  const termSuggestions = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    if (q.length < 1) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 5);
  }, [deferred, suggestions]);

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function remember(q: string) {
    const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }

  function submit(q: string) {
    const term = q.trim();
    if (!term) return;
    remember(term);
    close();
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter" && active >= 0 && results[active]) {
      e.preventDefault();
      remember(query.trim());
      close();
      router.push(`/product/${results[active].slug}`);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex flex-col bg-ink/97 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(query);
            }}
            className="mx-auto flex w-full max-w-4xl items-center gap-3 border-b border-line-strong px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6"
            role="search"
          >
            <Search className="size-6 shrink-0 text-steel" strokeWidth={1.6} />
            <input
              ref={input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search jerseys, boots, clubs…"
              className="h-20 min-w-0 flex-1 bg-transparent font-display text-2xl font-semibold tracking-wide text-white placeholder:text-steel/60 focus:outline-none sm:text-4xl"
              aria-label="Search products"
              aria-controls="search-results"
              aria-activedescendant={active >= 0 ? `sr-${results[active]?.id}` : undefined}
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={close} className="grid size-11 place-items-center text-silver hover:text-white" aria-label="Close search">
              <X className="size-6" strokeWidth={1.5} />
            </button>
          </form>

          <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {query.trim().length < 2 ? (
              <div className="grid gap-10 sm:grid-cols-2">
                {recent.length > 0 && (
                  <section>
                    <h3 className="label mb-4 text-steel">Recent searches</h3>
                    <ul className="flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <li key={r}>
                          <button type="button" onClick={() => submit(r)} className="cut-sm cut px-3 py-2 text-sm text-silver hover:text-white cut-outline">
                            {r}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <section>
                  <h3 className="label mb-4 text-steel">Popular</h3>
                  <ul className="space-y-1">
                    {suggestions.slice(0, 8).map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => submit(s)} className="display py-1 text-2xl text-silver transition-colors hover:text-white">
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <>
                {termSuggestions.length > 0 && (
                  <ul className="mb-6 flex flex-wrap gap-2">
                    {termSuggestions.map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => submit(s)} className="cut cut-sm px-3 py-2 text-sm text-silver hover:text-white cut-outline">
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {index === null ? (
                  <p className="text-steel">Loading products…</p>
                ) : results.length === 0 ? (
                  <p className="text-steel">
                    Nothing matches “{query.trim()}”. Try a club, a brand or a product type.
                  </p>
                ) : (
                  <ul id="search-results" role="listbox" className="divide-y divide-line">
                    {results.map((p, i) => (
                      <li key={p.id} id={`sr-${p.id}`} role="option" aria-selected={i === active}>
                        <Link
                          href={`/product/${p.slug}`}
                          onClick={() => {
                            remember(query.trim());
                            close();
                          }}
                          className={cn("flex items-center gap-4 py-3 transition-colors", i === active ? "bg-white/5" : "hover:bg-white/[0.03]")}
                        >
                          <span className="relative size-16 shrink-0 overflow-hidden bg-carbon">
                            {p.image ? <Image src={p.image} alt="" fill sizes="64px" className="object-cover" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs uppercase tracking-[0.14em] text-steel">{p.brandName}</span>
                            <span className="block truncate text-white">{p.name}</span>
                            {!p.inStock && <span className="text-xs text-red-bright">Sold out</span>}
                          </span>
                          <span className="font-display text-lg font-bold text-white tabular-nums">{formatMoney(effectivePrice(p.price, p.salePrice))}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {results.length > 0 && (
                  <button type="button" onClick={() => submit(query)} className="label mt-6 inline-flex items-center gap-2 text-white hover:text-red-bright">
                    See all results <ArrowUpRight className="size-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
