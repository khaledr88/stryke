import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "light" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 font-display font-semibold uppercase tracking-[0.14em] transition-[background-color,color,opacity,transform] duration-200 ease-[var(--ease-strike)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "cut bg-red text-white hover:bg-red-bright",
  secondary: "cut cut-outline bg-transparent text-white hover:bg-white/8",
  light: "cut bg-white text-ink hover:bg-mist",
  ghost: "text-silver hover:text-white",
  danger: "cut cut-outline bg-transparent text-red-bright [--outline:rgb(214_0_28/0.55)] hover:bg-red/10",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8rem] cut-sm",
  md: "h-12 px-6 text-[0.95rem]",
  lg: "h-14 px-8 text-base",
};

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  full?: boolean;
}

export function Button({ variant = "primary", size = "md", className, full, ...props }: Common & ComponentProps<"button">) {
  return <button className={cn(base, variants[variant], sizes[size], full && "w-full", className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  full,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], full && "w-full", className)} {...props} />;
}
