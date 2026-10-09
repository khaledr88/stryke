import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PromoBanner } from "@shared/types";
import { Media } from "@/components/ui/Media";
import { cn } from "@/lib/utils/cn";
import { Container } from "./SectionHeading";

/**
 * Editorial banners: the first runs full width, the rest sit in a row below.
 * All copy and images come from the admin dashboard.
 */
export function PromoBanners({ promos }: { promos: PromoBanner[] }) {
  const list = promos.filter((p) => p.enabled);
  if (!list.length) return null;
  const [lead, ...rest] = list;
  return (
    <section className="pt-20 lg:pt-28" aria-label="Collections">
      <Container className="space-y-3">
        <Banner promo={lead} large />
        {rest.length > 0 && (
          <div className={cn("grid gap-3", rest.length === 1 ? "" : rest.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
            {rest.map((p) => (
              <Banner key={p.id} promo={p} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

function Banner({ promo, large }: { promo: PromoBanner; large?: boolean }) {
  return (
    <Link
      href={promo.href || "/shop"}
      className={cn(
        "group relative flex overflow-hidden cut cut-lg",
        large ? "min-h-[420px] items-center sm:min-h-[460px] lg:min-h-[520px]" : "min-h-[340px] items-end lg:min-h-[400px]",
      )}
    >
      <Media
        image={promo.image}
        alt=""
        sizes={large ? "100vw" : "(min-width:768px) 33vw, 100vw"}
        className="absolute inset-0"
        imgClassName="transition-transform duration-[1200ms] ease-[var(--ease-strike)] group-hover:scale-[1.04]"
      />
      <div
        className={cn(
          "absolute inset-0",
          large
            ? "bg-[linear-gradient(90deg,rgba(5,5,5,0.92)_0%,rgba(5,5,5,0.6)_45%,rgba(5,5,5,0.05)_100%)]"
            : "bg-gradient-to-t from-black/95 via-black/40 to-black/5",
        )}
      />
      {!promo.image && (
        <span aria-hidden className="absolute -right-10 top-1/2 h-[140%] w-24 -translate-y-1/2 skew-x-[-24deg] bg-red/80 transition-transform duration-700 ease-[var(--ease-strike)] group-hover:translate-x-[-12px]" />
      )}
      <div className={cn("relative z-10 p-6 sm:p-10", large ? "max-w-xl lg:p-16" : "")}>
        {promo.eyebrow && (
          <p className="label mb-3 flex items-center gap-3 text-[0.7rem] text-silver">
            <span className="strike-line w-6" aria-hidden />
            {promo.eyebrow}
          </p>
        )}
        <h3 className={cn("display text-white", large ? "text-[3.2rem] sm:text-6xl lg:text-7xl" : "text-[2.4rem] lg:text-[2.8rem]")}>{promo.title}</h3>
        {promo.body && <p className={cn("mt-3 text-silver", large ? "max-w-md text-lg" : "max-w-xs")}>{promo.body}</p>}
        <span className="mt-6 inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.16em] text-white">
          <span className="border-b-2 border-red pb-0.5">{promo.ctaLabel || "Shop now"}</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
