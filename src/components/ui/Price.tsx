import { formatMoney, effectivePrice, discountPercent } from "@shared/money";
import type { CurrencyCode } from "@shared/constants";
import { cn } from "@/lib/utils/cn";

export function Price({
  price,
  salePrice,
  currency = "USD",
  size = "md",
  className,
  showPercent = false,
}: {
  price: number;
  salePrice?: number | null;
  currency?: CurrencyCode;
  size?: "sm" | "md" | "lg";
  className?: string;
  showPercent?: boolean;
}) {
  const eff = effectivePrice(price, salePrice);
  const pct = discountPercent(price, salePrice);
  const text = { sm: "text-[0.95rem]", md: "text-lg", lg: "text-3xl" }[size];
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 font-display font-bold tabular-nums", text, className)}>
      <span className={cn(pct ? "text-red-bright" : "text-white")}>{formatMoney(eff, currency)}</span>
      {pct ? (
        <>
          <s className="text-[0.8em] font-semibold text-steel decoration-steel/70">{formatMoney(price, currency)}</s>
          {showPercent && <span className="label text-[0.7rem] text-red-bright">−{pct}%</span>}
        </>
      ) : null}
    </span>
  );
}
