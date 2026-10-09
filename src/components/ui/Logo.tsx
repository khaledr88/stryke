import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import mark from "../../../public/brand/stryke-mark.png";
import wordmark from "../../../public/brand/stryke-wordmark.png";

/** The supplied STRYKE logo, split into its S-mark and wordmark for the header. */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" aria-label="STRYKE home" className={cn("group inline-flex items-center gap-2.5", className)}>
      <Image
        src={mark}
        alt=""
        priority={priority}
        sizes="48px"
        className="h-8 w-auto transition-transform duration-500 ease-[var(--ease-strike)] group-hover:-translate-y-px lg:h-10"
      />
      <Image src={wordmark} alt="STRYKE" priority={priority} sizes="180px" className="h-[18px] w-auto lg:h-[22px]" />
    </Link>
  );
}

export function LogoMark({ className, sizes = "120px" }: { className?: string; sizes?: string }) {
  return <Image src={mark} alt="" sizes={sizes} className={className} />;
}

export function Wordmark({ className, sizes = "300px" }: { className?: string; sizes?: string }) {
  return <Image src={wordmark} alt="STRYKE" sizes={sizes} className={className} />;
}
