"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { collection, doc, limit, orderBy, query } from "firebase/firestore";
import { mergeSettings } from "@shared/settings";
import type { Product, ProductVariant, StoreSettings } from "@shared/types";
import { Btn, Card, Empty, ErrorBox, FieldShell, PageTitle, SelectInput, StatCard, TextInput } from "@/components/admin/ui";
import { Modal } from "@/components/ui/Sheet";
import { adminApi } from "@/lib/admin/api";
import { useLiveDoc, useLiveQuery } from "@/lib/admin/data";
import { callableError, firebase } from "@/lib/firebase/client";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

interface Movement {
  id: string;
  productId: string;
  productName: string;
  size: string;
  delta: number;
  reason: string;
  note?: string;
  orderId?: string;
  by: string;
  at: number;
}

const REASONS: Record<string, string> = {
  order: "Order",
  cancellation: "Cancelled order",
  adjustment: "Adjustment",
  initial: "Initial stock",
  "product-edit": "Product edit",
  "variant-added": "New size",
};

function InventoryInner() {
  const { db } = firebase();
  const params = useSearchParams();
  const products = useLiveQuery<Product>(() => query(collection(db, "products"), orderBy("updatedAt", "desc")), "inv-products");
  const moves = useLiveQuery<Movement>(() => query(collection(db, "inventoryMovements"), orderBy("at", "desc"), limit(40)), "moves");
  const settings = mergeSettings(useLiveDoc<StoreSettings>(() => doc(db, "storeSettings", "main"), "settings").data);
  const threshold = settings.inventory.lowStockThreshold;
  const [filter, setFilter] = useState(params.get("filter") ?? "low");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<{ product: Product; variant: ProductVariant } | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.data
      .filter((p) => p.status !== "archived")
      .flatMap((p) => p.variants.map((v) => ({ p, v })))
      .filter(({ p, v }) => {
        if (filter === "low" && !(v.stock <= threshold)) return false;
        if (filter === "out" && v.stock > 0) return false;
        if (term && ![p.name, p.sku, v.sku, v.size].join(" ").toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => a.v.stock - b.v.stock);
  }, [products.data, filter, q, threshold]);

  const all = products.data.filter((p) => p.status === "published");
  const units = all.reduce((s, p) => s + p.totalStock, 0);
  const variantsOut = all.reduce((s, p) => s + p.variants.filter((v) => v.stock === 0).length, 0);
  const variantsLow = all.reduce((s, p) => s + p.variants.filter((v) => v.stock > 0 && v.stock <= threshold).length, 0);

  return (
    <>
      <PageTitle title="Inventory" description={`Stock per size. “Low” means ${threshold} or fewer — change this in Store settings.`} />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Units in stock (live products)" value={units} />
        <StatCard label="Sizes running low" value={variantsLow} tone={variantsLow ? "warning" : undefined} />
        <StatCard label="Sizes sold out" value={variantsOut} tone={variantsOut ? "red" : undefined} />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, SKU or size" className="pl-9" aria-label="Search inventory" />
        </div>
        <SelectInput value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show">
          <option value="low">Low and sold out</option>
          <option value="out">Sold out only</option>
          <option value="all">All sizes</option>
        </SelectInput>
      </div>

      {products.error && <ErrorBox>{products.error}</ErrorBox>}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card padded={false}>
          {rows.length === 0 ? (
            <Empty title={products.loading ? "Loading…" : "Nothing to show"} body={filter === "all" ? undefined : "No sizes are running low."} />
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-carbon">
                  <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-steel">
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Size</th>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 text-right font-semibold">Stock</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.slice(0, 400).map(({ p, v }) => (
                    <tr key={`${p.id}-${v.id}`}>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/products/${p.id}`} className="text-white hover:underline">
                          {p.name}
                        </Link>
                        {p.status !== "published" && <span className="ml-2 text-xs text-steel">({p.status})</span>}
                      </td>
                      <td className="px-4 py-2.5 text-silver">
                        {v.size}
                        {v.color ? ` · ${v.color}` : ""}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-steel">{v.sku}</td>
                      <td className={cn("px-4 py-2.5 text-right font-semibold tabular-nums", v.stock === 0 ? "text-red-bright" : v.stock <= threshold ? "text-warning" : "text-white")}>{v.stock}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Btn size="sm" onClick={() => setTarget({ product: p, variant: v })}>
                          Adjust
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Recent stock movements" padded={false}>
          {moves.data.length === 0 ? (
            <p className="p-5 text-sm text-steel">{moves.loading ? "Loading…" : "No stock changes yet."}</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-line overflow-auto">
              {moves.data.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-white">
                      {m.productName} <span className="text-steel">· {m.size}</span>
                    </p>
                    <p className="text-xs text-steel">
                      {REASONS[m.reason] ?? m.reason}
                      {m.orderId ? (
                        <>
                          {" "}
                          <Link href={`/admin/orders/${m.orderId}`} className="underline">
                            {m.orderId}
                          </Link>
                        </>
                      ) : null}
                      {m.note ? ` — ${m.note}` : ""} · {new Date(m.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className={cn("shrink-0 font-semibold tabular-nums", m.delta < 0 ? "text-red-bright" : "text-success")}>
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {target && <AdjustDialog target={target} onClose={() => setTarget(null)} />}
    </>
  );
}

function AdjustDialog({ target, onClose }: { target: { product: Product; variant: ProductVariant }; onClose: () => void }) {
  const notify = useUi((s) => s.notify);
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Math.floor(Number(value) || 0);
  const result = mode === "set" ? n : mode === "add" ? target.variant.stock + n : target.variant.stock - n;

  return (
    <Modal open onClose={onClose} title="Adjust stock">
      <form
        className="space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await adminApi.adjustStock({
              productId: target.product.id,
              variantId: target.variant.id,
              mode: mode === "set" ? "set" : "delta",
              value: mode === "remove" ? -n : n,
              reason,
            });
            notify("Stock updated");
            onClose();
          } catch (err) {
            notify(callableError(err).message, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-sm text-silver">
          {target.product.name} · size <span className="text-white">{target.variant.size}</span> — currently <span className="font-semibold text-white">{target.variant.stock}</span>
        </p>
        <div className="flex gap-1">
          {(["add", "remove", "set"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cn("h-9 flex-1 text-sm capitalize", mode === m ? "bg-white text-ink" : "text-silver shadow-[inset_0_0_0_1px_var(--color-line-strong)]")}>
              {m === "set" ? "Set to" : m}
            </button>
          ))}
        </div>
        <FieldShell label={mode === "set" ? "New stock" : "Quantity"}>
          <TextInput type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} required autoFocus />
        </FieldShell>
        <FieldShell label="Reason" hint="e.g. Delivery from supplier, stock count, damaged">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} required minLength={2} />
        </FieldShell>
        <p className={cn("text-sm", result < 0 ? "text-red-bright" : "text-steel")}>New stock will be {result}</p>
        <div className="flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" variant="primary" loading={busy} disabled={result < 0 || value === "" || reason.trim().length < 2}>
            Save
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

export default function InventoryPage() {
  return (
    <Suspense>
      <InventoryInner />
    </Suspense>
  );
}
