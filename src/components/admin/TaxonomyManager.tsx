"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { StoredImage } from "@shared/types";
import { slugify } from "@shared/text";
import { Modal } from "@/components/ui/Sheet";
import { adminApi, refreshStorefront } from "@/lib/admin/api";
import { useLiveQuery } from "@/lib/admin/data";
import { firebase } from "@/lib/firebase/client";
import { useUi } from "@/lib/store/ui";
import { Btn, Card, ConfirmDialog, Empty, ErrorBox, FieldShell, ImageField, PageTitle, TextInput, Toggle } from "./ui";

export type FieldDef<T> =
  | { key: keyof T & string; label: string; type: "text"; hint?: string; required?: boolean; span?: 2 }
  | { key: keyof T & string; label: string; type: "textarea"; hint?: string; span?: 2 }
  | { key: keyof T & string; label: string; type: "toggle"; hint?: string; span?: 2 }
  | { key: keyof T & string; label: string; type: "image"; hint?: string; folder: string; aspect?: string }
  | { key: string; label: string; type: "custom"; span?: 2; render: (value: T, set: (patch: Partial<T>) => void) => ReactNode };

interface BaseDoc {
  id: string;
  slug: string;
  order: number;
  visible: boolean;
}

export interface TaxonomyConfig<T extends BaseDoc> {
  collection: "categories" | "brands" | "clubs" | "collections";
  title: string;
  singular: string;
  description: string;
  nameKey: keyof T & string;
  usageField?: "categoryId" | "brandId" | "clubId";
  cacheTag: string;
  empty: () => Omit<T, "id">;
  fields: FieldDef<T>[];
  thumb?: (item: T) => StoredImage | null;
  meta?: (item: T) => ReactNode;
}

export function TaxonomyManager<T extends BaseDoc>({ config }: { config: TaxonomyConfig<T> }) {
  const { db, auth } = firebase();
  const notify = useUi((s) => s.notify);
  const items = useLiveQuery<T>(() => query(collection(db, config.collection), orderBy("order")), config.collection);
  const [editing, setEditing] = useState<{ value: T; isNew: boolean } | null>(null);
  const [toDelete, setToDelete] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const name = (t: T) => String(t[config.nameKey] ?? "");

  async function persist(value: T, isNew: boolean) {
    const { id, ...data } = value;
    const docId = isNew ? data.slug : id;
    const payload = { ...data, updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.uid ?? "" };
    const before = isNew ? null : items.data.find((i) => i.id === docId);
    if (isNew) await setDoc(doc(db, config.collection, docId), { ...payload, createdAt: serverTimestamp() });
    else await updateDoc(doc(db, config.collection, docId), payload);
    const newName = String(value[config.nameKey] ?? "");
    if (config.usageField && before && String(before[config.nameKey] ?? "") !== newName) {
      // Products keep a copy of the name for fast listings; update them too.
      await adminApi.syncTaxonomyName({ collection: config.collection, id: docId, name: newName });
    }
    await refreshStorefront([config.cacheTag]);
  }

  async function save() {
    if (!editing) return;
    const v = editing.value;
    const label = name(v).trim();
    if (!label) return setError(`${config.singular} name is required.`);
    const slug = slugify(v.slug || label);
    if (!slug) return setError("Add a URL slug using letters or numbers.");
    if (editing.isNew && items.data.some((i) => i.slug === slug || i.id === slug)) return setError(`A ${config.singular.toLowerCase()} with the URL “${slug}” already exists.`);
    setError(null);
    setSaving(true);
    try {
      await persist({ ...v, slug }, editing.isNew);
      notify(`${config.singular} saved`);
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible(item: T) {
    await persist({ ...item, visible: !item.visible }, false).catch((e) => notify((e as Error).message, "error"));
  }

  async function move(index: number, dir: -1 | 1) {
    const list = items.data;
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const batch = writeBatch(db);
    const uid = auth.currentUser?.uid ?? "";
    // Renumber everything so order values stay unique and sequential.
    const reordered = [...list];
    [reordered[index], reordered[j]] = [reordered[j], reordered[index]];
    reordered.forEach((it, i) => batch.update(doc(db, config.collection, it.id), { order: i + 1, updatedAt: serverTimestamp(), updatedBy: uid }));
    await batch.commit().catch((e) => notify((e as Error).message, "error"));
    await refreshStorefront([config.cacheTag]);
  }

  return (
    <>
      <PageTitle
        title={config.title}
        description={config.description}
        actions={
          <Btn variant="primary" onClick={() => setEditing({ value: { id: "", ...config.empty(), order: items.data.length + 1 } as T, isNew: true })}>
            <Plus className="size-4" /> Add {config.singular.toLowerCase()}
          </Btn>
        }
      />
      {items.error && <ErrorBox>{items.error}</ErrorBox>}
      <Card padded={false}>
        {items.data.length === 0 ? (
          <Empty title={items.loading ? "Loading…" : `No ${config.title.toLowerCase()} yet`} />
        ) : (
          <ul className="divide-y divide-line">
            {items.data.map((item, i) => {
              const thumb = config.thumb?.(item);
              return (
                <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-steel hover:text-white disabled:opacity-20" aria-label={`Move ${name(item)} up`}>
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === items.data.length - 1} className="text-steel hover:text-white disabled:opacity-20" aria-label={`Move ${name(item)} down`}>
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                  <span className="relative size-12 shrink-0 overflow-hidden bg-graphite">
                    {thumb?.url ? <Image src={thumb.url} alt="" fill sizes="48px" className="object-contain" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">
                      {name(item)} {!item.visible && <span className="ml-2 text-xs font-normal text-steel">(hidden)</span>}
                    </p>
                    <p className="truncate text-xs text-steel">
                      /{item.slug}
                      {config.meta ? <> · {config.meta(item)}</> : null}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" title={item.visible ? "Hide" : "Show"} aria-label={item.visible ? `Hide ${name(item)}` : `Show ${name(item)}`} onClick={() => toggleVisible(item)} className="grid size-9 place-items-center text-silver hover:bg-white/10 hover:text-white">
                      {item.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button type="button" title="Edit" aria-label={`Edit ${name(item)}`} onClick={() => setEditing({ value: item, isNew: false })} className="grid size-9 place-items-center text-silver hover:bg-white/10 hover:text-white">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" title="Delete" aria-label={`Delete ${name(item)}`} onClick={() => setToDelete(item)} className="grid size-9 place-items-center text-silver hover:bg-white/10 hover:text-red-bright">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.isNew ? `Add ${config.singular.toLowerCase()}` : `Edit ${config.singular.toLowerCase()}`} wide>
        {editing && (
          <form
            className="p-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {config.fields.map((f) => {
                const v = editing.value as unknown as Record<string, unknown>;
                const set = (patch: Partial<T>) => setEditing((s) => (s ? { ...s, value: { ...s.value, ...patch } } : s));
                if (f.type === "custom") return <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : ""}>{f.render(editing.value, set)}</div>;
                if (f.type === "image")
                  return <ImageField key={f.key} label={f.label} hint={f.hint} folder={f.folder} aspect={f.aspect} value={(v[f.key] as StoredImage | null) ?? null} onChange={(img) => set({ [f.key]: img } as Partial<T>)} />;
                if (f.type === "toggle")
                  return (
                    <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : ""}>
                      <Toggle checked={Boolean(v[f.key])} onChange={(b) => set({ [f.key]: b } as Partial<T>)} label={f.label} description={f.hint} />
                    </div>
                  );
                if (f.type === "textarea")
                  return (
                    <FieldShell key={f.key} label={f.label} hint={f.hint} className="sm:col-span-2">
                      <textarea value={String(v[f.key] ?? "")} onChange={(e) => set({ [f.key]: e.target.value } as Partial<T>)} rows={3} className="w-full bg-ink px-3 py-2 text-sm text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:outline-none" />
                    </FieldShell>
                  );
                return (
                  <FieldShell key={f.key} label={f.label} hint={f.key === "slug" ? `/${slugify(String(v.slug || v[config.nameKey] || "")) || "…"}` : f.hint} required={f.required} className={f.span === 2 ? "sm:col-span-2" : ""}>
                    <TextInput
                      value={String(v[f.key] ?? "")}
                      onChange={(e) => set({ [f.key]: f.key === "slug" ? slugify(e.target.value) : e.target.value } as Partial<T>)}
                      disabled={f.key === "slug" && !editing.isNew}
                      placeholder={f.key === "slug" ? "Generated from the name" : undefined}
                    />
                  </FieldShell>
                );
              })}
            </div>
            {error && (
              <div className="mt-4">
                <ErrorBox>{error}</ErrorBox>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Btn type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" loading={saving}>
                Save
              </Btn>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={`Delete ${toDelete ? name(toDelete) : ""}?`}
        body={config.usageField ? "You can only delete it when no products use it. Hiding it is usually better." : "This can’t be undone."}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!toDelete) return;
          if (config.usageField) {
            const n = (await getCountFromServer(query(collection(db, "products"), where(config.usageField, "==", toDelete.id)))).data().count;
            if (n > 0) {
              notify(`${n} product${n === 1 ? " uses" : "s use"} this ${config.singular.toLowerCase()}. Move them first or hide it instead.`, "error");
              return;
            }
          }
          await deleteDoc(doc(db, config.collection, toDelete.id));
          await refreshStorefront([config.cacheTag]);
          notify("Deleted");
        }}
      />
    </>
  );
}
