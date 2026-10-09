"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

function useDialogBehaviour(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      const target = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current;
      target?.focus({ preventScroll: true });
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const focusables = panel.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, panel]);
}

export function Sheet({
  open,
  onClose,
  title,
  side = "right",
  children,
  footer,
  className,
  hideTitle,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "right" | "left" | "bottom";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideTitle?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehaviour(open, onClose, panel);
  const from = side === "right" ? { x: "100%" } : side === "left" ? { x: "-100%" } : { y: "100%" };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="presentation">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "absolute flex flex-col bg-carbon outline-none shadow-[0_0_80px_rgba(0,0,0,0.6)]",
              side === "right" && "inset-y-0 right-0 w-full max-w-[440px] border-l border-line",
              side === "left" && "inset-y-0 left-0 w-full max-w-[400px] border-r border-line",
              side === "bottom" && "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-line",
              className,
            )}
            initial={from}
            animate={{ x: 0, y: 0 }}
            exit={from}
            transition={{ type: "tween", duration: 0.38, ease: [0.2, 0.9, 0.1, 1] }}
          >
            <div className={cn("flex items-center justify-between gap-4 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4", !hideTitle && "border-b border-line")}>
              <h2 id={titleId} className={cn("display text-2xl not-italic tracking-wide text-white", hideTitle && "sr-only")}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 ml-auto grid size-11 place-items-center text-silver transition-colors hover:text-white"
                aria-label="Close"
              >
                <X className="size-6" strokeWidth={1.5} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
            {footer ? <div className="border-t border-line px-5 pt-4 pb-[max(1rem,var(--safe-bottom))]">{footer}</div> : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogBehaviour(open, onClose, panel);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "relative max-h-[92dvh] w-full overflow-y-auto bg-carbon outline-none ring-1 ring-line sm:cut-lg",
              wide ? "sm:max-w-4xl" : "sm:max-w-lg",
              "rounded-t-2xl sm:rounded-none",
              className,
            )}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: [0.2, 0.9, 0.1, 1] }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-carbon/95 px-5 py-3 backdrop-blur">
              <h2 id={titleId} className="font-display text-lg font-bold uppercase tracking-[0.08em] text-white">
                {title}
              </h2>
              <button type="button" onClick={onClose} className="-mr-2 grid size-11 place-items-center text-silver hover:text-white" aria-label="Close">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
