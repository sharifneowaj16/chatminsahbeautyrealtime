"use client";

import Link from "next/link";
import { RotateCcw, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type RecoveryAction = {
  label: string;
  onClick: () => void;
};

interface ShopEmptyStateProps {
  searchTerm?: string;
  spellSuggestion?: string | null;
  activeFilterCount: number;
  recoveryActions?: RecoveryAction[];
  onApplySpellSuggestion?: () => void;
  onClearSearch?: () => void;
  onClearFilters?: () => void;
}

export default function ShopEmptyState({
  searchTerm,
  spellSuggestion,
  activeFilterCount,
  recoveryActions = [],
  onApplySpellSuggestion,
  onClearSearch,
  onClearFilters,
}: ShopEmptyStateProps) {
  const hasSearch = Boolean(searchTerm?.trim());
  const hasFilters = activeFilterCount > 0;
  const title = hasSearch
    ? `No products found for “${searchTerm}”`
    : "No products match these filters";
  const message = hasFilters
    ? "Try removing one filter at a time, widening the price range, or starting from our most-loved products."
    : "Try a different keyword, check spelling, or browse our curated beauty picks.";

  return (
    <EmptyState
      title={title}
      description={
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-minsah-text-muted">
            Nothing matched yet
          </p>
          <p className="mt-2">{message}</p>
        </>
      }
      action={
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-3">
            {spellSuggestion && onApplySpellSuggestion && (
              <Button type="button" variant="primary" onClick={onApplySpellSuggestion}>
                <Search size={16} aria-hidden="true" />
                Search “{spellSuggestion}”
              </Button>
            )}
            {hasFilters && onClearFilters && (
              <Button type="button" variant="secondary" onClick={onClearFilters}>
                <RotateCcw size={16} aria-hidden="true" />
                Clear filters
              </Button>
            )}
            {hasSearch && onClearSearch && (
              <Button type="button" variant="secondary" onClick={onClearSearch}>
                <X size={16} aria-hidden="true" />
                Clear search
              </Button>
            )}
            <Link
              href="/shop?sort=best-selling"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-minsah-accent px-5 py-3 text-sm font-semibold text-minsah-dark transition-colors hover:border-minsah-primary hover:text-minsah-primary"
            >
              <Sparkles size={16} aria-hidden="true" />
              See best sellers
            </Link>
          </div>

          {recoveryActions.length > 0 && (
            <div className="mx-auto max-w-xl rounded-2xl border border-minsah-accent bg-white p-3 text-left" data-no-result-recovery-chips>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-minsah-secondary">
                Try removing one blocker
              </p>
              <div className="flex flex-wrap gap-2">
                {recoveryActions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    variant="secondary"
                    onClick={action.onClick}
                    className="rounded-full bg-minsah-accent px-3 py-2 text-xs hover:bg-minsah-primary hover:text-white"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto grid max-w-xl gap-2 text-left text-xs text-minsah-secondary sm:grid-cols-3">
            <Link
              href="/shop?category=skincare"
              className="inline-flex min-h-11 items-center rounded-2xl bg-minsah-accent/60 px-3 py-2 font-semibold text-minsah-dark hover:text-minsah-primary"
            >
              Browse skincare
            </Link>
            <Link
              href="/shop?sort=biggest-discount"
              className="inline-flex min-h-11 items-center rounded-2xl bg-minsah-accent/60 px-3 py-2 font-semibold text-minsah-dark hover:text-minsah-primary"
            >
              Biggest discounts
            </Link>
            <Link
              href="/shop?inStock=true"
              className="inline-flex min-h-11 items-center rounded-2xl bg-minsah-accent/60 px-3 py-2 font-semibold text-minsah-dark hover:text-minsah-primary"
            >
              In-stock products
            </Link>
          </div>
        </div>
      }
    />
  );
}
