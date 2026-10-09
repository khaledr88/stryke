import { cn } from "@/lib/utils/cn";

const tones = {
  red: "bg-red text-white",
  white: "bg-white text-ink",
  dark: "bg-ink/80 text-silver shadow-[inset_0_0_0_1px_var(--color-line-strong)] backdrop-blur",
  gold: "bg-[#b8925a] text-ink",
  outline: "text-silver shadow-[inset_0_0_0_1px_var(--color-line-strong)]",
} as const;

export function Badge({ tone = "dark", children, className }: { tone?: keyof typeof tones; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center px-2 font-display text-[0.72rem] font-bold uppercase tracking-[0.12em] cut-tr [--cut:6px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
