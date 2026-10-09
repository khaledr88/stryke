"use client";

import Image from "next/image";
import { forwardRef, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@shared/constants";
import type { StoredImage } from "@shared/types";
import { Modal } from "@/components/ui/Sheet";
import { uploadImage } from "@/lib/admin/upload";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------- Layout --------------------------------- */

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em] text-white lg:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-steel">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className, padded = true }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("bg-carbon shadow-[inset_0_0_0_1px_var(--color-line)]", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-display text-base font-bold uppercase tracking-[0.1em] text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-steel">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "warning" | "success" }) {
  return (
    <div className="bg-carbon p-4 shadow-[inset_0_0_0_1px_var(--color-line)] sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-bold tabular-nums",
          tone === "red" ? "text-red-bright" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-white",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-steel">{hint}</p>}
    </div>
  );
}

/* ---------------------------------- Buttons -------------------------------- */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Btn({ variant = "secondary", size = "md", loading, className, children, ...props }: ComponentProps<"button"> & { variant?: BtnVariant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-red text-white hover:bg-red-bright",
        variant === "secondary" && "text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-white/8",
        variant === "ghost" && "text-silver hover:bg-white/5 hover:text-white",
        variant === "danger" && "text-red-bright shadow-[inset_0_0_0_1px_rgb(214_0_28/0.5)] hover:bg-red/10",
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ----------------------------------- Inputs -------------------------------- */

const inputBase =
  "w-full bg-ink px-3 text-sm text-white placeholder:text-steel/60 shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:shadow-[inset_0_0_0_1px_#fff] focus:outline-none disabled:opacity-50";

export function FieldShell({ label, hint, error, children, className, required }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-silver">
        {label}
        {required && <span className="text-red-bright"> *</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-bright">{error}</span> : hint ? <span className="mt-1 block text-xs text-steel">{hint}</span> : null}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, ComponentProps<"input"> & { invalid?: boolean }>(function TextInput({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cn(inputBase, "h-10", invalid && "shadow-[inset_0_0_0_1px_var(--color-red-bright)]", className)} {...props} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
});

export const SelectInput = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function SelectInput({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(inputBase, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
});

/** Dollar input that stores minor units (cents). */
export function MoneyInput({ value, onChange, placeholder, allowEmpty, invalid, id }: { value: number | null; onChange: (cents: number | null) => void; placeholder?: string; allowEmpty?: boolean; invalid?: boolean; id?: string }) {
  const [text, setText] = useState(value == null ? "" : (value / 100).toFixed(2).replace(/\.00$/, ""));
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-steel">$</span>
      <TextInput
        id={id}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        invalid={invalid}
        className="pl-7 tabular-nums"
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.]/g, "");
          setText(t);
          if (t === "") onChange(allowEmpty ? null : 0);
          else if (!Number.isNaN(Number(t))) onChange(Math.round(Number(t) * 100));
        }}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-red" : "bg-white/15")}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform", checked && "translate-x-5")} />
      </button>
      <span>
        <span className="block text-sm text-white">{label}</span>
        {description && <span className="block text-xs text-steel">{description}</span>}
      </span>
    </label>
  );
}

/* ---------------------------------- Status --------------------------------- */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-sky-400/15 text-sky-300",
  preparing: "bg-violet-400/15 text-violet-300",
  shipped: "bg-blue-400/15 text-blue-300",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-white/10 text-steel",
  published: "bg-success/15 text-success",
  draft: "bg-white/10 text-silver",
  archived: "bg-white/5 text-steel",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold capitalize", STATUS_STYLES[status] ?? "bg-white/10 text-silver")}>
      {label ?? ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
    </span>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="bg-red/10 p-4 text-sm text-white shadow-[inset_0_0_0_1px_rgb(214_0_28/0.5)]">
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 p-6 text-sm text-steel" role="status">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <p className="font-display text-xl font-bold uppercase tracking-wide text-white">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-steel">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------------------- Dialogs -------------------------------- */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4 p-5">
        {body && <div className="text-sm text-silver">{body}</div>}
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant={danger ? "danger" : "primary"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------------- Images --------------------------------- */

export function ImageField({
  value,
  onChange,
  folder,
  label,
  aspect = "aspect-[4/3]",
  hint,
}: {
  value: StoredImage | null;
  onChange: (img: StoredImage | null) => void;
  folder: string;
  label: string;
  aspect?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const notify = useUi((s) => s.notify);
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-silver">{label}</span>
      <div className={cn("relative overflow-hidden bg-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]", aspect)}>
        {value?.url ? (
          <>
            <Image src={value.url} alt={value.alt || ""} fill sizes="400px" className="object-cover" />
            <button type="button" onClick={() => onChange(null)} className="absolute top-2 right-2 grid size-8 place-items-center bg-black/70 text-white hover:bg-black" aria-label={`Remove ${label}`}>
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-steel hover:text-white">
            {progress != null ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            <span className="text-xs">{progress != null ? `Uploading ${progress}%` : "Upload image"}</span>
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-steel">{hint}</p>}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            setProgress(0);
            onChange(await uploadImage(file, folder, setProgress));
          } catch (err) {
            notify((err as Error).message || "Upload failed", "error");
          } finally {
            setProgress(null);
          }
        }}
      />
    </div>
  );
}
