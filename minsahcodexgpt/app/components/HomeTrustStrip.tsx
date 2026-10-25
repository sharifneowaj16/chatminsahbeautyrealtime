import React from 'react';
import {
  TruckLineIcon,
  VerifiedBadgeLineIcon,
  BankCard2LineIcon,
  CustomerService2LineIcon,
  CashLineIcon,
} from '@/components/ui/icons/RemixIcons';

const trustItems = [
  { label: 'Fast Delivery', icon: TruckLineIcon },
  { label: '100% Authentic', icon: VerifiedBadgeLineIcon },
  { label: 'Cash on Delivery', icon: CashLineIcon },
  { label: 'Secure Payment', icon: BankCard2LineIcon },
  { label: '24/7 Concierge', icon: CustomerService2LineIcon },
];

export default function HomeTrustStrip() {
  return (
    <section className="bg-white px-4 py-3 sm:py-4 lg:px-6">
      <div className="mx-auto max-w-7xl overflow-x-auto rounded-2xl border border-stone-200/60 bg-gradient-to-r from-stone-50 via-white to-stone-50 p-2 sm:p-2.5 scrollbar-hide shadow-xs">
        <div className="flex min-w-max items-center gap-2 sm:grid sm:min-w-0 sm:grid-cols-5">
          {trustItems.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex min-w-[130px] items-center gap-2 rounded-xl bg-white px-3 py-2 border border-stone-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-minsah-accent/60 transition-all hover:-translate-y-0.5 sm:min-w-0"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-minsah-accent/20 text-minsah-primary">
                <Icon size={17} />
              </span>
              <span className="text-[11px] font-bold tracking-tight text-minsah-dark sm:text-xs">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
