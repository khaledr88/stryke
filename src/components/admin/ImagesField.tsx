"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import type { StoredImage } from "@shared/types";
import { uploadImage } from "@/lib/admin/upload";
import { cn } from "@/lib/utils/cn";

interface Pending {
  id: string;
  name: string;
  progress: number;
  preview: string;
}

/** Multi-image uploader with previews, ordering (first = cover) and alt text. */
export function ImagesField({
  value,
  onChange,
  folder,
  max = 12,
  error,
}: {
  value: StoredImage[];
  onChange: (images: StoredImage[]) => void;
  folder: string;
  max?: number;
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const latest = useRef(value);
  latest.current = value;

  async function addFiles(files: FileList | File[]) {
    const list = [...files].slice(0, Math.max(0, max - value.length - pending.length));
    setFailures([]);
    await Promise.all(
      list.map(async (file) => {
        const id = `${file.name}-${file.size}-${Math.random()}`;
        const preview = URL.createObjectURL(file);
        setPending((p) => [...p, { id, name: file.name, progress: 0, preview }]);
        try {
          const img = await uploadImage(file, folder, (progress) => setPending((p) => p.map((x) => (x.id === id ? { ...x, progress } : x))));
          onChange([...latest.current, img]);
        } catch (e) {
          setFailures((f) => [...f, (e as Error).message || `${file.name} failed to upload`]);
        } finally {
          URL.revokeObjectURL(preview);
          setPending((p) => p.filter((x) => x.id !== id));
        }
      }),
    );
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {value.map((img, i) => (
          <li key={img.url} className="group bg-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image src={img.url} alt={img.alt || ""} fill sizes="240px" className="object-cover" />
              {i === 0 && <span className="absolute top-2 left-2 bg-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Cover</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <div className="flex">
                  <IconBtn label="Move left" onClick={() => move(i, i - 1)} disabled={i === 0}>
                    <ChevronLeft className="size-4" />
                  </IconBtn>
                  <IconBtn label="Move right" onClick={() => move(i, i + 1)} disabled={i === value.length - 1}>
                    <ChevronRight className="size-4" />
                  </IconBtn>
                  {i > 0 && (
                    <IconBtn label="Make cover image" onClick={() => move(i, 0)}>
                      <Star className="size-4" />
                    </IconBtn>
                  )}
                </div>
                <IconBtn label="Remove image" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>
            </div>
            <input
              value={img.alt ?? ""}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, alt: e.target.value.slice(0, 200) } : x)))}
              placeholder="Describe the photo (alt text)"
              className="h-9 w-full bg-transparent px-2 text-xs text-white placeholder:text-steel/60 focus:outline-none"
              aria-label={`Alt text for image ${i + 1}`}
            />
          </li>
        ))}
        {pending.map((p) => (
          <li key={p.id} className="relative aspect-[4/5] overflow-hidden bg-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={p.preview} alt="" className="size-full object-cover opacity-40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-white">
              <Loader2 className="size-5 animate-spin" />
              {p.progress}%
            </div>
          </li>
        ))}
        {value.length + pending.length < max && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 border border-dashed text-sm transition-colors",
                dragOver ? "border-white bg-white/5 text-white" : "border-line-strong text-steel hover:border-white hover:text-white",
                error && "border-red-bright",
              )}
            >
              <ImagePlus className="size-6" />
              Add photos
              <span className="px-3 text-center text-xs text-steel">Drop or browse · JPG, PNG, WebP</span>
            </button>
          </li>
        )}
      </ul>
      {error && <p className="mt-2 text-xs text-red-bright">{error}</p>}
      {failures.map((f) => (
        <p key={f} className="mt-2 text-xs text-red-bright">
          {f}
        </p>
      ))}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid size-8 place-items-center text-white hover:bg-white/15 disabled:opacity-30">
      {children}
    </button>
  );
}
