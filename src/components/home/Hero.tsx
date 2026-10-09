"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@shared/types";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/utils/cn";

function splitHeading(heading: string): [string, string] {
  if (heading.includes("\n")) {
    const [a, ...b] = heading.split("\n");
    return [a, b.join(" ")];
  }
  const words = heading.trim().split(/\s+/);
  if (words.length < 3) return [heading, ""];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

const ease = [0.2, 0.9, 0.1, 1] as const;

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const list = slides.filter((s) => s.enabled);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-12%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0.2]);

  useEffect(() => {
    if (list.length < 2 || paused || reduce) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % list.length), 7000);
    return () => window.clearInterval(t);
  }, [list.length, paused, reduce]);

  if (!list.length) return null;
  const slide = list[Math.min(index, list.length - 1)];
  const [lineA, lineB] = splitHeading(slide.heading);
  const go = (d: number) => setIndex((i) => (i + d + list.length) % list.length);

  return (
    <section
      ref={ref}
      className="relative -mt-[var(--header-h)] flex min-h-[640px] items-end overflow-hidden bg-ink h-[min(100svh,980px)] lg:items-center"
      aria-roledescription={list.length > 1 ? "carousel" : undefined}
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Backdrop */}
      <motion.div className="absolute inset-0" style={{ y: imageY }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease }}
          >
            {slide.image ? (
              <>
                <Image
                  src={slide.image.url}
                  alt={slide.image.alt || ""}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className={cn("object-cover", slide.mobileImage && "hidden md:block")}
                  style={{ objectPosition: `${slide.focusX}% ${slide.focusY}%` }}
                />
                {slide.mobileImage && (
                  <Image
                    src={slide.mobileImage.url}
                    alt={slide.mobileImage.alt || ""}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover md:hidden"
                    style={{ objectPosition: `${slide.focusX}% ${slide.focusY}%` }}
                  />
                )}
              </>
            ) : (
              <HeroMark />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.92)_0%,rgba(5,5,5,0.55)_45%,rgba(5,5,5,0.1)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#050505_0%,rgba(5,5,5,0.4)_35%,transparent_60%)]" />
      </motion.div>

      {/* Copy */}
      <motion.div style={{ y: textY, opacity: fade }} className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pt-[calc(var(--header-h)+3rem)] pb-24 sm:px-6 lg:px-10 lg:pb-16">
        <AnimatePresence mode="wait">
          <motion.div key={slide.id} exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}>
            {slide.eyebrow && (
              <motion.p
                className="label mb-5 flex items-center gap-4 text-[0.72rem] text-silver sm:text-sm"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease, delay: 0.1 }}
              >
                <span className="strike-line" aria-hidden />
                {slide.eyebrow}
              </motion.p>
            )}
            <h1 className="display text-hero font-black">
              <motion.span
                className="metal-text block animate-glint pr-[0.08em]"
                initial={{ opacity: 0, y: 40, skewX: -8 }}
                animate={{ opacity: 1, y: 0, skewX: 0 }}
                transition={{ duration: 0.9, ease, delay: 0.15 }}
              >
                {lineA}
              </motion.span>
              {lineB && (
                <motion.span
                  className="block bg-[linear-gradient(180deg,#ff2a43_0%,#d6001c_55%,#8f0013_100%)] bg-clip-text pr-[0.08em] text-transparent"
                  initial={{ opacity: 0, y: 40, skewX: -8 }}
                  animate={{ opacity: 1, y: 0, skewX: 0 }}
                  transition={{ duration: 0.9, ease, delay: 0.3 }}
                >
                  {lineB}
                </motion.span>
              )}
            </h1>
            {slide.body && (
              <motion.p
                className="mt-6 max-w-[34rem] text-base leading-relaxed text-silver sm:text-lg"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease, delay: 0.5 }}
              >
                {slide.body}
              </motion.p>
            )}
            <motion.div
              className="mt-9 flex flex-col gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.62 }}
            >
              <Link
                href={slide.primaryCta.href}
                className="cut group inline-flex h-14 items-center justify-center gap-3 bg-red px-9 font-display text-base font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-bright"
              >
                {slide.primaryCta.label}
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              {slide.secondaryCta && (
                <Link
                  href={slide.secondaryCta.href}
                  className="cut inline-flex h-14 items-center justify-center px-9 font-display text-base font-semibold uppercase tracking-[0.16em] text-white cut-outline [--outline:rgba(255,255,255,0.4)] backdrop-blur-sm transition-colors hover:bg-white hover:text-ink"
                >
                  {slide.secondaryCta.label}
                </Link>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {list.length > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 mx-auto flex max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex gap-2" role="tablist" aria-label="Choose slide">
            {list.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className="group py-3"
              >
                <span className={cn("block h-[3px] w-10 skew-x-[-35deg] transition-colors", i === index ? "bg-red" : "bg-white/25 group-hover:bg-white/50")} />
              </button>
            ))}
          </div>
          <div className="ml-auto hidden gap-1 sm:flex">
            <button type="button" onClick={() => go(-1)} className="grid size-11 place-items-center text-silver hover:text-white" aria-label="Previous slide">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={() => go(1)} className="grid size-11 place-items-center text-silver hover:text-white" aria-label="Next slide">
              <ChevronRight className="size-6" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Used until the admin uploads hero photography: the S-mark as a lit object on a dark stage. */
function HeroMark() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(90%_70%_at_75%_35%,#222_0%,#0b0b0b_45%,#050505_75%)]">
      <div className="absolute top-[8%] right-[-4%] h-[80%] w-[70%] bg-[radial-gradient(closest-side,rgba(214,0,28,0.22),transparent)] blur-2xl" />
      <motion.div
        className="absolute top-[30%] right-[-18%] w-[92%] max-w-[1100px] -translate-y-1/2 opacity-70 sm:right-[-6%] sm:w-[70%] lg:top-1/2 lg:right-[2%] lg:w-[54%] lg:opacity-100"
        initial={{ opacity: 0, x: 60, rotate: -4 }}
        animate={{ opacity: 0.9, x: 0, rotate: 0 }}
        transition={{ duration: 1.4, ease }}
      >
        <LogoMark className="h-auto w-full drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)]" sizes="(min-width:1024px) 54vw, 95vw" />
      </motion.div>
      {/* stadium light streaks */}
      <div className="absolute inset-y-0 right-[30%] w-px rotate-[24deg] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-y-0 right-[22%] w-px rotate-[24deg] bg-gradient-to-b from-transparent via-white/5 to-transparent" />
    </div>
  );
}
