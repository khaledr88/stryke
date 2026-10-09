"use client";

import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, SIZE_PRESETS, type ProductType } from "@shared/constants";
import type { Category } from "@shared/types";
import { TaxonomyManager, type TaxonomyConfig } from "@/components/admin/TaxonomyManager";
import { FieldShell, SelectInput } from "@/components/admin/ui";

const config: TaxonomyConfig<Category> = {
  collection: "categories",
  title: "Categories",
  singular: "Category",
  description: "Shown as homepage tiles and, when a menu label is set, in the main navigation.",
  nameKey: "name",
  usageField: "categoryId",
  cacheTag: "taxonomy",
  empty: () => ({ slug: "", name: "", description: "", image: null, navLabel: "", showInNav: false, defaultProductType: "apparel", sizePreset: "apparel", order: 99, visible: true }),
  thumb: (c) => c.image,
  meta: (c) => (c.showInNav ? `In menu as “${c.navLabel}”` : "Not in menu"),
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "slug", label: "URL", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "navLabel", label: "Menu label", type: "text", hint: "Short label for the main menu, e.g. Football" },
    { key: "showInNav", label: "Show in main menu", type: "toggle" },
    {
      key: "defaults",
      label: "Defaults",
      type: "custom",
      span: 2,
      render: (v, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell label="Default product type" hint="Pre-selected when adding a product here">
            <SelectInput value={v.defaultProductType} onChange={(e) => set({ defaultProductType: e.target.value as ProductType })}>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </SelectInput>
          </FieldShell>
          <FieldShell label="Default sizes">
            <SelectInput value={v.sizePreset} onChange={(e) => set({ sizePreset: e.target.value })}>
              {Object.entries(SIZE_PRESETS).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
            </SelectInput>
          </FieldShell>
        </div>
      ),
    },
    { key: "image", label: "Tile image", type: "image", folder: "categories", aspect: "aspect-[3/4]", hint: "Portrait photo, at least 900 × 1200" },
    { key: "visible", label: "Visible on the store", type: "toggle" },
  ],
};

export default function CategoriesPage() {
  return <TaxonomyManager config={config} />;
}
