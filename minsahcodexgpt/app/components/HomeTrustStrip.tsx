import { Banknote, RotateCcw, ShieldCheck, Truck, BadgeCheck } from 'lucide-react';

const trustItems = [
  { label: 'Fast Delivery', icon: Truck },
  { label: 'Authentic Products', icon: BadgeCheck },
  { label: 'Secure Payment', icon: ShieldCheck },
  { label: 'Easy Return', icon: RotateCcw },
  { label: 'Cash on Delivery', icon: Banknote },
];

export default function HomeTrustStrip() {
  return (
    <section className="bg-white px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-7xl overflow-x-auto rounded-2xl border border-minsah-accent bg-minsah-light/70 p-3 scrollbar-hide">
        <div className="flex min-w-max items-center gap-3 sm:grid sm:min-w-0 sm:grid-cols-5">
          {trustItems.map(({ label, icon: Icon }) => (
            <div key={label} className="minsah-tap-target flex min-w-[150px] items-center gap-2 rounded-xl bg-white px-3 py-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md sm:min-w-0">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-minsah-accent text-minsah-primary">
                <Icon size={18} />
              </span>
              <span className="text-xs font-bold leading-4 text-minsah-dark sm:text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
