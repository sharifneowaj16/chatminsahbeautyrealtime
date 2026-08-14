"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface ShopMerchandisingFallbackProps {
  reason?: "error" | "empty";
}

export default function ShopMerchandisingFallback({
  reason = "empty",
}: ShopMerchandisingFallbackProps) {
  return (
    <aside
      className="mb-6 rounded-3xl border border-minsah-accent bg-minsah-light p-4 shadow-sm"
      aria-label="Shop recommendation fallback"
      data-shop-merchandising-fallback={reason}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-minsah-primary"
          aria-hidden="true"
        >
          <Sparkles size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-minsah-dark">
            Need a fresh starting point?
          </h2>
          <p className="mt-1 text-sm text-minsah-secondary">
            Recommendations are refreshing. You can still browse trusted picks
            from our main shop collections.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/shop?sort=best-selling"
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-minsah-dark hover:text-minsah-primary"
            >
              Best sellers
            </Link>
            <Link
              href="/shop?sort=biggest-discount"
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-minsah-dark hover:text-minsah-primary"
            >
              Deals
            </Link>
            <Link
              href="/shop?sort=newest"
              className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-minsah-dark hover:text-minsah-primary"
            >
              New arrivals
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
