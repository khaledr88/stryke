import { DEFAULT_LOW_STOCK_THRESHOLD, DEFAULT_MAX_QTY_PER_LINE, LEBANON_GOVERNORATES } from "./constants";
import type { Brand, Category, Club, HomepageContent, ProductCollection, StoreSettings } from "./types";
import { slugify } from "./text";

/**
 * Defaults used before the admin has saved anything, and as the initial seed.
 * Business facts (fees, phone numbers, policies) are intentionally empty:
 * the store owner fills them in from /admin/settings.
 */
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "STRYKE",
  tagline: "Football & Sportswear",
  contact: { phone: "", whatsapp: "", email: "", address: "", mapUrl: "", hours: "" },
  social: { instagram: "", facebook: "", tiktok: "" },
  currency: "USD",
  delivery: {
    zones: LEBANON_GOVERNORATES.map((g) => ({ id: slugify(g), governorate: g, fee: null, enabled: false, eta: "" })),
    freeDeliveryThreshold: null,
    note: "",
  },
  payments: { cod: { enabled: true, note: "Pay in cash when your order arrives." } },
  inventory: { lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD },
  orders: { maxQuantityPerLine: DEFAULT_MAX_QTY_PER_LINE, whatsappConfirmation: true },
  policies: { about: "", shipping: "", returns: "", privacy: "", terms: "" },
};

export const DEFAULT_HOMEPAGE: HomepageContent = {
  announcement: { enabled: false, text: "", href: "" },
  heroSlides: [
    {
      id: "hero-main",
      eyebrow: "Football lives here",
      heading: "More than a game",
      body: "Discover elite football jerseys, premium footwear, and performance sportswear. Built for those who live the game.",
      image: null,
      mobileImage: null,
      focusX: 50,
      focusY: 40,
      primaryCta: { label: "Shop now", href: "/shop" },
      secondaryCta: { label: "Explore collections", href: "/collections" },
      enabled: true,
    },
  ],
  sectionOrder: ["categories", "bestSellers", "brands", "clubs", "promos", "newArrivals", "featured"],
  hiddenSections: [],
  // Category document ids (the seed uses slugs as ids).
  categoryOrder: ["football-jerseys", "football-boots", "sportswear", "training-equipment", "accessories"],
  promos: [
    {
      id: "promo-jerseys",
      eyebrow: "New season",
      title: "New Season Jerseys",
      body: "Home, away and third kits for the clubs you follow.",
      ctaLabel: "Shop jerseys",
      href: "/category/football-jerseys",
      image: null,
      enabled: true,
    },
    {
      id: "promo-boots",
      eyebrow: "Firm ground. Fast feet.",
      title: "Elite Football Boots",
      body: "Top-tier boots for every surface and every position.",
      ctaLabel: "Shop boots",
      href: "/category/football-boots",
      image: null,
      enabled: true,
    },
    {
      id: "promo-training",
      eyebrow: "Train. Play. Belong.",
      title: "Training Essentials",
      body: "Balls, cones, bibs and the kit that gets you match-ready.",
      ctaLabel: "Shop training",
      href: "/category/training-equipment",
      image: null,
      enabled: true,
    },
    {
      id: "promo-limited",
      eyebrow: "While they last",
      title: "Limited Collections",
      body: "Small runs and special editions. When they're gone, they're gone.",
      ctaLabel: "Shop limited",
      href: "/collections/limited",
      image: null,
      enabled: true,
    },
  ],
  featuredCollectionIds: [],
};

type Seed<T> = Omit<T, "id">;

export const SEED_CATEGORIES: Seed<Category>[] = [
  {
    slug: "football-jerseys",
    name: "Football Jerseys",
    description: "Club and national team shirts for the new season and beyond.",
    image: null,
    navLabel: "Football",
    showInNav: true,
    defaultProductType: "jersey",
    sizePreset: "apparel",
    order: 1,
    visible: true,
  },
  {
    slug: "football-boots",
    name: "Football Boots",
    description: "Firm ground, artificial grass and indoor boots.",
    image: null,
    navLabel: "Footwear",
    showInNav: true,
    defaultProductType: "boots",
    sizePreset: "footwearEU",
    order: 3,
    visible: true,
  },
  {
    slug: "sportswear",
    name: "Sportswear",
    description: "Tracksuits, jackets, shorts and everyday athletic wear.",
    image: null,
    navLabel: "Sportswear",
    showInNav: true,
    defaultProductType: "apparel",
    sizePreset: "apparel",
    order: 2,
    visible: true,
  },
  {
    slug: "training-equipment",
    name: "Training Equipment",
    description: "Footballs, training aids and match-day kit.",
    image: null,
    navLabel: "Equipment",
    showInNav: true,
    defaultProductType: "equipment",
    sizePreset: "ball",
    order: 4,
    visible: true,
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Socks, shin guards, gloves, bags and more.",
    image: null,
    navLabel: "",
    showInNav: false,
    defaultProductType: "accessory",
    sizePreset: "oneSize",
    order: 5,
    visible: true,
  },
];

export const SEED_BRANDS: Seed<Brand>[] = ["Nike", "Adidas", "Puma", "New Balance", "Under Armour"].map((name, i) => ({
  slug: slugify(name),
  name,
  logo: null,
  image: null,
  description: "",
  order: i + 1,
  visible: true,
}));

export const SEED_CLUBS: Seed<Club>[] = (
  [
    ["Real Madrid", "RMA", "LaLiga", "Spain", "#FFFFFF", "#FEBE10"],
    ["FC Barcelona", "BAR", "LaLiga", "Spain", "#A50044", "#004D98"],
    ["Manchester United", "MUN", "Premier League", "England", "#DA291C", "#FBE122"],
    ["Manchester City", "MCI", "Premier League", "England", "#6CABDD", "#1C2C5B"],
    ["Liverpool", "LIV", "Premier League", "England", "#C8102E", "#00B2A9"],
    ["Arsenal", "ARS", "Premier League", "England", "#EF0107", "#063672"],
    ["Chelsea", "CHE", "Premier League", "England", "#034694", "#DBA111"],
    ["Paris Saint-Germain", "PSG", "Ligue 1", "France", "#004170", "#DA291C"],
    ["Bayern Munich", "FCB", "Bundesliga", "Germany", "#DC052D", "#0066B2"],
    ["Juventus", "JUV", "Serie A", "Italy", "#111111", "#FFFFFF"],
    ["Inter Milan", "INT", "Serie A", "Italy", "#0068A8", "#111111"],
    ["AC Milan", "MIL", "Serie A", "Italy", "#FB090B", "#111111"],
  ] as const
).map(([name, shortName, league, country, c1, c2], i) => ({
  slug: slugify(name === "Paris Saint-Germain" ? "psg" : name),
  name,
  shortName,
  league,
  country,
  crest: null,
  image: null,
  colors: [c1, c2] as [string, string],
  order: i + 1,
  visible: true,
  featured: i < 8,
}));

export const SEED_COLLECTIONS: Seed<ProductCollection>[] = [
  {
    slug: "new-season",
    title: "New Season Jerseys",
    subtitle: "The latest kits",
    description: "Every new home, away and third kit we stock for the current season.",
    image: null,
    rule: { tag: "new-season" },
    order: 1,
    visible: true,
  },
  {
    slug: "elite-boots",
    title: "Elite Football Boots",
    subtitle: "Top-tier performance",
    description: "Elite-level boots from the brands the pros wear.",
    image: null,
    rule: { tag: "elite" },
    order: 2,
    visible: true,
  },
  {
    slug: "training-essentials",
    title: "Training Essentials",
    subtitle: "Match-ready",
    description: "Everything you need for training sessions.",
    image: null,
    rule: { tag: "training" },
    order: 3,
    visible: true,
  },
  {
    slug: "limited",
    title: "Limited Collections",
    subtitle: "Small runs",
    description: "Special editions and limited releases.",
    image: null,
    rule: { isLimited: true },
    order: 4,
    visible: true,
  },
  {
    slug: "sale",
    title: "Sale",
    subtitle: "Reduced prices",
    description: "Products currently on sale.",
    image: null,
    rule: { onSale: true },
    order: 5,
    visible: true,
  },
];
