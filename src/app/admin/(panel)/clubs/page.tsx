"use client";

import type { Club } from "@shared/types";
import { TaxonomyManager, type TaxonomyConfig } from "@/components/admin/TaxonomyManager";
import { FieldShell } from "@/components/admin/ui";
import { Crest } from "@/components/ui/Crest";

const config: TaxonomyConfig<Club> = {
  collection: "clubs",
  title: "Clubs",
  singular: "Club",
  description: "Customers browse jerseys by club. Featured clubs appear on the homepage.",
  nameKey: "name",
  usageField: "clubId",
  cacheTag: "taxonomy",
  empty: () => ({ slug: "", name: "", shortName: "", league: "", country: "", crest: null, image: null, colors: ["#ffffff", "#d6001c"], order: 99, visible: true, featured: false }),
  thumb: (c) => c.crest,
  meta: (c) => [c.league, c.featured ? "featured" : null].filter(Boolean).join(" · "),
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "slug", label: "URL", type: "text" },
    { key: "shortName", label: "Short name", type: "text", hint: "3–4 letters, used when there’s no crest image" },
    { key: "league", label: "League", type: "text" },
    { key: "country", label: "Country", type: "text" },
    {
      key: "colors",
      label: "Club colours",
      type: "custom",
      render: (v, set) => (
        <FieldShell label="Club colours">
          <div className="flex items-center gap-3">
            {[0, 1].map((i) => (
              <input
                key={i}
                type="color"
                value={v.colors?.[i] ?? "#ffffff"}
                onChange={(e) => {
                  const colors = [...(v.colors ?? ["#ffffff", "#000000"])] as [string, string];
                  colors[i] = e.target.value;
                  set({ colors });
                }}
                className="h-10 w-14 cursor-pointer bg-transparent"
                aria-label={i === 0 ? "Primary colour" : "Secondary colour"}
              />
            ))}
            <Crest club={{ ...v, shortName: v.shortName || "?" }} className="size-12" />
          </div>
        </FieldShell>
      ),
    },
    { key: "crest", label: "Crest (only if you have permission)", type: "image", folder: "clubs", aspect: "aspect-square" },
    { key: "image", label: "Banner image", type: "image", folder: "clubs", aspect: "aspect-[16/9]" },
    { key: "featured", label: "Featured on homepage", type: "toggle" },
    { key: "visible", label: "Visible on the store", type: "toggle" },
  ],
};

export default function ClubsPage() {
  return <TaxonomyManager config={config} />;
}
