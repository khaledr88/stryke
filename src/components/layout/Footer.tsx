import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { InstagramIcon } from "@/components/ui/BrandIcons";
import { formatPhoneForDisplay, whatsappLink } from "@shared/phone";
import type { Category, StoreSettings } from "@shared/types";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { truncate } from "@shared/text";

const POLICY_LINKS = [
  { key: "shipping", label: "Shipping policy" },
  { key: "returns", label: "Return policy" },
  { key: "privacy", label: "Privacy policy" },
  { key: "terms", label: "Terms and conditions" },
] as const;

export function Footer({ settings, categories }: { settings: StoreSettings; categories: Category[] }) {
  const wa = settings.contact.whatsapp ? whatsappLink(settings.contact.whatsapp) : null;
  const about = settings.policies.about ? truncate(settings.policies.about.replace(/[#*_>-]/g, "").replace(/\s+/g, " "), 220) : null;
  const instagram = settings.social.instagram;

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line bg-ink pb-[calc(88px+var(--safe-bottom))] lg:pb-0">
      <LogoMark className="pointer-events-none absolute -right-24 -bottom-24 h-auto w-[520px] opacity-[0.035]" sizes="520px" />
      <div className="relative mx-auto grid max-w-[1600px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr] lg:px-10">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-auto" sizes="60px" />
            <Wordmark className="h-6 w-auto" sizes="200px" />
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-steel">
            {about ?? `${settings.storeName} — ${settings.tagline}. Delivered across Lebanon, cash on delivery.`}
          </p>
          {settings.policies.about && (
            <Link href="/info/about" className="mt-3 inline-block text-sm text-silver underline-offset-4 hover:text-white hover:underline">
              About STRYKE
            </Link>
          )}
          <div className="mt-6 flex gap-2">
            {instagram && (
              <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="STRYKE on Instagram" className="grid size-11 place-items-center text-silver shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-white">
                <InstagramIcon className="size-5" />
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat with STRYKE on WhatsApp" className="grid size-11 place-items-center text-silver shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-white">
                <MessageCircle className="size-5" />
              </a>
            )}
          </div>
        </div>

        <FooterColumn title="Shop">
          {categories.map((c) => (
            <FooterLink key={c.id} href={`/category/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
          <FooterLink href="/collections/sale">Sale</FooterLink>
        </FooterColumn>

        <FooterColumn title="Explore">
          <FooterLink href="/clubs">Clubs</FooterLink>
          <FooterLink href="/brands">Brands</FooterLink>
          <FooterLink href="/collections">Collections</FooterLink>
          <FooterLink href="/shop?sort=newest">New arrivals</FooterLink>
          <FooterLink href="/wishlist">Saved items</FooterLink>
        </FooterColumn>

        <FooterColumn title="Help">
          <FooterLink href="/info/contact">Contact us</FooterLink>
          <FooterLink href="/info/size-guide">Size guide</FooterLink>
          {POLICY_LINKS.filter((p) => settings.policies[p.key]).map((p) => (
            <FooterLink key={p.key} href={`/info/${p.key}`}>
              {p.label}
            </FooterLink>
          ))}
          <div className="mt-5 space-y-2.5 text-sm text-steel">
            {settings.contact.phone && (
              <a href={`tel:${settings.contact.phone}`} className="flex items-center gap-2 hover:text-white">
                <Phone className="size-4" /> {formatPhoneForDisplay(settings.contact.phone) || settings.contact.phone}
              </a>
            )}
            {settings.contact.email && (
              <a href={`mailto:${settings.contact.email}`} className="flex items-center gap-2 hover:text-white">
                <Mail className="size-4" /> {settings.contact.email}
              </a>
            )}
            {settings.contact.address && (
              <a
                href={settings.contact.mapUrl || undefined}
                target={settings.contact.mapUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-start gap-2 hover:text-white"
              >
                <MapPin className="mt-0.5 size-4 shrink-0" /> {settings.contact.address}
              </a>
            )}
          </div>
        </FooterColumn>
      </div>
      <div className="relative border-t border-line">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-6 text-xs text-steel sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
          <p>Prices in {settings.currency}. Cash on delivery across Lebanon.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="label mb-5 text-white">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-steel transition-colors hover:text-white">
        {children}
      </Link>
    </li>
  );
}
