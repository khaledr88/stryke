import Image from "next/image";
import type { Club } from "@shared/types";
import { cn } from "@/lib/utils/cn";

/**
 * Club crest uploaded by the admin. Without one we draw a neutral shield in
 * the club's colours with its short name — never an imitation of the real crest.
 */
export function Crest({ club, className, sizes = "80px" }: { club: Pick<Club, "name" | "shortName" | "crest" | "colors">; className?: string; sizes?: string }) {
  if (club.crest?.url) {
    return (
      <span className={cn("relative block", className)}>
        <Image src={club.crest.url} alt={`${club.name} crest`} fill sizes={sizes} className="object-contain" />
      </span>
    );
  }
  const [c1, c2] = club.colors ?? ["#333", "#777"];
  const id = club.shortName.replace(/\W/g, "");
  return (
    <svg viewBox="0 0 64 72" className={cn("block", className)} role="img" aria-label={club.name}>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.5" stopColor={c1} />
          <stop offset="0.5" stopColor={c2} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <path d="M32 2 L60 10 V34 C60 52 47 64 32 70 C17 64 4 52 4 34 V10 Z" fill={`url(#g-${id})`} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <path d="M32 7 L55 13.5 V34 C55 49 44 59 32 64.5 C20 59 9 49 9 34 V13.5 Z" fill="rgba(5,5,5,0.62)" />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="800"
        fontStyle="italic"
        fontSize="17"
        fill="#fff"
        letterSpacing="0.5"
      >
        {club.shortName}
      </text>
    </svg>
  );
}
