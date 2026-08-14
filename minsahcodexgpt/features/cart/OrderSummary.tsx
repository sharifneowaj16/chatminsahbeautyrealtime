import type { ReactNode } from "react";

export interface OrderSummaryLine {
  key: string;
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean;
}

interface OrderSummaryProps {
  title?: string;
  lines: OrderSummaryLine[];
  total?: { label: ReactNode; value: ReactNode };
  notice?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export default function OrderSummary({
  title = "Order summary",
  lines,
  total,
  notice,
  action,
  className = "",
  compact = false,
}: OrderSummaryProps) {
  return (
    <section
      className={`${compact ? "" : "rounded-[32px] border border-minsah-border-soft bg-minsah-panel p-5 shadow-sm"} ${className}`}
      aria-label={title || "Order summary"}
    >
      {title && (
        <h2 className="text-lg font-black text-minsah-text">{title}</h2>
      )}
      {notice && <div className={title ? "mt-4" : ""}>{notice}</div>}
      <dl className={`${title || notice ? "mt-5" : ""} space-y-2.5`}>
        {lines.map((line) => (
          <div
            key={line.key}
            className={`flex items-start justify-between gap-4 ${line.emphasis ? "font-bold text-minsah-text" : "text-sm text-minsah-muted"}`}
          >
            <dt>{line.label}</dt>
            <dd className="text-right">{line.value}</dd>
          </div>
        ))}
      </dl>
      {total && (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-minsah-border-soft pt-4 text-base font-black text-minsah-text">
          <span>{total.label}</span>
          <span>{total.value}</span>
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
