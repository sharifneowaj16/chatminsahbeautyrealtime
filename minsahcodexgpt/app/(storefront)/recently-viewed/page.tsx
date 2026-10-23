import { RecentlyViewedMobileView } from '@/components/recently-viewed/mobile/RecentlyViewedMobileView';
import Link from 'next/link';
import { History, ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Recently Viewed Products | Minsah Beauty',
  description: 'Easily re-discover your recently explored 100% authentic Korean skincare products.',
};

export default function RecentlyViewedPage() {
  return (
    <>
      {/* Mobile Isolated View */}
      <RecentlyViewedMobileView />

      {/* Desktop Responsive View */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Recently Viewed Products
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Your private browsing history on Minsah Beauty
              </p>
            </div>
          </div>

          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="relative h-48 w-full rounded-xl bg-slate-50 mb-4 flex items-center justify-center text-slate-400">
              <History className="w-12 h-12" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase">
                ELIXIR VITAL
              </span>
              <h3 className="font-bold text-slate-900 mt-1 text-base">
                Glass Skin Hydrating Serum (30ml)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Viewed 12m ago
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-lg font-bold text-slate-900">৳1,890</span>
                <span className="text-xs text-slate-400 line-through">৳2,650</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="relative h-48 w-full rounded-xl bg-slate-50 mb-4 flex items-center justify-center text-slate-400">
              <History className="w-12 h-12" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase">
                ANUA • K-BEAUTY
              </span>
              <h3 className="font-bold text-slate-900 mt-1 text-base">
                Heartleaf 77% Soothing Toner (250ml)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Viewed 45m ago
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-lg font-bold text-slate-900">৳2,100</span>
                <span className="text-xs text-slate-400 line-through">৳2,700</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
