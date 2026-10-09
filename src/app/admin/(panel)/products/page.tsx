"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { collection, doc, orderBy, query } from "firebase/firestore";
import { formatMoney, effectivePrice } from "@shared/money";
import { mergeSettings } from "@shared/settings";
import type { Brand, Category, Product, StoreSettings } from "@shared/types";
import { Btn, Card, ConfirmDialog, Empty, ErrorBox, PageTitle, SelectInput, StatusPill, TextInput } from "@/components/admin/ui";
import { adminApi } from "@/lib/admin/api";
import { useLiveDoc, useLiveQuery } from "@/lib/admin/data";
import { apiError, firebase } from "@/lib/firebase/client";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

export default function ProductsPage() {
  const { db } = firebase();
  const notify = useUi((s) => s.notify);
  const products = useLiveQuery<Product>(() => query(collection(db, "products"), orderBy("updatedAt", "desc")), "products");
  const categories = useLiveQuery<Category>(() => query(collection(db, "categories"), orderBy("order")), "cats");
  const brands = useLiveQuery<Brand>(() => query(collection(db, "brands"), orderBy("name")), "brands");
  const settings = mergeSettings(useLiveDoc<StoreSettings>(() => doc(db, "storeSettings", "main"), "settings").data);
  const threshold = settings.inventory.lowStockThreshold;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");
  const [stock, setStock] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.data.filter((p) => {
      if (status === "active" ? p.status === "archived" : status && p.status !== status) return false;
      if (cat && p.categoryId !== cat) return false;
      if (brand && p.brandId !== brand) return false;
      if (stock === "out" && p.inStock) return false;
      if (stock === "low" && !(p.minVariantStock <= threshold)) return false;
      if (term && ![p.name, p.sku, p.clubName, p.brandName].join(" ").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [products.data, q, status, cat, brand, stock, threshold]);

  async function run(id: string, fn: () => Promise<unknown>, done: string) {
    setBusy(id);
    try {
      await fn();
      notify(done);
    } catch (e) {
      notify(apiError(e).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageTitle
        title="Products"
        description={`${products.data.filter((p) => p.status === "published").length} live · ${products.data.filter((p) => p.status === "draft").length} drafts`}
        actions={
          <Link href="/admin/products/new" className="inline-flex h-10 items-center gap-2 bg-red px-4 text-sm font-semibold text-white hover:bg-red-bright">
            <Plus className="size-4" /> Add product
          </Link>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(4,160px)]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, club, brand" className="pl-9" aria-label="Search products" />
        </div>
        <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="active">Live and drafts</option>
          <option value="published">Live</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived</option>
          <option value="">Everything</option>
        </SelectInput>
        <SelectInput value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand">
          <option value="">All brands</option>
          {brands.data.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput value={stock} onChange={(e) => setStock(e.target.value)} aria-label="Stock">
          <option value="">Any stock</option>
          <option value="low">Low stock</option>
          <option value="out">Sold out</option>
        </SelectInput>
      </div>

      {products.error && <ErrorBox>{products.error}</ErrorBox>}
      <Card padded={false}>
        {list.length === 0 ? (
          <Empty
            title={products.loading ? "Loading products…" : products.data.length ? "No products match" : "No products yet"}
            body={products.data.length ? "Change the filters to see more." : "Add your first product — it goes live as soon as you publish it."}
            action={!products.data.length && !products.loading ? <Link href="/admin/products/new" className="inline-flex h-10 items-center gap-2 bg-red px-4 text-sm font-semibold text-white">Add product</Link> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-steel">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Sold</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative aspect-[4/5] w-10 shrink-0 overflow-hidden bg-graphite">
                          {p.images[0] ? <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-white hover:underline">{p.name}</span>
                          <span className="block text-xs text-steel">
                            {p.sku} · {p.brandName}
                            {p.clubName ? ` · ${p.clubName}` : ""}
                            {p.isSample ? " · sample" : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-silver">{p.categoryName}</td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="text-white">{formatMoney(effectivePrice(p.price, p.salePrice))}</span>
                      {p.onSale && <s className="ml-1.5 text-xs text-steel">{formatMoney(p.price)}</s>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={cn(!p.inStock ? "text-red-bright" : p.minVariantStock <= threshold ? "text-warning" : "text-white")}>{p.totalStock}</span>
                      {p.inStock && p.minVariantStock <= threshold && <span className="ml-1.5 text-xs text-warning">low</span>}
                      {!p.inStock && <span className="ml-1.5 text-xs text-red-bright">sold out</span>}
                    </td>
                    <td className="px-4 py-3 text-silver tabular-nums">{p.salesCount ?? 0}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} label={p.status === "published" ? "Live" : p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link href={`/admin/products/${p.id}`} className="grid size-8 place-items-center text-silver hover:bg-white/10 hover:text-white" title="Edit" aria-label={`Edit ${p.name}`}>
                          <Pencil className="size-4" />
                        </Link>
                        {p.status === "published" ? (
                          <IconAction label="Hide from store" busy={busy === p.id} onClick={() => run(p.id, () => adminApi.setProductStatus({ productId: p.id, status: "draft" }), "Hidden from the store")}>
                            <EyeOff className="size-4" />
                          </IconAction>
                        ) : (
                          <IconAction label="Publish" busy={busy === p.id} onClick={() => run(p.id, () => adminApi.setProductStatus({ productId: p.id, status: "published" }), "Published")}>
                            <Eye className="size-4" />
                          </IconAction>
                        )}
                        <IconAction label="Duplicate" busy={busy === `dup-${p.id}`} onClick={() => run(`dup-${p.id}`, () => adminApi.duplicateProduct({ productId: p.id }), "Duplicated as a draft")}>
                          <Copy className="size-4" />
                        </IconAction>
                        <IconAction label="Archive or delete" onClick={() => setToDelete(p)}>
                          <Trash2 className="size-4" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={`Remove ${toDelete?.name ?? ""}?`}
        body={
          <>
            <p>
              <strong className="text-white">Archive</strong> hides it from the store and keeps it for your records. <strong className="text-white">Delete</strong> removes it and its photos permanently. Past orders keep their own copy either way.
            </p>
            <div className="mt-4">
              <Btn
                onClick={async () => {
                  if (!toDelete) return;
                  await run(toDelete.id, () => adminApi.setProductStatus({ productId: toDelete.id, status: "archived" }), "Archived");
                  setToDelete(null);
                }}
              >
                Archive instead
              </Btn>
            </div>
          </>
        }
        confirmLabel="Delete permanently"
        danger
        onConfirm={async () => {
          if (toDelete) await run(toDelete.id, () => adminApi.deleteProduct({ productId: toDelete.id }), "Deleted");
        }}
      />
    </>
  );
}

function IconAction({ label, onClick, busy, children }: { label: string; onClick: () => void; busy?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} title={label} aria-label={label} className="grid size-8 place-items-center text-silver hover:bg-white/10 hover:text-white disabled:opacity-40">
      {children}
    </button>
  );
}
