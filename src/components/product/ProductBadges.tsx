import { discountPercent } from "@shared/money";
import type { ProductSummary } from "@shared/types";
import { Badge } from "@/components/ui/Badge";

type Badgeable = Pick<ProductSummary, "isNew" | "isBestSeller" | "isLimited" | "inStock" | "price" | "salePrice" | "isSample">;

export function productBadges(p: Badgeable, max = 2) {
  const out: { key: string; label: string; tone: "red" | "white" | "dark" | "gold" | "outline" }[] = [];
  if (p.isSample) out.push({ key: "sample", label: "Sample", tone: "outline" });
  if (!p.inStock) out.push({ key: "soldout", label: "Sold out", tone: "dark" });
  const pct = discountPercent(p.price, p.salePrice);
  if (pct && p.inStock) out.push({ key: "sale", label: `−${pct}%`, tone: "red" });
  if (p.isLimited) out.push({ key: "limited", label: "Limited", tone: "white" });
  if (p.isNew) out.push({ key: "new", label: "New", tone: "red" });
  if (p.isBestSeller) out.push({ key: "best", label: "Best seller", tone: "gold" });
  return out.slice(0, max);
}

export function ProductBadges({ product, max = 2, className }: { product: Badgeable; max?: number; className?: string }) {
  const badges = productBadges(product, max);
  if (!badges.length) return null;
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <Badge key={b.key} tone={b.tone}>
            {b.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
