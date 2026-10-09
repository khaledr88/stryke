import Image from "next/image";
import type { StoredImage } from "@shared/types";
import { cn } from "@/lib/utils/cn";
import { LogoMark } from "./Logo";

/**
 * Admin-uploaded image with a branded fallback. When no photo exists we show
 * a quiet S-mark on carbon instead of a stock placeholder photo.
 */
export function Media({
  image,
  alt,
  sizes,
  priority,
  className,
  imgClassName,
  focus,
  fallbackLabel,
}: {
  image: StoredImage | string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  focus?: { x: number; y: number };
  fallbackLabel?: string;
}) {
  const url = typeof image === "string" ? image : image?.url;
  return (
    <div className={cn("relative overflow-hidden bg-carbon", className)}>
      {url ? (
        <Image
          src={url}
          alt={(typeof image === "object" && image?.alt) || alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imgClassName)}
          style={focus ? { objectPosition: `${focus.x}% ${focus.y}%` } : undefined}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(120%_80%_at_70%_20%,#1e1e1e_0%,#0c0c0c_60%)]">
          <LogoMark className="h-auto w-1/4 max-w-24 opacity-[0.16]" sizes="96px" />
          {fallbackLabel ? <span className="label text-[0.65rem] text-steel/70">{fallbackLabel}</span> : null}
        </div>
      )}
    </div>
  );
}
