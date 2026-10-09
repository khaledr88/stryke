import { whatsappLink } from "@shared/phone";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { Header, type NavItem } from "@/components/layout/Header";
import { StoreChrome } from "@/components/layout/StoreChrome";
import { getBrands, getClubs, getHomepage, getNavigation } from "@/lib/server/catalog";

// Pages render per request from tag-cached Firestore data, so admin changes
// appear as soon as /api/revalidate is called — no rebuild or redeploy.
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [{ categories, allCategories, settings }, homepage, clubs, brands] = await Promise.all([
    getNavigation(),
    getHomepage(),
    getClubs(),
    getBrands(),
  ]);

  const nav: NavItem[] = [
    { label: "Home", href: "/" },
    ...categories.map((c) => ({ label: c.navLabel, href: `/category/${c.slug}` })),
    { label: "Clubs", href: "/clubs" },
    { label: "Brands", href: "/brands" },
    { label: "Collections", href: "/collections" },
  ];
  const secondary: NavItem[] = [
    ...allCategories.filter((c) => !c.showInNav).map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
    { label: "Sale", href: "/collections/sale" },
    { label: "Saved items", href: "/wishlist" },
    { label: "Size guide", href: "/info/size-guide" },
    { label: "Contact", href: "/info/contact" },
  ];
  const suggestions = [
    ...clubs.filter((c) => c.featured).map((c) => c.name),
    ...brands.map((b) => b.name),
    ...allCategories.map((c) => c.name),
  ];
  const whatsappUrl = settings.contact.whatsapp ? whatsappLink(settings.contact.whatsapp) : null;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      {homepage.announcement.enabled && homepage.announcement.text && (
        <AnnouncementBar text={homepage.announcement.text} href={homepage.announcement.href} />
      )}
      <Header items={nav} currency={settings.currency} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer settings={settings} categories={allCategories} />
      <StoreChrome nav={nav} secondary={secondary} suggestions={suggestions} whatsappUrl={whatsappUrl} />
    </>
  );
}
