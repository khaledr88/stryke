import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { formatPhoneForDisplay, whatsappLink } from "@shared/phone";
import { Breadcrumbs, PageHeader } from "@/components/catalog/Catalog";
import { Container } from "@/components/home/SectionHeading";
import { SizeTable } from "@/components/product/SizeGuide";
import { RichText } from "@/components/ui/RichText";
import { getSettings } from "@/lib/server/catalog";

const PAGES = {
  about: "About STRYKE",
  shipping: "Shipping policy",
  returns: "Return policy",
  privacy: "Privacy policy",
  terms: "Terms and conditions",
  contact: "Contact us",
  "size-guide": "Size guide",
} as const;
type PageKey = keyof typeof PAGES;

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  if (!(page in PAGES)) return { title: "Not found" };
  return { title: PAGES[page as PageKey], alternates: { canonical: `/info/${page}` } };
}

export default async function InfoPage({ params }: Props) {
  const { page } = await params;
  if (!(page in PAGES)) notFound();
  const key = page as PageKey;
  const settings = await getSettings();
  const title = PAGES[key];
  const crumbs = <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />;

  if (key === "size-guide") {
    return (
      <>
        <PageHeader title={title} intro="General measurements to help you choose. Fit varies by brand — ask us on WhatsApp if you’re unsure." eyebrow={crumbs} />
        <Container className="max-w-4xl pt-10">
          <SizeTable type="all" />
        </Container>
      </>
    );
  }

  if (key === "contact") {
    const c = settings.contact;
    const wa = c.whatsapp ? whatsappLink(c.whatsapp, "Hi STRYKE, I have a question.") : null;
    const rows = [
      wa && { icon: MessageCircle, label: "WhatsApp", value: formatPhoneForDisplay(c.whatsapp) || c.whatsapp, href: wa },
      c.phone && { icon: Phone, label: "Phone", value: formatPhoneForDisplay(c.phone) || c.phone, href: `tel:${c.phone}` },
      c.email && { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
      c.address && { icon: MapPin, label: "Store", value: c.address, href: c.mapUrl || undefined },
      c.hours && { icon: Clock, label: "Hours", value: c.hours },
    ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string }[];
    return (
      <>
        <PageHeader title={title} intro="Questions about sizing, stock or your order? We’re happy to help." eyebrow={crumbs} />
        <Container className="max-w-3xl pt-10">
          {rows.length === 0 ? (
            <p className="text-steel">Contact details will appear here soon.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {rows.map((r) => (
                <li key={r.label} className="flex items-center gap-4 py-5">
                  <r.icon className="size-6 text-silver" strokeWidth={1.5} />
                  <div>
                    <p className="label text-[0.7rem] text-steel">{r.label}</p>
                    {r.href ? (
                      <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-lg text-white hover:underline">
                        {r.value}
                      </a>
                    ) : (
                      <p className="text-lg text-white">{r.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </>
    );
  }

  const text = settings.policies[key];
  if (!text) notFound();
  return (
    <>
      <PageHeader title={title} eyebrow={crumbs} />
      <Container className="max-w-3xl pt-10">
        <RichText text={text} />
      </Container>
    </>
  );
}
