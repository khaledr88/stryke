"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

export function ToastHost() {
  const toast = useUi((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => useUi.setState({ toast: null }), 3600);
    return () => window.clearTimeout(t);
  }, [toast]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+var(--safe-bottom))] z-[90] flex justify-center px-4 lg:bottom-8" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn(
              "cut pointer-events-auto max-w-md px-5 py-3 text-sm font-medium shadow-2xl",
              toast.tone === "error" ? "bg-red text-white" : "bg-white text-ink",
            )}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
