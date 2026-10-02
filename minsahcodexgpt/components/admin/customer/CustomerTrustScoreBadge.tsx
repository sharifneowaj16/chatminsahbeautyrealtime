'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

export interface CustomerTrustScoreBadgeProps {
  score?: number | null;
  level?: 'safe' | 'low' | 'medium' | 'high' | 'danger' | string | null;
  deliveryRate?: number | null;
  totalDelivered?: number;
  totalCancelled?: number;
  totalReturned?: number;
  compact?: boolean;
  className?: string;
}

export const CustomerTrustScoreBadge: React.FC<CustomerTrustScoreBadgeProps> = ({
  score,
  level = 'safe',
  deliveryRate,
  totalDelivered,
  totalCancelled,
  totalReturned,
  compact = false,
  className = '',
}) => {
  const normLevel = (level || 'safe').toLowerCase();
  const isHighRisk = normLevel === 'high' || normLevel === 'danger' || (score !== null && score !== undefined && score > 70);
  const isMediumRisk = normLevel === 'medium' || normLevel === 'caution' || (score !== null && score !== undefined && score > 40 && score <= 70);
  const isSafe = !isHighRisk && !isMediumRisk;

  const totalHistory = (totalDelivered || 0) + (totalCancelled || 0) + (totalReturned || 0);
  const calculatedRate =
    deliveryRate !== undefined && deliveryRate !== null
      ? deliveryRate
      : totalHistory > 0
      ? Math.round(((totalDelivered || 0) / totalHistory) * 100)
      : null;

  if (compact) {
    return (
      <span
        title={
          isHighRisk
            ? 'High Return / Fraud Risk Customer'
            : isMediumRisk
            ? 'Moderate Risk Customer'
            : 'Verified Low Risk Customer'
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
          {calculatedRate !== null ? `${calculatedRate}% Delivery` : isHighRisk ? 'High Risk' : 'Low Risk'}
        </span>
      </span>
    );
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
            {isHighRisk
              ? 'High Return Risk'
              : isMediumRisk
              ? 'Moderate Delivery Risk'
              : 'Reliable Customer'}
          </span>
          <span className="text-[10px] text-slate-400">
            {calculatedRate !== null
              ? `${calculatedRate}% courier success rate across ${totalHistory} orders`
              : score !== null && score !== undefined
              ? `Fraud Risk Score: ${score}/100`
              : 'Good standing with zero recent failed deliveries'}
          </span>
        </div>
      </div>

      {(totalDelivered !== undefined || totalReturned !== undefined) && (
        <div className="flex items-center gap-2 text-[11px] shrink-0 font-medium">
          {totalDelivered !== undefined && (
            <span className="text-emerald-400 flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              {totalDelivered} Recv
            </span>
          )}
          {totalReturned !== undefined && totalReturned > 0 && (
            <span className="text-rose-400 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />
              {totalReturned} Ret
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerTrustScoreBadge;
