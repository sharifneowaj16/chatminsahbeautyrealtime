import { OffersMobileView } from '@/components/offers/mobile/OffersMobileView';
import Link from 'next/link';
import { Tag, Sparkles, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Offers & Promotions | Minsah Beauty',
  description: 'Exclusive vouchers, flash sales, and bundle savings on 100% authentic worldwide skincare.',
};

export default function OffersPage() {
  return (
    <>
      {/* Mobile Isolated View */}
      <OffersMobileView />

      {/* Desktop View */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Curated Savings &amp; Vouchers
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Offers &amp; Botanical Savings
          </h1>
          <p className="mt-3 text-slate-600 text-base">
            Discover verified promotional vouchers, limited time duo sets, and member privileges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
                Free Express Delivery
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-4">Free Shipping</h2>
              <p className="text-sm text-slate-600 mt-2">
                Enjoy free doorstep express delivery on orders over ৳1,000 across all 64 districts.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
                FREESHIP
              </span>
              <span className="text-xs text-emerald-700 font-semibold">Active</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase">
                Welcome Privilege
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-4">10% Off First Order</h2>
              <p className="text-sm text-slate-600 mt-2">
                10% discount on your very first order over ৳500 on all 100% genuine imports.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">
                WELCOME10
              </span>
              <span className="text-xs text-emerald-700 font-semibold">Active</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold uppercase">
                Volume Savings
              </span>
              <h2 className="text-2xl font-bold text-white mt-4">20% Off Orders</h2>
              <p className="text-sm text-slate-300 mt-2">
                Flat 20% discount on order subtotals over ৳800 on qualifying skincare.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-amber-300 bg-white/10 px-3 py-1.5 rounded-lg">
                SAVE20
              </span>
              <Link
                href="/flash-sale"
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300"
              >
                <span>Shop Deals</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/flash-sale"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            <Tag className="w-4 h-4" />
            <span>Explore All Flash Deals &amp; Discounts</span>
          </Link>
        </div>
      </div>
    </>
  );
}
