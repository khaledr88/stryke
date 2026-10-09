"use client";

import { collection, orderBy, query } from "firebase/firestore";
import type { Brand, Category, Club, ProductCollection } from "@shared/types";
import { TaxonomyManager, type TaxonomyConfig } from "@/components/admin/TaxonomyManager";
import { FieldShell, SelectInput, TextInput, Toggle } from "@/components/admin/ui";
import { useLiveQuery } from "@/lib/admin/data";
import { firebase } from "@/lib/firebase/client";

function RuleEditor({ value, onChange }: { value: ProductCollection["rule"]; onChange: (r: ProductCollection["rule"]) => void }) {
  const { db } = firebase();
  const cats = useLiveQuery<Category>(() => query(collection(db, "categories"), orderBy("order")), "rule-cats");
  const brands = useLiveQuery<Brand>(() => query(collection(db, "brands"), orderBy("name")), "rule-brands");
  const clubs = useLiveQuery<Club>(() => query(collection(db, "clubs"), orderBy("name")), "rule-clubs");
  const r = value ?? {};
  return (
    <div className="space-y-4 bg-ink p-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
      <p className="text-sm text-silver">Products are included automatically when they match <strong className="text-white">all</strong> of these:</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label="Tag" hint="Products with this tag (set on the product)">
          <TextInput value={r.tag ?? ""} onChange={(e) => onChange({ ...r, tag: e.target.value.trim().toLowerCase() || null })} placeholder="e.g. new-season" />
        </FieldShell>
        <FieldShell label="Category">
          <SelectInput value={r.categoryId ?? ""} onChange={(e) => onChange({ ...r, categoryId: e.target.value || null })}>
            <option value="">Any</option>
            {cats.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectInput>
        </FieldShell>
        <FieldShell label="Brand">
          <SelectInput value={r.brandId ?? ""} onChange={(e) => onChange({ ...r, brandId: e.target.value || null })}>
            <option value="">Any</option>
            {brands.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectInput>
        </FieldShell>
        <FieldShell label="Club">
          <SelectInput value={r.clubId ?? ""} onChange={(e) => onChange({ ...r, clubId: e.target.value || null })}>
            <option value="">Any</option>
            {clubs.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectInput>
        </FieldShell>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle checked={Boolean(r.onSale)} onChange={(v) => onChange({ ...r, onSale: v })} label="On sale only" />
        <Toggle checked={Boolean(r.isNew)} onChange={(v) => onChange({ ...r, isNew: v })} label="New arrivals only" />
        <Toggle checked={Boolean(r.isLimited)} onChange={(v) => onChange({ ...r, isLimited: v })} label="Limited editions only" />
        <Toggle checked={Boolean(r.isBestSeller)} onChange={(v) => onChange({ ...r, isBestSeller: v })} label="Best sellers only" />
      </div>
    </div>
  );
}

const config: TaxonomyConfig<ProductCollection> = {
  collection: "collections",
  title: "Collections",
  singular: "Collection",
  description: "Curated edits like New Season or Limited. Products join automatically based on the rules you set.",
  nameKey: "title",
  cacheTag: "collections",
  empty: () => ({ slug: "", title: "", subtitle: "", description: "", image: null, rule: {}, order: 99, visible: true }),
  thumb: (c) => c.image,
  meta: (c) => c.subtitle,
  fields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "slug", label: "URL", type: "text" },
    { key: "subtitle", label: "Subtitle", type: "text", span: 2 },
    { key: "description", label: "Description", type: "textarea" },
    { key: "rule", label: "Rules", type: "custom", span: 2, render: (v, set) => <RuleEditor value={v.rule} onChange={(rule) => set({ rule })} /> },
    { key: "image", label: "Cover image", type: "image", folder: "collections", aspect: "aspect-[16/9]" },
    { key: "visible", label: "Visible on the store", type: "toggle" },
  ],
};

export default function CollectionsAdminPage() {
  return <TaxonomyManager config={config} />;
}
