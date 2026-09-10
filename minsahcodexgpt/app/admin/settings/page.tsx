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
    <div className="flex flex-col gap-1 border-b border-[#1b1e2c] py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="text-xs font-medium text-[#8a8f98]">{label}</dt>
      <dd className="break-all text-xs font-medium text-[#f7f8f8] sm:text-right">
        {value || <span className="text-amber-500/80">Not configured</span>}
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
        <p className="text-[#8a8f98] text-sm">You do not have permission to view settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-[1400px]">
      <header className="pb-2 border-b border-[#232636]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#161824] border border-[#232636] text-[#5e6ad2] shadow-xs">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight">Effective store configuration</h1>
            <p className="text-xs text-[#8a8f98] mt-0.5">
              Production configuration values currently serving the storefront.
            </p>
          </div>
        </div>
      </header>

      {/* ── Product Delivery Top-Bar Messages (Interactive Config) ── */}
      <DeliveryMessageSettings />

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-300">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <div>
            <p className="font-semibold text-xs">Configuration is deployment-managed</p>
            <p className="mt-1 text-xs leading-5 text-amber-200/80">
              Settings below reflect deployment environment variables (`.env`). They are displayed in read-only mode to prevent configuration drift.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-[#232636] bg-[#161824] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]" aria-labelledby="store-identity-heading">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1b1e2c]">
            <Globe2 className="h-4 w-4 text-[#5e6ad2]" aria-hidden="true" />
            <h2 id="store-identity-heading" className="text-sm font-semibold text-[#f7f8f8]">Store identity</h2>
          </div>
          <dl className="mt-2">
            <ValueRow label="Site name" value={site.identity.name} />
            <ValueRow label="Tagline" value={site.identity.tagline} />
            <ValueRow label="Currency" value={site.identity.currency} />
            <ValueRow label="Timezone" value={site.identity.timezone} />
            <ValueRow label="Locale" value={site.identity.locale} />
          </dl>
        </section>

        <section className="rounded-xl border border-[#232636] bg-[#161824] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]" aria-labelledby="business-contact-heading">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1b1e2c]">
            <Mail className="h-4 w-4 text-[#5e6ad2]" aria-hidden="true" />
            <h2 id="business-contact-heading" className="text-sm font-semibold text-[#f7f8f8]">Business contact</h2>
          </div>
          <dl className="mt-2">
            <ValueRow label="Support email" value={site.business.supportEmail} />
            <ValueRow label="Support phone" value={site.business.supportPhone} />
            <ValueRow label="WhatsApp number" value={site.business.whatsappNumber} />
            <ValueRow label="Support hours" value={site.business.supportHours} />
            <ValueRow label="Business address" value={site.business.businessAddress} />
          </dl>
        </section>

        <section className="rounded-xl border border-[#232636] bg-[#161824] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]" aria-labelledby="payment-config-heading">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1b1e2c]">
            <CreditCard className="h-4 w-4 text-[#5e6ad2]" aria-hidden="true" />
            <h2 id="payment-config-heading" className="text-sm font-semibold text-[#f7f8f8]">Payment methods</h2>
          </div>
          <div className="mt-3 space-y-2">
            {enabledPayments.map((method) => (
              <div key={method.id} className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5">
                <span className="text-xs font-medium text-[#f7f8f8]">{method.label}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Enabled
                </span>
              </div>
            ))}
            {disabledPayments.map((method) => (
              <div key={method.id} className="flex items-center justify-between rounded-lg border border-[#232636] bg-[#10121b] px-3.5 py-2.5">
                <span className="text-xs font-medium text-[#8a8f98]">{method.label}</span>
                <span className="text-[11px] font-mono text-[#8a8f98]/60">Disabled</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#232636] bg-[#161824] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]" aria-labelledby="social-config-heading">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1b1e2c]">
            <MessageCircle className="h-4 w-4 text-[#5e6ad2]" aria-hidden="true" />
            <h2 id="social-config-heading" className="text-sm font-semibold text-[#f7f8f8]">Public channels</h2>
          </div>
          <div className="mt-3 space-y-2">
            {site.socialLinks.length ? (
              site.socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-10 items-center justify-between rounded-lg border border-[#232636] bg-[#10121b] px-3.5 py-2 text-xs font-medium text-[#f7f8f8] transition hover:border-[#5e6ad2]/40 hover:bg-white/[0.04]"
                >
                  {social.label}
                  <ExternalLink className="h-3.5 w-3.5 text-[#8a8f98]" aria-hidden="true" />
                </a>
              ))
            ) : (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300">
                No verified public social URL is configured.
              </p>
            )}
            {site.business.whatsappUrl ? (
              <a
                href={site.business.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-10 items-center justify-between rounded-lg border border-[#232636] bg-[#10121b] px-3.5 py-2 text-xs font-medium text-[#f7f8f8] transition hover:border-[#5e6ad2]/40 hover:bg-white/[0.04]"
              >
                WhatsApp support
                <ExternalLink className="h-3.5 w-3.5 text-[#8a8f98]" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#232636] bg-[#161824] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]" aria-labelledby="source-of-truth-heading">
        <h2 id="source-of-truth-heading" className="text-sm font-semibold text-[#f7f8f8] pb-2 border-b border-[#1b1e2c]">Configuration source of truth</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Mail, label: 'Contact', value: 'NEXT_PUBLIC_SUPPORT_*' },
            { icon: MapPin, label: 'Address', value: 'NEXT_PUBLIC_BUSINESS_ADDRESS' },
            { icon: Phone, label: 'Social/support', value: 'NEXT_PUBLIC_* URL values' },
            { icon: Clock3, label: 'Runtime', value: '.env + deployment secrets' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-lg bg-[#10121b] border border-[#232636] p-3.5">
              <Icon className="h-4 w-4 text-[#5e6ad2]" aria-hidden="true" />
              <p className="mt-2 text-xs font-medium text-[#f7f8f8]">{label}</p>
              <p className="mt-0.5 break-all text-[11px] font-mono text-[#8a8f98]">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
