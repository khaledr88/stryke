import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function SectionHeading({
  title,
  href,
  linkLabel = "View all",
  intro,
  className,
  as: Tag = "h2",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  intro?: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-6 lg:mb-8", className)}>
      <div className="min-w-0">
        <Tag className="display flex items-center gap-4 text-[2rem] text-white sm:text-[2.6rem] lg:text-5xl">
          {title}
          <span className="strike-line hidden w-12 sm:inline-block" aria-hidden />
        </Tag>
        {intro ? <p className="mt-2 max-w-xl text-steel">{intro}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="group label inline-flex shrink-0 items-center gap-2 pb-1 text-[0.72rem] text-silver hover:text-white">
          {linkLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}
