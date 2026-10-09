"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { formatMoney } from "@shared/money";
import type { PricingProblem } from "@shared/pricing";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCart, type CartItem } from "@/lib/store/cart";
import { cn } from "@/lib/utils/cn";

export function CartLine({ item, problem, compact, onNavigate }: { item: CartItem; problem?: PricingProblem; compact?: boolean; onNavigate?: () => void }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const soldOut = item.maxQuantity <= 0;

  return (
    <li className={cn("flex gap-4 py-5", (soldOut || problem) && "opacity-95")}>
      <Link href={`/product/${item.slug}`} onClick={onNavigate} className="relative block aspect-[4/5] w-24 shrink-0 overflow-hidden bg-graphite sm:w-28">
        {item.image ? <Image src={item.image} alt={item.name} fill sizes="112px" className="object-cover" /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-steel">{item.brandName}</p>
            <Link href={`/product/${item.slug}`} onClick={onNavigate} className="line-clamp-2 text-[0.95rem] leading-snug text-white hover:underline">
              {item.name}
            </Link>
          </div>
          <p className="shrink-0 font-display text-lg font-bold text-white tabular-nums">{formatMoney(item.unitPrice * item.quantity)}</p>
        </div>
        <p className="mt-1 text-sm text-silver">
          Size {item.size}
          {item.color ? ` · ${item.color}` : ""}
          {item.quantity > 1 && !compact ? <span className="text-steel"> · {formatMoney(item.unitPrice)} each</span> : null}
        </p>
        {item.customization && (
          <p className="mt-0.5 text-sm text-silver">
            Print: <span className="font-semibold text-white">{[item.customization.name, item.customization.number].filter(Boolean).join(" ")}</span>
          </p>
        )}
        {(problem || soldOut) && (
          <p className="mt-1.5 text-sm text-red-bright" role="alert">
            {problem?.message ?? "This size is sold out."}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          {soldOut ? (
            <span className="label text-[0.7rem] text-red-bright">Unavailable</span>
          ) : (
            <QuantityStepper size="sm" value={item.quantity} max={Math.max(1, item.maxQuantity)} onChange={(q) => setQuantity(item.key, q)} />
          )}
          <button
            type="button"
            onClick={() => remove(item.key)}
            className="inline-flex h-9 items-center gap-1.5 px-2 text-sm text-steel transition-colors hover:text-white"
            aria-label={`Remove ${item.name} size ${item.size}`}
          >
            <Trash2 className="size-4" /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}
