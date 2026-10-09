import Link from "next/link";

export function AnnouncementBar({ text, href }: { text: string; href: string }) {
  const content = <span className="truncate">{text}</span>;
  return (
    <div className="relative z-[51] bg-red text-white">
      <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-center px-4 font-display text-[0.8rem] font-semibold uppercase tracking-[0.18em]">
        {href ? (
          <Link href={href} className="truncate underline-offset-4 hover:underline">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
