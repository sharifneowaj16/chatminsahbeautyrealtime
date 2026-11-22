'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

export interface CustomerTrustScoreBadgeProps {
  score?: number | null;
  level?: 'safe' | 'low' | 'medium' | 'high' | 'danger' | string | null;
  fraudDetails?: any;
  deliveryRate?: number | null;
  totalDelivered?: number;
  totalCancelled?: number;
  totalReturned?: number;
  compact?: boolean;
  className?: string;
}

export const CustomerTrustScoreBadge: React.FC<CustomerTrustScoreBadgeProps> = ({
  score,
  level,
  fraudDetails,
  deliveryRate,
  totalDelivered,
  totalCancelled,
  totalReturned,
  compact = false,
  className = '',
}) => {
  const sf = fraudDetails?.steadfast?.status === 'ok' ? fraudDetails.steadfast : null;
  const pathao = fraudDetails?.pathao?.status === 'ok' ? fraudDetails.pathao : null;
  const totalHistory = (totalDelivered || 0) + (totalCancelled || 0) + (totalReturned || 0);

  const hasAnySignal = Boolean(
    sf ||
      pathao ||
      level ||
      (score !== null && score !== undefined) ||
      (deliveryRate !== null && deliveryRate !== undefined) ||
      totalHistory > 0
  );

  const sfRatio: number | null =
    typeof sf?.deliveryRatio === 'number' ? sf.deliveryRatio : null;
  const sfReports: number = typeof sf?.totalReports === 'number' ? sf.totalReports : 0;

  const calculatedRate =
    sfRatio !== null
      ? sfRatio
      : deliveryRate !== undefined && deliveryRate !== null
        ? deliveryRate
        : totalHistory > 0
          ? Math.round(((totalDelivered || 0) / totalHistory) * 100)
          : null;

  const normLevel = (level || '').toLowerCase();
  const isHighRisk =
    hasAnySignal &&
    (sfReports >= 2 ||
      (sfRatio !== null && sfRatio < 60) ||
      normLevel === 'high' ||
      normLevel === 'danger' ||
      (score !== null && score !== undefined && score >= 75));

  const isMediumRisk =
    hasAnySignal &&
    !isHighRisk &&
    (sfReports === 1 ||
      (sfRatio !== null && sfRatio < 85) ||
      normLevel === 'medium' ||
      normLevel === 'caution' ||
      (score !== null && score !== undefined && score >= 45));

  if (!hasAnySignal) {
    if (compact) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border bg-white/[0.04] text-slate-400 border-white/10 ${className}`}
        >
          <HelpCircle className="w-3 h-3" />
          <span>Not Checked</span>
        </span>
      );
    }

    return (
      <div
        className={`rounded-lg border p-2.5 flex items-center gap-2.5 bg-white/[0.02] border-[#1f2f45] text-slate-400 ${className}`}
      >
        <div className="p-1.5 rounded-md bg-white/[0.05] text-slate-400">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-300 block">
            Courier History Not Checked
          </span>
          <span className="text-[10px] text-slate-400">
            Verify below to load Steadfast &amp; Pathao history
          </span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <span
        title={
          sf
            ? `Steadfast ${sfRatio ?? 'N/A'}% | Vol ${sf.volumeRange ?? 'N/A'} | Reports ${sfReports}`
            : 'Courier delivery history'
        }
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
          isHighRisk
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            : isMediumRisk
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        } ${className}`}
      >
        {isHighRisk ? (
          <AlertOctagon className="w-3 h-3" />
        ) : isMediumRisk ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <ShieldCheck className="w-3 h-3" />
        )}
        <span>
          {calculatedRate !== null ? `${calculatedRate}% Success` : pathao?.customerRatingLabel || 'Checked'}
          {sfReports > 0 ? ` ? ${sfReports} Rep` : ''}
        </span>
      </span>
    );
  }

  const summaryParts: string[] = [];
  if (sf) {
    if (sfRatio !== null) summaryParts.push(`Steadfast ${sfRatio}% ok / ${sf.cancellationRatio ?? 0}% cancel`);
    if (sf.volumeRange) summaryParts.push(`Vol ${sf.volumeRange}`);
    summaryParts.push(`Reports: ${sfReports}`);
  }
  if (pathao?.customerRatingLabel) {
    summaryParts.push(`Pathao: ${pathao.customerRatingLabel}`);
  }

  return (
    <div
      className={`rounded-lg border p-2.5 flex items-center justify-between gap-3 ${
        isHighRisk
          ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          : isMediumRisk
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`p-1.5 rounded-md ${
            isHighRisk
              ? 'bg-rose-500/20 text-rose-400'
              : isMediumRisk
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
          }`}
        >
          {isHighRisk ? (
            <AlertOctagon className="w-4 h-4" />
          ) : isMediumRisk ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
        </div>
        <div>
          <span className="text-xs font-bold block">
            {calculatedRate !== null
              ? `${calculatedRate}% Courier Delivery Rate${sf?.volumeRange ? ` (${sf.volumeRange})` : ''}`
              : pathao?.customerRatingLabel || 'Courier History Verified'}
          </span>
          <span className="text-[10px] text-slate-300/80 font-mono">
            {summaryParts.length > 0
              ? summaryParts.join(' ? ')
              : score !== null && score !== undefined
                ? `Reference Score: ${score}/100`
                : 'Checked via courier API'}
          </span>
        </div>
      </div>

      {(totalDelivered !== undefined || totalReturned !== undefined) && (
        <div className="flex items-center gap-2 text-[11px] shrink-0 font-medium">
          {totalDelivered !== undefined && (
            <span className="text-emerald-400">{totalDelivered} ok</span>
          )}
          {totalCancelled !== undefined && totalCancelled > 0 && (
            <span className="text-amber-400">{totalCancelled} cancel</span>
          )}
          {totalReturned !== undefined && totalReturned > 0 && (
            <span className="text-rose-400">{totalReturned} return</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerTrustScoreBadge;
