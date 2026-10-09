"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product, ProductSummary } from "@shared/types";
import { Modal } from "@/components/ui/Sheet";
import { Price } from "@/components/ui/Price";
import { useUi } from "@/lib/store/ui";
import { PurchasePanel } from "./PurchasePanel";

export function QuickView() {
  const summary = useUi((s) => s.quickView);
  const close = useUi((s) => s.openQuickView);
  return (
    <Modal open={Boolean(summary)} onClose={() => close(null)} title="Quick view" wide>
      {summary && <QuickViewBody key={summary.slug} summary={summary} onClose={() => close(null)} />}
    </Modal>
  );
}

function QuickViewBody({ summary, onClose }: { summary: ProductSummary; onClose: () => void }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/products/${summary.slug}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("This product is no longer available.");
        setProduct(await r.json());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
  }, [summary.slug]);

  const images = product?.images ?? (summary.image ? [summary.image] : []);

  return (
    <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
      <div>
        <div className="relative aspect-[4/5] overflow-hidden bg-graphite">
          {images[active] ? <Image src={images[active].url} alt={images[active].alt || summary.name} fill sizes="(min-width:640px) 420px, 92vw" className="object-cover" /> : null}
        </div>
        {images.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setActive(i)}
                className={`relative aspect-square w-16 shrink-0 overflow-hidden bg-graphite ${i === active ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"}`}
                aria-label={`Show image ${i + 1}`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steel">{summary.brandName}</p>
        <h3 className="display mt-1 text-3xl text-white">{summary.name}</h3>
        <div className="mt-3">
          <Price price={summary.price} salePrice={summary.salePrice} size="md" showPercent />
        </div>
        <div className="mt-6">
          {error ? (
            <p className="text-red-bright">{error}</p>
          ) : product ? (
            <PurchasePanel product={product} variant="quick" onAdded={onClose} />
          ) : (
            <div className="space-y-3" aria-busy="true">
              <div className="skeleton h-5 w-24" />
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-12" />
                ))}
              </div>
              <div className="skeleton h-14" />
            </div>
          )}
        </div>
        <Link href={`/product/${summary.slug}`} onClick={onClose} className="mt-6 inline-block text-sm text-silver underline underline-offset-4 hover:text-white">
          See full details
        </Link>
      </div>
    </div>
  );
}
