"use client";

import { RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";

interface ShopErrorStateProps {
  onRetry: () => void;
}

export default function ShopErrorState({ onRetry }: ShopErrorStateProps) {
  return (
    <ErrorState
      title="Products couldn’t load"
      description={
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-minsah-text-muted">
            Connection issue
          </p>
          <p className="mt-2">
            Your filters are safe. Try again, or check the connection if the product list still does not appear.
          </p>
        </>
      }
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" variant="primary" onClick={onRetry}>
            <RefreshCcw size={16} aria-hidden="true" />
            Retry loading
          </Button>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-minsah-status-danger-border bg-minsah-surface-panel px-5 py-3 text-sm font-semibold text-minsah-status-danger-text">
            <WifiOff size={16} aria-hidden="true" />
            No checkout action was taken
          </span>
        </div>
      }
    />
  );
}
