import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";

interface PaymentRecoveryActionsProps {
  orderNumber?: string;
}

export default function PaymentRecoveryActions({
  orderNumber,
}: PaymentRecoveryActionsProps) {
  return (
    <aside
      className="mt-6 rounded-2xl border border-minsah-border-soft bg-white p-4 shadow-sm"
      aria-label="Payment recovery options"
    >
      <h2 className="text-sm font-bold text-minsah-text">
        Need to change or retry payment?
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-minsah-muted">
        Your order has already been created
        {orderNumber ? ` as #${orderNumber}` : ""}. You can return to checkout
        to choose another available method, or review the order from your
        account.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href="/checkout"
          className="minsah-tap-target inline-flex items-center justify-center gap-2 rounded-xl border border-minsah-border-soft bg-white px-4 py-3 text-sm font-semibold text-minsah-primary transition hover:bg-minsah-light"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to checkout
        </Link>
        <Link
          href="/account/orders"
          className="minsah-tap-target inline-flex items-center justify-center gap-2 rounded-xl bg-minsah-primary px-4 py-3 text-sm font-semibold text-minsah-light transition hover:bg-minsah-dark"
        >
          <PackageSearch size={16} aria-hidden="true" /> View my orders
        </Link>
      </div>
    </aside>
  );
}
