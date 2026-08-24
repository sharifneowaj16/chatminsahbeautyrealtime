import Link from 'next/link';
import {
  CreditCard,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Truck,
  Youtube,
} from 'lucide-react';
import NewsletterPreferenceCard from '@/components/newsletter/NewsletterPreferenceCard';
import { getEnabledPaymentMethodLabels } from '@/lib/payments/payment-methods';
import { getSiteConfig } from '@/lib/site-config';

const socialIcons = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  telegram: Send,
} as const;

export default function SiteFooter() {
  const site = getSiteConfig();
  const { business, identity } = site;
  const payments = getEnabledPaymentMethodLabels();

  return (
    <footer className="border-t border-minsah-accent/20 bg-minsah-dark text-minsah-light">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.8fr_1.15fr]">
          <section aria-labelledby="footer-brand-heading">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-minsah-accent text-lg font-bold text-minsah-primary">
                M
              </span>
              <div>
                <h2 id="footer-brand-heading" className="text-xl font-bold">
                  {identity.name}
                </h2>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-minsah-accent/80">
                  {identity.tagline}
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm font-normal leading-relaxed text-minsah-light/80">
              {identity.description}
            </p>
            <div className="mt-5 grid max-w-md gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-medium">
                <ShieldCheck size={16} className="text-minsah-accent" aria-hidden="true" /> Authentic products
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-medium">
                <Truck size={16} className="text-minsah-accent" aria-hidden="true" /> Nationwide delivery
              </div>
            </div>
            <NewsletterPreferenceCard />
          </section>

          <nav aria-labelledby="footer-shop-heading">
            <h2 id="footer-shop-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-minsah-accent">
              Shop
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {site.shopLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center text-minsah-light/80 transition hover:text-white focus-visible:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-help-heading">
            <h2 id="footer-help-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-minsah-accent">
              Help
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {site.helpLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center text-minsah-light/80 transition hover:text-white focus-visible:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-minsah-accent">
              Contact
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-minsah-light/80">
              <li className="flex items-start gap-3 py-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-minsah-accent" aria-hidden="true" />
                <span>{business.businessAddress || 'Online store serving customers across Bangladesh'}</span>
              </li>
              {business.supportPhone && business.supportPhoneHref ? (
                <li>
                  <a
                    href={business.supportPhoneHref}
                    className="inline-flex min-h-11 items-center gap-3 transition hover:text-white focus-visible:text-white"
                  >
                    <Phone className="h-4 w-4 text-minsah-accent" aria-hidden="true" />
                    {business.supportPhone}
                  </a>
                </li>
              ) : null}
              <li>
                <a
                  href={`mailto:${business.supportEmail}`}
                  className="inline-flex min-h-11 items-center gap-3 break-all transition hover:text-white focus-visible:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-minsah-accent" aria-hidden="true" />
                  {business.supportEmail}
                </a>
              </li>
              {business.whatsappUrl ? (
                <li>
                  <a
                    href={business.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-3 transition hover:text-white focus-visible:text-white"
                  >
                    <MessageCircle className="h-4 w-4 text-minsah-accent" aria-hidden="true" />
                    WhatsApp support
                  </a>
                </li>
              ) : null}
              {business.supportHours ? (
                <li className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs leading-5 text-minsah-light/70">
                  Support hours: {business.supportHours}
                </li>
              ) : null}
            </ul>

            {site.socialLinks.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2" aria-label="Minsah Beauty social links">
                {site.socialLinks.map((social) => {
                  const Icon = socialIcons[social.id as keyof typeof socialIcons];
                  if (!Icon) return null;
                  return (
                    <a
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${identity.name} on ${social.label}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-minsah-accent hover:text-minsah-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Icon size={18} aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-minsah-accent">
              <CreditCard size={17} aria-hidden="true" /> Payment methods
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {payments.map((payment) => (
                <span
                  key={payment}
                  className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-minsah-light/90"
                >
                  {payment}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-minsah-light/[0.65]">
            © {new Date().getFullYear()} {identity.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
