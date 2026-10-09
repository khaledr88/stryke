"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import type { ProductType } from "@shared/constants";
import { Modal } from "@/components/ui/Sheet";

/**
 * General sizing reference. Fit varies between brands and cuts, so the copy
 * tells customers to check the product description or ask on WhatsApp.
 */
export const APPAREL_ROWS = [
  ["XS", "82–87", "70–75", "160–165"],
  ["S", "88–94", "76–81", "165–170"],
  ["M", "95–101", "82–87", "170–176"],
  ["L", "102–109", "88–95", "176–182"],
  ["XL", "110–118", "96–104", "182–188"],
  ["XXL", "119–128", "105–114", "188–194"],
  ["3XL", "129–138", "115–124", "190–196"],
];

export const FOOTWEAR_ROWS = [
  ["38", "5", "5.5", "24.0"],
  ["39", "6", "6.5", "24.5"],
  ["40", "6.5", "7", "25.0"],
  ["40.5", "7", "7.5", "25.5"],
  ["41", "7.5", "8", "26.0"],
  ["42", "8", "8.5", "26.5"],
  ["42.5", "8.5", "9", "27.0"],
  ["43", "9", "9.5", "27.5"],
  ["44", "9.5", "10", "28.0"],
  ["44.5", "10", "10.5", "28.5"],
  ["45", "10.5", "11", "29.0"],
  ["46", "11", "12", "29.5"],
];

export const BALL_ROWS = [
  ["3", "Under 8", "58–61 cm"],
  ["4", "8–12", "63.5–66 cm"],
  ["5", "12 and over", "68–70 cm"],
];

export function SizeTable({ type }: { type: ProductType | "all" }) {
  const show = (t: string) => type === "all" || type === t || (t === "apparel" && type === "jersey");
  return (
    <div className="space-y-8">
      {(show("apparel") || show("jersey")) && (
        <Table
          title="Jerseys and clothing (adult)"
          head={["Size", "Chest (cm)", "Waist (cm)", "Height (cm)"]}
          rows={APPAREL_ROWS}
          note="Measure around the fullest part of the chest. Between sizes? Choose the larger size for a relaxed fit; player-version shirts fit slimmer."
        />
      )}
      {show("boots") && (
        <Table
          title="Football boots"
          head={["EU", "UK", "US (men)", "Foot length (cm)"]}
          rows={FOOTWEAR_ROWS}
          note="Stand on a sheet of paper, mark heel and longest toe, and measure. Some boot lines run narrow — check the product description."
        />
      )}
      {show("equipment") && <Table title="Footballs" head={["Ball size", "Age", "Circumference"]} rows={BALL_ROWS} />}
    </div>
  );
}

function Table({ title, head, rows, note }: { title: string; head: string[]; rows: string[][]; note?: string }) {
  return (
    <section>
      <h3 className="label mb-3 text-white">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-left text-sm tabular-nums">
          <thead>
            <tr className="border-b border-line-strong text-steel">
              {head.map((h) => (
                <th key={h} scope="col" className="py-2 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-line">
                {r.map((c, i) => (
                  <td key={i} className={i === 0 ? "py-2 pr-4 font-semibold text-white" : "py-2 pr-4 text-silver"}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-3 text-xs leading-relaxed text-steel">{note}</p>}
    </section>
  );
}

export function SizeGuideButton({ type }: { type: ProductType }) {
  const [open, setOpen] = useState(false);
  if (type === "accessory") return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-silver underline-offset-4 hover:text-white hover:underline">
        <Ruler className="size-4" /> Size guide
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Size guide">
        <div className="p-5 sm:p-6">
          <SizeTable type={type} />
          <p className="mt-6 text-xs text-steel">General guide only. Fit varies by brand and cut — message us on WhatsApp if you are unsure.</p>
        </div>
      </Modal>
    </>
  );
}
