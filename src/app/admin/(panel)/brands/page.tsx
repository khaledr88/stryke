"use client";

import type { Brand } from "@shared/types";
import { TaxonomyManager, type TaxonomyConfig } from "@/components/admin/TaxonomyManager";

const config: TaxonomyConfig<Brand> = {
  collection: "brands",
  title: "Brands",
  singular: "Brand",
  description: "Upload logos only where you have permission to use them; otherwise the name is shown.",
  nameKey: "name",
  usageField: "brandId",
  cacheTag: "taxonomy",
  empty: () => ({ slug: "", name: "", logo: null, image: null, description: "", order: 99, visible: true }),
  thumb: (b) => b.logo ?? b.image,
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "slug", label: "URL", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "logo", label: "Logo (PNG or SVG-style PNG on transparent background)", type: "image", folder: "brands", aspect: "aspect-[16/9]" },
    { key: "image", label: "Banner image", type: "image", folder: "brands", aspect: "aspect-[16/9]" },
    { key: "visible", label: "Visible on the store", type: "toggle" },
  ],
};

export default function BrandsPage() {
  return <TaxonomyManager config={config} />;
}
