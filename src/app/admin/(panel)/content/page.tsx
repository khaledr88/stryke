"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { collection, doc, getDoc, orderBy, query, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { DEFAULT_HOMEPAGE } from "@shared/defaults";
import { plain } from "@shared/serialize";
import { mergeHomepage } from "@shared/settings";
import type { Category, HeroSlide, HomeSectionKey, HomepageContent, ProductCollection, PromoBanner } from "@shared/types";
import { Btn, Card, ErrorBox, FieldShell, ImageField, PageTitle, Spinner, TextArea, TextInput, Toggle } from "@/components/admin/ui";
import { refreshStorefront } from "@/lib/admin/api";
import { friendlyFirestoreError, useLiveQuery } from "@/lib/admin/data";
import { firebase } from "@/lib/firebase/client";
import { useUi } from "@/lib/store/ui";

const SECTION_LABELS: Record<HomeSectionKey, string> = {
  categories: "Shop by category",
  bestSellers: "Best sellers",
  brands: "Shop by brand",
  clubs: "Popular clubs",
  promos: "Promotional banners",
  newArrivals: "New arrivals",
  featured: "Featured products and collections",
};

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now()));

export default function ContentPage() {
  const { db, auth } = firebase();
  const notify = useUi((s) => s.notify);
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  const categories = useLiveQuery<Category>(() => query(collection(db, "categories"), orderBy("order")), "content-cats");
  const collections = useLiveQuery<ProductCollection>(() => query(collection(db, "collections"), orderBy("order")), "content-cols");

  useEffect(() => {
    (async () => {
      try {
        const [draft, published] = await Promise.all([getDoc(doc(db, "homepageContent", "draft")), getDoc(doc(db, "homepageContent", "published"))]);
        const source = draft.exists() ? draft.data() : published.exists() ? published.data() : null;
        setContent(mergeHomepage(source ? plain<HomepageContent>(source) : null));
        if (published.exists()) setPublishedAt(plain<HomepageContent>(published.data()).publishedAt ?? null);
      } catch (e) {
        setError(friendlyFirestoreError(e));
      }
    })();
  }, [db]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!content) return <Spinner />;

  const update = (patch: Partial<HomepageContent>) => {
    setContent((c) => (c ? { ...c, ...patch } : c));
    setDirty(true);
  };
  const setSlide = (i: number, patch: Partial<HeroSlide>) => update({ heroSlides: content.heroSlides.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setPromo = (i: number, patch: Partial<PromoBanner>) => update({ promos: content.promos.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  async function save(publish: boolean) {
    if (!content) return;
    setSaving(publish ? "publish" : "draft");
    try {
      const { updatedAt: _u, publishedAt: _p, ...data } = content;
      void _u; void _p;
      const stamp = { updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.uid ?? "" };
      if (publish) {
        const batch = writeBatch(db);
        batch.set(doc(db, "homepageContent", "draft"), { ...data, ...stamp });
        batch.set(doc(db, "homepageContent", "published"), { ...data, ...stamp, publishedAt: serverTimestamp() });
        await batch.commit();
        await refreshStorefront(["homepage"]);
        setPublishedAt(Date.now());
        notify("Published — the homepage is updated");
      } else {
        await setDoc(doc(db, "homepageContent", "draft"), { ...data, ...stamp });
        notify("Draft saved. Publish when you’re ready.");
      }
      setDirty(false);
    } catch (e) {
      notify(friendlyFirestoreError(e), "error");
    } finally {
      setSaving(null);
    }
  }

  const orderedCats = [...content.categoryOrder.map((id) => categories.data.find((c) => c.id === id)).filter(Boolean), ...categories.data.filter((c) => !content.categoryOrder.includes(c.id))] as Category[];

  return (
    <>
      <PageTitle
        title="Homepage"
        description={`Edit freely — nothing changes on the store until you publish.${publishedAt ? ` Last published ${new Date(publishedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.` : ""}`}
        actions={
          <>
            <a href="/" target="_blank" className="inline-flex h-10 items-center gap-2 px-3 text-sm text-silver hover:text-white">
              View store <ExternalLink className="size-3.5" />
            </a>
            <Btn loading={saving === "draft"} onClick={() => save(false)}>
              Save draft
            </Btn>
            <Btn variant="primary" loading={saving === "publish"} onClick={() => save(true)}>
              Publish
            </Btn>
          </>
        }
      />
      {dirty && <p className="mb-4 text-sm text-warning">You have unsaved changes.</p>}

      <div className="space-y-6">
        <Card title="Announcement bar" description="A thin red bar above the header, e.g. a delivery offer.">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
            <Toggle checked={content.announcement.enabled} onChange={(v) => update({ announcement: { ...content.announcement, enabled: v } })} label="Show" />
            <FieldShell label="Text">
              <TextInput value={content.announcement.text} onChange={(e) => update({ announcement: { ...content.announcement, text: e.target.value } })} maxLength={120} placeholder="Free delivery on orders over $100" />
            </FieldShell>
            <FieldShell label="Link (optional)">
              <TextInput value={content.announcement.href} onChange={(e) => update({ announcement: { ...content.announcement, href: e.target.value } })} placeholder="/collections/sale" />
            </FieldShell>
          </div>
        </Card>

        <Card
          title="Hero slides"
          description="The large banner at the top. Use a wide photo for desktop and, ideally, a portrait crop for phones."
          actions={
            <Btn size="sm" onClick={() => update({ heroSlides: [...content.heroSlides, { ...DEFAULT_HOMEPAGE.heroSlides[0], id: `hero-${uid()}`, heading: "New slide", image: null, mobileImage: null }] })}>
              <Plus className="size-3.5" /> Add slide
            </Btn>
          }
        >
          <div className="space-y-6">
            {content.heroSlides.map((s, i) => (
              <div key={s.id} className="bg-ink p-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold text-white">Slide {i + 1}</p>
                  <div className="flex items-center gap-1">
                    <Toggle checked={s.enabled} onChange={(v) => setSlide(i, { enabled: v })} label="Enabled" />
                    <Btn size="sm" variant="ghost" onClick={() => update({ heroSlides: move(content.heroSlides, i, -1) })} aria-label="Move up"><ArrowUp className="size-4" /></Btn>
                    <Btn size="sm" variant="ghost" onClick={() => update({ heroSlides: move(content.heroSlides, i, 1) })} aria-label="Move down"><ArrowDown className="size-4" /></Btn>
                    <Btn size="sm" variant="ghost" onClick={() => update({ heroSlides: content.heroSlides.filter((_, j) => j !== i) })} aria-label="Remove slide" disabled={content.heroSlides.length === 1}><Trash2 className="size-4" /></Btn>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-4">
                    <FieldShell label="Small line above heading">
                      <TextInput value={s.eyebrow} onChange={(e) => setSlide(i, { eyebrow: e.target.value })} />
                    </FieldShell>
                    <FieldShell label="Heading" hint="The second half is shown in red. Use a line break to choose where it splits.">
                      <TextArea value={s.heading} onChange={(e) => setSlide(i, { heading: e.target.value })} rows={2} className="min-h-0" />
                    </FieldShell>
                    <FieldShell label="Text">
                      <TextArea value={s.body} onChange={(e) => setSlide(i, { body: e.target.value })} rows={3} />
                    </FieldShell>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldShell label="Main button">
                        <TextInput value={s.primaryCta.label} onChange={(e) => setSlide(i, { primaryCta: { ...s.primaryCta, label: e.target.value } })} />
                      </FieldShell>
                      <FieldShell label="Main button link">
                        <TextInput value={s.primaryCta.href} onChange={(e) => setSlide(i, { primaryCta: { ...s.primaryCta, href: e.target.value } })} />
                      </FieldShell>
                      <FieldShell label="Second button" hint="Leave empty to hide">
                        <TextInput value={s.secondaryCta?.label ?? ""} onChange={(e) => setSlide(i, { secondaryCta: e.target.value ? { label: e.target.value, href: s.secondaryCta?.href ?? "/collections" } : null })} />
                      </FieldShell>
                      <FieldShell label="Second button link">
                        <TextInput value={s.secondaryCta?.href ?? ""} onChange={(e) => setSlide(i, { secondaryCta: s.secondaryCta ? { ...s.secondaryCta, href: e.target.value } : null })} disabled={!s.secondaryCta} />
                      </FieldShell>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <ImageField label="Desktop image" value={s.image} onChange={(img) => setSlide(i, { image: img })} folder="content/hero" aspect="aspect-[16/9]" hint="At least 2400 × 1350. Keep the left side calm — text sits there." />
                    <div className="grid grid-cols-[120px_1fr] gap-4">
                      <ImageField label="Phone image" value={s.mobileImage} onChange={(img) => setSlide(i, { mobileImage: img })} folder="content/hero" aspect="aspect-[9/16]" />
                      <div className="space-y-3 pt-6">
                        <FieldShell label={`Focus left/right (${s.focusX}%)`}>
                          <input type="range" min={0} max={100} value={s.focusX} onChange={(e) => setSlide(i, { focusX: Number(e.target.value) })} className="w-full accent-[var(--color-red)]" />
                        </FieldShell>
                        <FieldShell label={`Focus up/down (${s.focusY}%)`}>
                          <input type="range" min={0} max={100} value={s.focusY} onChange={(e) => setSlide(i, { focusY: Number(e.target.value) })} className="w-full accent-[var(--color-red)]" />
                        </FieldShell>
                        <p className="text-xs text-steel">Keeps the subject in frame when the photo is cropped on phones.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Promotional banners"
          description="Large editorial banners: New Season Jerseys, Elite Football Boots and so on. The first one is full width."
          actions={
            <Btn size="sm" onClick={() => update({ promos: [...content.promos, { id: `promo-${uid()}`, eyebrow: "", title: "New banner", body: "", ctaLabel: "Shop now", href: "/shop", image: null, enabled: true }] })}>
              <Plus className="size-3.5" /> Add banner
            </Btn>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {content.promos.map((p, i) => (
              <div key={p.id} className="space-y-3 bg-ink p-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
                <div className="flex items-center justify-between">
                  <Toggle checked={p.enabled} onChange={(v) => setPromo(i, { enabled: v })} label={p.title || `Banner ${i + 1}`} />
                  <div className="flex">
                    <Btn size="sm" variant="ghost" onClick={() => update({ promos: move(content.promos, i, -1) })} aria-label="Move up"><ArrowUp className="size-4" /></Btn>
                    <Btn size="sm" variant="ghost" onClick={() => update({ promos: move(content.promos, i, 1) })} aria-label="Move down"><ArrowDown className="size-4" /></Btn>
                    <Btn size="sm" variant="ghost" onClick={() => update({ promos: content.promos.filter((_, j) => j !== i) })} aria-label="Remove banner"><Trash2 className="size-4" /></Btn>
                  </div>
                </div>
                <ImageField label="Image" value={p.image} onChange={(img) => setPromo(i, { image: img })} folder="content/promos" aspect="aspect-[16/7]" />
                <div className="grid grid-cols-2 gap-3">
                  <FieldShell label="Small line">
                    <TextInput value={p.eyebrow} onChange={(e) => setPromo(i, { eyebrow: e.target.value })} />
                  </FieldShell>
                  <FieldShell label="Title">
                    <TextInput value={p.title} onChange={(e) => setPromo(i, { title: e.target.value })} />
                  </FieldShell>
                  <FieldShell label="Text" className="col-span-2">
                    <TextInput value={p.body} onChange={(e) => setPromo(i, { body: e.target.value })} />
                  </FieldShell>
                  <FieldShell label="Button">
                    <TextInput value={p.ctaLabel} onChange={(e) => setPromo(i, { ctaLabel: e.target.value })} />
                  </FieldShell>
                  <FieldShell label="Link">
                    <TextInput value={p.href} onChange={(e) => setPromo(i, { href: e.target.value })} placeholder="/collections/new-season" />
                  </FieldShell>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Section order" description="Drag-free ordering: use the arrows. Hidden sections don’t appear.">
            <ul className="divide-y divide-line">
              {content.sectionOrder.map((k, i) => (
                <li key={k} className="flex items-center gap-3 py-2">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => update({ sectionOrder: move(content.sectionOrder, i, -1) })} disabled={i === 0} className="text-steel hover:text-white disabled:opacity-20" aria-label={`Move ${SECTION_LABELS[k]} up`}>
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" onClick={() => update({ sectionOrder: move(content.sectionOrder, i, 1) })} disabled={i === content.sectionOrder.length - 1} className="text-steel hover:text-white disabled:opacity-20" aria-label={`Move ${SECTION_LABELS[k]} down`}>
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                  <span className="flex-1 text-sm text-white">{SECTION_LABELS[k]}</span>
                  <Toggle
                    checked={!content.hiddenSections.includes(k)}
                    onChange={(v) => update({ hiddenSections: v ? content.hiddenSections.filter((x) => x !== k) : [...content.hiddenSections, k] })}
                    label="Visible"
                  />
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-6">
            <Card title="Category tiles order">
              <ul className="divide-y divide-line">
                {orderedCats.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3 py-2">
                    <div className="flex flex-col">
                      <button type="button" onClick={() => update({ categoryOrder: move(orderedCats.map((x) => x.id), i, -1) })} disabled={i === 0} className="text-steel hover:text-white disabled:opacity-20" aria-label={`Move ${c.name} up`}>
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" onClick={() => update({ categoryOrder: move(orderedCats.map((x) => x.id), i, 1) })} disabled={i === orderedCats.length - 1} className="text-steel hover:text-white disabled:opacity-20" aria-label={`Move ${c.name} down`}>
                        <ArrowDown className="size-4" />
                      </button>
                    </div>
                    <span className="text-sm text-white">{c.name}</span>
                    {!c.visible && <span className="text-xs text-steel">(hidden)</span>}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Featured collections" description="Shown under Featured on the homepage.">
              <div className="space-y-2">
                {collections.data.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={content.featuredCollectionIds.includes(c.id)}
                      onChange={(e) => update({ featuredCollectionIds: e.target.checked ? [...content.featuredCollectionIds, c.id] : content.featuredCollectionIds.filter((x) => x !== c.id) })}
                      className="size-4 accent-[var(--color-red)]"
                    />
                    {c.title}
                  </label>
                ))}
                {collections.data.length === 0 && <p className="text-sm text-steel">Create collections first.</p>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
