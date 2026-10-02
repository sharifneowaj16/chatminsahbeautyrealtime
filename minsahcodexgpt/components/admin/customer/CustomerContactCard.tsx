'use client';

import React from 'react';
import { User, Mail, ShoppingBag, ShieldCheck } from 'lucide-react';
import { QuickPhoneAction } from './QuickPhoneAction';

export interface CustomerContactCardProps {
  name: string;
  phone: string;
  email?: string | null;
  orderCount?: number;
  customerId?: string;
  avatarUrl?: string;
  compact?: boolean;
  className?: string;
}

export const CustomerContactCard: React.FC<CustomerContactCardProps> = ({
  name,
  phone,
  email,
  orderCount,
  customerId,
  avatarUrl,
  compact = false,
  className = '',
}) => {
  // Initials for avatar
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'C';

  if (compact) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-rose-300 shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white truncate">{name || 'Guest'}</span>
            {orderCount !== undefined && orderCount > 1 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                {orderCount} orders
              </span>
            )}
          </div>
          <QuickPhoneAction phone={phone} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30 flex items-center justify-center text-sm font-bold text-rose-300 shrink-0 shadow-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              {name || 'Guest Customer'}
              {customerId && (
                <span className="text-[10px] font-mono text-slate-500 font-normal">
                  #{customerId.slice(-6)}
                </span>
              )}
            </h4>
            {email ? (
              <a
                href={`mailto:${email}`}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 mt-0.5 truncate"
              >
                <Mail className="w-3 h-3 text-slate-500" />
                {email}
              </a>
            ) : (
              <span className="text-[11px] text-slate-500 italic">No email provided</span>
            )}
          </div>
        </div>

        {orderCount !== undefined && (
          <div className="text-right shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                orderCount > 3
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : orderCount > 1
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              {orderCount === 1 ? '1st Order' : `${orderCount} Orders`}
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-400">Direct Contact:</span>
        <QuickPhoneAction phone={phone} size="md" />
      </div>
    </div>
  );
};

export default CustomerContactCard;
