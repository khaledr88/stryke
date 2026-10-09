"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { collection, orderBy, query } from "firebase/firestore";
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, SIZE_PRESETS, type ProductStatus, type ProductType } from "@shared/constants";
import { formatMoney, discountPercent } from "@shared/money";
import { productInputSchema, type ProductInput } from "@shared/schemas";
import { slugify, variantId } from "@shared/text";
import type { Brand, Category, Club, Product, StoredImage } from "@shared/types";
import { adminApi } from "@/lib/admin/api";
import { useLiveQuery } from "@/lib/admin/data";
import { apiError, firebase } from "@/lib/firebase/client";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";
import { ImagesField } from "./ImagesField";
import { Btn, Card, ErrorBox, FieldShell, MoneyInput, SelectInput, StatusPill, TextArea, TextInput, Toggle } from "./ui";

interface FormState {
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  clubId: string;
  season: string;
  productType: ProductType;
  description: string;
  price: number | null;
  salePrice: number | null;
  sku: string;
  images: StoredImage[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  stock: Record<string, number>;
  baseline: Record<string, number>;
  tags: string;
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  isLimited: boolean;
  customizationEnabled: boolean;
  customization: { price: number; nameMaxLength: number; numberMin: number; numberMax: number };
}

const keyOf = (size: string, color: string | null) => variantId(size, color);

function fromProduct(p: Product | null): FormState {
  const stock: Record<string, number> = {};
  for (const v of p?.variants ?? []) stock[v.id] = v.stock;
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    brandId: p?.brandId ?? "",
    categoryId: p?.categoryId ?? "",
    clubId: p?.clubId ?? "",
    season: p?.season ?? "",
    productType: p?.productType ?? "jersey",
    description: p?.description ?? "",
    price: p?.price ?? null,
    salePrice: p?.salePrice ?? null,
    sku: p?.sku ?? "",
    images: p?.images ?? [],
    sizes: p?.sizes ?? [],
    colors: p?.colors ?? [],
    stock,
    baseline: { ...stock },
    tags: (p?.tags ?? []).join(", "),
    isNew: p?.isNew ?? true,
    isBestSeller: p?.isBestSeller ?? false,
    isFeatured: p?.isFeatured ?? false,
    isLimited: p?.isLimited ?? false,
    customizationEnabled: p?.customization?.enabled ?? false,
    customization: p?.customization ?? { price: 1500, nameMaxLength: 12, numberMin: 1, numberMax: 99 },
  };
}

export function ProductForm({ product }: { product: Product | null }) {
  const router = useRouter();
  const notify = useUi((s) => s.notify);
  const { db } = firebase();
  const categories = useLiveQuery<Category>(() => query(collection(db, "categories"), orderBy("order")), "cats");
  const brands = useLiveQuery<Brand>(() => query(collection(db, "brands"), orderBy("name")), "brands");
  const clubs = useLiveQuery<Club>(() => query(collection(db, "clubs"), orderBy("name")), "clubs");
  const [form, setForm] = useState<FormState>(() => fromProduct(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<ProductStatus | "save" | null>(null);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState({ name: "", hex: "#ffffff" });
  const [loadedAt, setLoadedAt] = useState(() => product?.contentUpdatedAt ?? product?.updatedAt ?? null);
  const [imageFolder] = useState(() => `products/${product?.id ?? `new-${Date.now().toString(36)}`}`);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const colorList: (string | null)[] = form.colors.length ? form.colors.map((c) => c.name) : [null];
  const totalStock = useMemo(
    () => form.sizes.reduce((s, size) => s + colorList.reduce((t, c) => t + (form.stock[keyOf(size, c)] ?? 0), 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.sizes, form.colors, form.stock],
  );

  function onCategory(id: string) {
    const cat = categories.data.find((c) => c.id === id);
    setForm((f) => ({
      ...f,
      categoryId: id,
      productType: !product && cat ? cat.defaultProductType : f.productType,
      sizes: f.sizes.length === 0 && cat ? [...(SIZE_PRESETS[cat.sizePreset]?.sizes ?? [])] : f.sizes,
    }));
  }

  function toInput(status: ProductStatus): ProductInput {
    const variants = form.sizes.flatMap((size) =>
      colorList.map((color) => {
        const k = keyOf(size, color);
        return { size, color, sku: "", stock: Math.max(0, Math.floor(form.stock[k] ?? 0)), baseline: product && k in form.baseline ? form.baseline[k] : null };
      }),
    );
    return {
      id: product?.id,
      name: form.name,
      slug: form.slug,
      brandId: form.brandId,
      categoryId: form.categoryId,
      clubId: form.clubId || null,
      season: form.season || null,
      productType: form.productType,
      description: form.description,
      price: form.price ?? 0,
      salePrice: form.salePrice,
      sku: form.sku,
      images: form.images,
      colors: form.colors,
      sizes: form.sizes,
      variants,
      tags: form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      isNew: form.isNew,
      isBestSeller: form.isBestSeller,
      isFeatured: form.isFeatured,
      isLimited: form.isLimited,
      status,
      customization: form.customizationEnabled ? { enabled: true, ...form.customization } : null,
      expectedUpdatedAt: loadedAt,
    };
  }

  async function save(status: ProductStatus, label: ProductStatus | "save") {
    const input = toInput(status);
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "_");
        if (!e[k]) e[k] = issue.message;
      }
      setErrors(e);
      notify("Check the highlighted fields", "error");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors({});
    setSaving(label);
    try {
      const res = await adminApi.saveProduct(input);
      notify(status === "published" ? "Published — it's live on the store" : status === "draft" ? "Draft saved" : "Saved");
      if (!product) router.replace(`/admin/products/${res.id}`);
      else router.refresh();
      // Reset stock baselines to what we just wrote so a second save doesn't double-apply.
      setForm((f) => ({ ...f, slug: res.slug, baseline: { ...f.stock } }));
      setLoadedAt(res.updatedAt);
    } catch (err) {
      const e = apiError(err);
      const fields = (e.details as { fields?: Record<string, string> } | undefined)?.fields;
      if (fields) setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.split(".")[0], v])));
      notify(e.message, "error");
    } finally {
      setSaving(null);
    }
  }

  const pct = discountPercent(form.price ?? 0, form.salePrice);
  const status = product?.status ?? "draft";

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {Object.keys(errors).length > 0 && (
          <ErrorBox>
            <p className="font-semibold">Fix these before saving:</p>
            <ul className="mt-1 list-disc pl-5 text-silver">
              {Object.entries(errors).map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          </ErrorBox>
        )}

        <Card title="Product">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="Product name" required error={errors.name} className="sm:col-span-2">
              <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} placeholder="Real Madrid 26/27 Home Jersey" />
            </FieldShell>
            <FieldShell label="Category" required error={errors.categoryId}>
              <SelectInput value={form.categoryId} onChange={(e) => onCategory(e.target.value)}>
                <option value="">Choose…</option>
                {categories.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>
            <FieldShell label="Product type" hint="Controls the size guide shown to customers">
              <SelectInput value={form.productType} onChange={(e) => set("productType", e.target.value as ProductType)}>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PRODUCT_TYPE_LABELS[t]}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>
            <FieldShell label="Brand" required error={errors.brandId}>
              <SelectInput value={form.brandId} onChange={(e) => set("brandId", e.target.value)}>
                <option value="">Choose…</option>
                {brands.data.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>
            <FieldShell label="Club" hint="Leave empty for non-club products">
              <SelectInput value={form.clubId} onChange={(e) => set("clubId", e.target.value)}>
                <option value="">No club</option>
                {clubs.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </FieldShell>
            <FieldShell label="Season" hint="e.g. 26/27">
              <TextInput value={form.season} onChange={(e) => set("season", e.target.value)} maxLength={20} />
            </FieldShell>
            <FieldShell label="SKU" required error={errors.sku} hint="Your product code. Size codes are added automatically.">
              <TextInput value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} invalid={!!errors.sku} placeholder="RMA-H-2627" />
            </FieldShell>
            <FieldShell label="Description" error={errors.description} className="sm:col-span-2" hint="Blank lines make paragraphs. Start lines with “- ” for bullet points.">
              <TextArea value={form.description} onChange={(e) => set("description", e.target.value)} rows={6} />
            </FieldShell>
          </div>
        </Card>

        <Card title="Photos" description="The first photo is the cover. Add the back, details and a worn shot if you have them.">
          <ImagesField value={form.images} onChange={(images) => set("images", images)} folder={imageFolder} error={errors.images} />
        </Card>

        <Card title="Pricing">
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldShell label="Price" required error={errors.price}>
              <MoneyInput value={form.price} onChange={(v) => set("price", v)} invalid={!!errors.price} placeholder="110" />
            </FieldShell>
            <FieldShell label="Sale price" error={errors.salePrice} hint={pct ? `${pct}% off — shows as a sale` : "Leave empty if not on sale"}>
              <MoneyInput value={form.salePrice} onChange={(v) => set("salePrice", v)} allowEmpty invalid={!!errors.salePrice} />
            </FieldShell>
            <div className="self-end pb-2 text-sm text-steel">
              Customers pay <span className="font-semibold text-white">{form.price ? formatMoney(form.salePrice && form.salePrice < form.price ? form.salePrice : form.price) : "—"}</span>
            </div>
          </div>
        </Card>

        <Card title="Sizes, colours and stock" description="Stock is tracked per size and colour. Customers can’t order more than you have.">
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-silver">Sizes {errors.sizes && <span className="normal-case text-red-bright">— {errors.sizes}</span>}</p>
              <div className="flex flex-wrap gap-1.5">
                {form.sizes.map((s) => (
                  <span key={s} className="inline-flex h-8 items-center gap-1 bg-white/10 pr-1 pl-3 text-sm text-white">
                    {s}
                    <button type="button" onClick={() => set("sizes", form.sizes.filter((x) => x !== s))} className="grid size-6 place-items-center text-steel hover:text-white" aria-label={`Remove size ${s}`}>
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                <form
                  className="inline-flex"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const s = newSize.trim().toUpperCase();
                    if (s && !form.sizes.includes(s)) set("sizes", [...form.sizes, s]);
                    setNewSize("");
                  }}
                >
                  <TextInput value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Add size" className="h-8 w-24" />
                </form>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-xs text-steel">Presets:</span>
                {Object.entries(SIZE_PRESETS).map(([k, p]) => (
                  <button key={k} type="button" onClick={() => set("sizes", [...p.sizes])} className="text-xs text-silver underline underline-offset-2 hover:text-white">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-silver">Colours (optional)</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {form.colors.map((c) => (
                  <span key={c.name} className="inline-flex h-8 items-center gap-2 bg-white/10 pr-1 pl-2 text-sm text-white">
                    <span className="size-4 rounded-full ring-1 ring-white/30" style={{ background: c.hex }} />
                    {c.name}
                    <button type="button" onClick={() => set("colors", form.colors.filter((x) => x.name !== c.name))} className="grid size-6 place-items-center text-steel hover:text-white" aria-label={`Remove colour ${c.name}`}>
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1">
                  <input type="color" value={newColor.hex} onChange={(e) => setNewColor((c) => ({ ...c, hex: e.target.value }))} className="h-8 w-9 cursor-pointer bg-transparent" aria-label="Colour swatch" />
                  <TextInput value={newColor.name} onChange={(e) => setNewColor((c) => ({ ...c, name: e.target.value }))} placeholder="Colour name" className="h-8 w-32" />
                  <Btn
                    size="sm"
                    type="button"
                    onClick={() => {
                      const name = newColor.name.trim();
                      if (!name || form.colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
                      set("colors", [...form.colors, { name, hex: newColor.hex }]);
                      setNewColor({ name: "", hex: "#ffffff" });
                    }}
                  >
                    <Plus className="size-3.5" /> Add
                  </Btn>
                </div>
              </div>
            </div>

            {form.sizes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.1em] text-steel">
                      <th className="py-2 pr-4 font-semibold">Size</th>
                      {colorList.map((c) => (
                        <th key={c ?? "default"} className="px-2 py-2 font-semibold">
                          {c ?? "Stock"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.sizes.map((size) => (
                      <tr key={size}>
                        <td className="py-1 pr-4 font-semibold text-white">{size}</td>
                        {colorList.map((c) => {
                          const k = keyOf(size, c);
                          const v = form.stock[k] ?? 0;
                          return (
                            <td key={k} className="px-2 py-1">
                              <TextInput
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={String(v)}
                                onChange={(e) => set("stock", { ...form.stock, [k]: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                                className={cn("h-9 w-20 text-center tabular-nums", v === 0 && "text-red-bright")}
                                aria-label={`Stock for size ${size}${c ? ` ${c}` : ""}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-sm text-steel">
                  Total stock: <span className="font-semibold text-white">{totalStock}</span>
                  {product && <span> · Changes are applied on top of any orders placed while you edit.</span>}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Name and number printing" description="For jerseys: let customers add a name and number for an extra charge.">
          <Toggle checked={form.customizationEnabled} onChange={(v) => set("customizationEnabled", v)} label="Offer printing on this product" />
          {form.customizationEnabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <FieldShell label="Printing price">
                <MoneyInput value={form.customization.price} onChange={(v) => set("customization", { ...form.customization, price: v ?? 0 })} />
              </FieldShell>
              <FieldShell label="Max letters">
                <TextInput type="number" min={1} max={20} value={form.customization.nameMaxLength} onChange={(e) => set("customization", { ...form.customization, nameMaxLength: Number(e.target.value) || 12 })} />
              </FieldShell>
              <FieldShell label="Lowest number">
                <TextInput type="number" min={0} max={99} value={form.customization.numberMin} onChange={(e) => set("customization", { ...form.customization, numberMin: Number(e.target.value) || 0 })} />
              </FieldShell>
              <FieldShell label="Highest number">
                <TextInput type="number" min={0} max={99} value={form.customization.numberMax} onChange={(e) => set("customization", { ...form.customization, numberMax: Number(e.target.value) || 99 })} />
              </FieldShell>
            </div>
          )}
        </Card>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-10 xl:self-start">
        <Card title="Publish">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-steel">Status</span>
            <StatusPill status={status} label={status} />
          </div>
          <div className="space-y-2">
            <Btn variant="primary" className="w-full" loading={saving === "published"} onClick={() => save("published", "published")}>
              {status === "published" ? "Save and keep live" : "Publish"}
            </Btn>
            {status === "published" ? (
              <Btn className="w-full" loading={saving === "draft"} onClick={() => save("draft", "draft")}>
                Unpublish (save as draft)
              </Btn>
            ) : (
              <Btn className="w-full" loading={saving === "draft"} onClick={() => save("draft", "draft")}>
                Save draft
              </Btn>
            )}
          </div>
          {product?.status === "published" && (
            <Link href={`/product/${product.slug}`} target="_blank" className="mt-4 inline-flex items-center gap-1.5 text-sm text-silver underline-offset-4 hover:text-white hover:underline">
              View on store <ExternalLink className="size-3.5" />
            </Link>
          )}
        </Card>

        <Card title="Labels">
          <div className="space-y-4">
            <Toggle checked={form.isNew} onChange={(v) => set("isNew", v)} label="New arrival" />
            <Toggle checked={form.isBestSeller} onChange={(v) => set("isBestSeller", v)} label="Best seller" />
            <Toggle checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} label="Featured" description="Shown in the homepage Featured section" />
            <Toggle checked={form.isLimited} onChange={(v) => set("isLimited", v)} label="Limited edition" />
          </div>
        </Card>

        <Card title="Search and URL">
          <div className="space-y-4">
            <FieldShell label="Tags" hint="Comma separated. Collections use tags, e.g. new-season, elite, training.">
              <TextInput value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="new-season, home-kit" />
            </FieldShell>
            <FieldShell label="URL slug" error={errors.slug} hint={`/product/${form.slug || slugify(form.name) || "…"}`}>
              <TextInput value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="Generated from the name" />
            </FieldShell>
          </div>
        </Card>
      </aside>
    </div>
  );
}
