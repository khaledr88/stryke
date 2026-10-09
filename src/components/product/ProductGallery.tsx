"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Expand, X } from "lucide-react";
import type { StoredImage } from "@shared/types";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/utils/cn";

export function ProductGallery({ images, name }: { images: StoredImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);

  if (!images.length) {
    return (
      <div className="grid aspect-[4/5] place-items-center bg-carbon">
        <LogoMark className="h-auto w-1/4 opacity-15" sizes="120px" />
      </div>
    );
  }

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="lg:grid lg:grid-cols-[84px_1fr] lg:gap-4">
      {/* Thumbnails (desktop) */}
      <div className="hidden lg:flex lg:flex-col lg:gap-2">
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            aria-label={`Show image ${i + 1} of ${images.length}`}
            aria-current={i === active}
            className={cn("relative aspect-[4/5] overflow-hidden bg-carbon transition-opacity", i === active ? "ring-1 ring-white" : "opacity-50 hover:opacity-100")}
          >
            <Image src={img.url} alt="" fill sizes="84px" className="object-cover" />
          </button>
        ))}
      </div>

      {/* Main image with hover zoom (desktop) */}
      <div className="relative hidden lg:block">
        <button
          type="button"
          className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-carbon"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setLightbox(active)}
          aria-label="Open full-screen image"
        >
          <AnimatePresence initial={false}>
            <motion.div key={active} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              <Image
                src={images[active].url}
                alt={images[active].alt || name}
                fill
                priority={active === 0}
                sizes="(min-width:1280px) 50vw, 60vw"
                className="object-cover transition-transform duration-200 ease-out"
                style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </motion.div>
          </AnimatePresence>
        </button>
      </div>

      {/* Swipe gallery (mobile/tablet) */}
      <div className="relative -mx-4 sm:-mx-6 lg:hidden">
        <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button key={img.url} type="button" onClick={() => setLightbox(i)} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-carbon" aria-label={`Open image ${i + 1} full screen`}>
              <Image src={img.url} alt={img.alt || name} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
            {images.map((_, i) => (
              <span key={i} className={cn("h-[3px] skew-x-[-35deg] transition-all", i === active ? "w-6 bg-white" : "w-3 bg-white/40")} />
            ))}
          </div>
        )}
        <span className="pointer-events-none absolute top-4 right-4 grid size-9 place-items-center bg-black/50 text-white backdrop-blur" aria-hidden>
          <Expand className="size-4" />
        </span>
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            className="fixed inset-0 z-[85] overflow-y-auto bg-ink"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${name} images`}
            onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
          >
            <button
              type="button"
              autoFocus
              onClick={() => setLightbox(null)}
              className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 grid size-12 place-items-center bg-black/60 text-white backdrop-blur"
              aria-label="Close"
            >
              <X className="size-6" />
            </button>
            <div className="mx-auto max-w-5xl space-y-2 py-2" style={{ touchAction: "pinch-zoom" }}>
              {images.map((img, i) => (
                <div key={img.url} ref={(el) => { if (el && i === lightbox) el.scrollIntoView({ block: "start" }); }} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- full-resolution view for zooming */}
                  <img src={img.url} alt={img.alt || `${name} image ${i + 1}`} className="h-auto w-full" loading={i === lightbox ? "eager" : "lazy"} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
