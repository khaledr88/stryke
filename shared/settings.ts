import { DEFAULT_HOMEPAGE, DEFAULT_SETTINGS } from "./defaults";
import type { HomepageContent, StoreSettings } from "./types";

/** Fills gaps in a stored settings document with defaults (schema evolves over time). */
export function mergeSettings(raw: Partial<StoreSettings> | undefined | null): StoreSettings {
  const s = raw ?? {};
  const zones = s.delivery?.zones?.length ? s.delivery.zones : DEFAULT_SETTINGS.delivery.zones;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    contact: { ...DEFAULT_SETTINGS.contact, ...(s.contact ?? {}) },
    social: { ...DEFAULT_SETTINGS.social, ...(s.social ?? {}) },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...(s.delivery ?? {}), zones },
    payments: { cod: { ...DEFAULT_SETTINGS.payments.cod, ...(s.payments?.cod ?? {}) } },
    inventory: { ...DEFAULT_SETTINGS.inventory, ...(s.inventory ?? {}) },
    orders: { ...DEFAULT_SETTINGS.orders, ...(s.orders ?? {}) },
    policies: { ...DEFAULT_SETTINGS.policies, ...(s.policies ?? {}) },
  };
}

export function mergeHomepage(raw: Partial<HomepageContent> | undefined | null): HomepageContent {
  const h = raw ?? {};
  const sectionOrder = h.sectionOrder?.length ? h.sectionOrder : DEFAULT_HOMEPAGE.sectionOrder;
  // Make sure new section types added in code appear even on older stored documents.
  const missing = DEFAULT_HOMEPAGE.sectionOrder.filter((k) => !sectionOrder.includes(k));
  return {
    ...DEFAULT_HOMEPAGE,
    ...h,
    announcement: { ...DEFAULT_HOMEPAGE.announcement, ...(h.announcement ?? {}) },
    heroSlides: h.heroSlides ?? DEFAULT_HOMEPAGE.heroSlides,
    promos: h.promos ?? DEFAULT_HOMEPAGE.promos,
    sectionOrder: [...sectionOrder, ...missing],
    hiddenSections: h.hiddenSections ?? [],
    categoryOrder: h.categoryOrder?.length ? h.categoryOrder : DEFAULT_HOMEPAGE.categoryOrder,
    featuredCollectionIds: h.featuredCollectionIds ?? [],
  };
}
