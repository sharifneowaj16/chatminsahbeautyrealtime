'use client';

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Settings2,
  ShieldAlert,
} from 'lucide-react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  getEnabledPaymentMethodConfigs,
  PAYMENT_METHOD_CONFIG,
} from '@/lib/payments/payment-methods';
import { getSiteConfig } from '@/lib/site-config';
import DeliveryMessageSettings from './DeliveryMessageSettings';

function ValueRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/[0.08] py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="text-sm font-semibold text-[#8A8F98]">{label}</dt>
      <dd className="break-all text-sm font-medium text-[#F7F8F8] sm:text-right">
        {value || <span className="text-amber-700">Not configured</span>}
      </dd>
    </div>
  );
}

export default function SettingsPage() {
  const { hasPermission } = useAdminAuth();
  const site = getSiteConfig();
  const enabledPayments = getEnabledPaymentMethodConfigs();
  const disabledPayments = Object.values(PAYMENT_METHOD_CONFIG).filter((method) => !method.enabled);

  if (!hasPermission(PERMISSIONS.SETTINGS_VIEW)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">You do not have permission to view settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#151516] border border-white/[0.08] text-white">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-[#F7F8F8]">Effective store configuration</h1>
            <p className="mt-1 text-sm text-[#8A8F98]">
              This page shows the values currently used by the public storefront.
            </p>
          </div>
        </div>
      </header>

      {/* ── Product Delivery Top-Bar Messages (Interactive Config) ── */}
      <DeliveryMessageSettings />

      <div className="rounded-2xl border border-amber-800/40 bg-amber-950/30 p-4 text-amber-300">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Configuration is deployment-managed</p>
            <p className="mt-1 text-sm leading-6">
              The previous controls only changed temporary browser state and displayed a false “saved” message. They have been replaced with this read-only view so administrators cannot believe production settings were updated when they were not.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-[#151516] p-5 shadow-sm" aria-labelledby="store-identity-heading">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-white" aria-hidden="true" />
            <h2 id="store-identity-heading" className="text-lg font-black text-[#F7F8F8]">Store identity</h2>
          </div>
          <dl className="mt-4">
            <ValueRow label="Site name" value={site.identity.name} />
            <ValueRow label="Tagline" value={site.identity.tagline} />
            <ValueRow label="Currency" value={site.identity.currency} />
            <ValueRow label="Timezone" value={site.identity.timezone} />
            <ValueRow label="Locale" value={site.identity.locale} />
          </dl>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#151516] p-5 shadow-sm" aria-labelledby="business-contact-heading">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-white" aria-hidden="true" />
            <h2 id="business-contact-heading" className="text-lg font-black text-[#F7F8F8]">Business contact</h2>
          </div>
          <dl className="mt-4">
            <ValueRow label="Support email" value={site.business.supportEmail} />
            <ValueRow label="Support phone" value={site.business.supportPhone} />
            <ValueRow label="WhatsApp number" value={site.business.whatsappNumber} />
            <ValueRow label="Support hours" value={site.business.supportHours} />
            <ValueRow label="Business address" value={site.business.businessAddress} />
          </dl>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#151516] p-5 shadow-sm" aria-labelledby="payment-config-heading">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-white" aria-hidden="true" />
            <h2 id="payment-config-heading" className="text-lg font-black text-[#F7F8F8]">Payment methods</h2>
          </div>
          <div className="mt-4 space-y-3">
            {enabledPayments.map((method) => (
              <div key={method.id} className="flex items-center justify-between rounded-xl border border-emerald-800/40 bg-emerald-950/30 px-4 py-3">
                <span className="font-semibold text-[#F7F8F8]">{method.label}</span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-white">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Enabled
                </span>
              </div>
            ))}
            {disabledPayments.map((method) => (
              <div key={method.id} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#08090A] px-4 py-3">
                <span className="font-semibold text-[#8A8F98]">{method.label}</span>
                <span className="text-sm font-semibold text-[#62666D]">Disabled</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#151516] p-5 shadow-sm" aria-labelledby="social-config-heading">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-white" aria-hidden="true" />
            <h2 id="social-config-heading" className="text-lg font-black text-[#F7F8F8]">Public channels</h2>
          </div>
          <div className="mt-4 space-y-3">
            {site.socialLinks.length ? (
              site.socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-center justify-between rounded-xl border border-white/[0.08] bg-[#08090A] px-4 py-3 text-sm font-semibold text-[#F7F8F8] transition hover:border-white/[0.15] hover:bg-[#1C1D1F]"
                >
                  {social.label}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ))
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No verified public social URL is configured.
              </p>
            )}
            {site.business.whatsappUrl ? (
              <a
                href={site.business.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center justify-between rounded-xl border border-white/[0.08] bg-[#08090A] px-4 py-3 text-sm font-semibold text-[#F7F8F8] transition hover:border-white/[0.15] hover:bg-[#1C1D1F]"
              >
                WhatsApp support
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#151516] p-5 shadow-sm" aria-labelledby="source-of-truth-heading">
        <h2 id="source-of-truth-heading" className="text-lg font-black text-[#F7F8F8]">Configuration source of truth</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Mail, label: 'Contact', value: 'NEXT_PUBLIC_SUPPORT_*' },
            { icon: MapPin, label: 'Address', value: 'NEXT_PUBLIC_BUSINESS_ADDRESS' },
            { icon: Phone, label: 'Social/support', value: 'NEXT_PUBLIC_* URL values' },
            { icon: Clock3, label: 'Runtime', value: '.env + deployment secrets' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl bg-[#08090A] border border-white/[0.08] p-4">
              <Icon className="h-5 w-5 text-white" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold text-[#F7F8F8]">{label}</p>
              <p className="mt-1 break-all text-xs leading-5 text-[#8A8F98]">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
