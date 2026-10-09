"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { SortKey } from "@shared/catalog";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { SORT_LABELS, type Facets } from "@/lib/utils/filters";
import { cn } from "@/lib/utils/cn";

type Hide = Partial<Record<"category" | "brand" | "club", boolean>>;

function useFilterUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const get = (k: string) => params.get(k)?.split(",").filter(Boolean) ?? [];
  const push = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const toggle = (k: string, v: string) =>
    push((p) => {
      const cur = new Set(p.get(k)?.split(",").filter(Boolean) ?? []);
      if (cur.has(v)) cur.delete(v);
      else cur.add(v);
      if (cur.size) p.set(k, [...cur].join(","));
      else p.delete(k);
    });
  const set = (k: string, v: string | null) => push((p) => (v ? p.set(k, v) : p.delete(k)));
  const clear = () =>
    push((p) => {
      for (const k of ["category", "brand", "club", "size", "min", "max", "sale", "instock", "new"]) p.delete(k);
    });
  return { params, get, toggle, set, clear, pending };
}

export function SortSelect() {
  const { params, set } = useFilterUrl();
  const value = (params.get("sort") as SortKey) || "featured";
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Sort by</span>
      <select
        value={value}
        onChange={(e) => set("sort", e.target.value === "featured" ? null : e.target.value)}
        className="h-11 appearance-none bg-transparent pr-9 pl-4 font-display text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:outline-none"
      >
        {Object.entries(SORT_LABELS).map(([k, label]) => (
          <option key={k} value={k} className="bg-carbon normal-case">
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-steel" />
    </label>
  );
}

function FilterPanel({ facets, hide }: { facets: Facets; hide: Hide }) {
  const { get, toggle, set, params, clear } = useFilterUrl();
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const active = ["category", "brand", "club", "size", "min", "max", "sale", "instock", "new"].some((k) => params.get(k));

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2 pb-4">
        {[
          ["instock", "In stock"],
          ["sale", "On sale"],
          ["new", "New"],
        ].map(([k, label]) => {
          const on = params.get(k) === "1";
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => set(k, on ? null : "1")}
              className={cn(
                "h-9 px-3 text-sm transition-colors",
                on ? "bg-white text-ink" : "text-silver shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-white",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!hide.category && facets.categories.length > 1 && (
        <Group title="Category" count={get("category").length}>
          {facets.categories.map((f) => (
            <Check key={f.value} label={f.label} count={f.count} checked={get("category").includes(f.value)} onChange={() => toggle("category", f.value)} />
          ))}
        </Group>
      )}
      {!hide.club && facets.clubs.length > 0 && (
        <Group title="Club" count={get("club").length}>
          {facets.clubs.map((f) => (
            <Check key={f.value} label={f.label} count={f.count} checked={get("club").includes(f.value)} onChange={() => toggle("club", f.value)} />
          ))}
        </Group>
      )}
      {!hide.brand && facets.brands.length > 1 && (
        <Group title="Brand" count={get("brand").length}>
          {facets.brands.map((f) => (
            <Check key={f.value} label={f.label} count={f.count} checked={get("brand").includes(f.value)} onChange={() => toggle("brand", f.value)} />
          ))}
        </Group>
      )}
      {facets.sizes.length > 0 && (
        <Group title="Size" count={get("size").length}>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {facets.sizes.map((f) => {
              const on = get("size").includes(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle("size", f.value)}
                  className={cn("h-10 text-sm font-semibold", on ? "bg-white text-ink" : "text-silver shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-white")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </Group>
      )}
      <Group title="Price (USD)" count={params.get("min") || params.get("max") ? 1 : 0}>
        <form
          className="flex items-end gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            set("min", min || null);
            set("max", max || null);
          }}
        >
          <label className="flex-1 text-xs text-steel">
            Min
            <input value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="mt-1 h-10 w-full bg-ink px-3 text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:outline-none" placeholder="0" />
          </label>
          <label className="flex-1 text-xs text-steel">
            Max
            <input value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="mt-1 h-10 w-full bg-ink px-3 text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:outline-none" placeholder={String(Math.ceil(facets.priceMax / 100))} />
          </label>
          <button type="submit" className="h-10 px-3 text-sm text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-white hover:text-ink">
            Apply
          </button>
        </form>
      </Group>
      {active && (
        <button type="button" onClick={clear} className="mt-4 inline-flex items-center gap-1.5 text-sm text-silver underline-offset-4 hover:text-white hover:underline">
          <X className="size-4" /> Clear filters
        </button>
      )}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <details className="group border-t border-line py-1" open>
      <summary className="flex h-12 cursor-pointer list-none items-center justify-between font-display text-sm font-semibold uppercase tracking-[0.14em] text-white [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {count > 0 && <span className="ml-2 text-red-bright">{count}</span>}
        </span>
        <ChevronDown className="size-4 text-steel transition-transform group-open:rotate-180" />
      </summary>
      <div className="max-h-72 space-y-0.5 overflow-y-auto pb-3">{children}</div>
    </details>
  );
}

function Check({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm text-silver hover:text-white">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-[var(--color-red)]" />
      <span className="flex-1">{label}</span>
      <span className="text-xs text-steel tabular-nums">{count}</span>
    </label>
  );
}

export function DesktopFilters({ facets, hide }: { facets: Facets; hide: Hide }) {
  return (
    <aside className="hidden lg:block" aria-label="Filters">
      <div className="sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100dvh-var(--header-h)-3rem)] overflow-y-auto pr-2 no-scrollbar">
        <FilterPanel facets={facets} hide={hide} />
      </div>
    </aside>
  );
}

export function MobileFilters({ facets, hide, total }: { facets: Facets; hide: Hide; total: number }) {
  const [open, setOpen] = useState(false);
  const { params } = useFilterUrl();
  const activeCount = ["category", "brand", "club", "size", "min", "max", "sale", "instock", "new"].filter((k) => params.get(k)).length;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 px-4 font-display text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] lg:hidden"
      >
        <SlidersHorizontal className="size-4" /> Filter
        {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-red text-[11px]">{activeCount}</span>}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filter"
        side="bottom"
        footer={
          <Button full onClick={() => setOpen(false)}>
            Show {total} result{total === 1 ? "" : "s"}
          </Button>
        }
      >
        <div className="px-5 pt-2 pb-4">
          <FilterPanel facets={facets} hide={hide} />
        </div>
      </Sheet>
    </>
  );
}
