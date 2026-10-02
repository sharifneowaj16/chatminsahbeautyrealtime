'use client';

import React from 'react';
import { MapPin, CheckCircle2, Circle, Store } from 'lucide-react';
import { CurrencyDisplay } from '../finance/CurrencyDisplay';
import { QuickPhoneAction } from '../customer/QuickPhoneAction';

export interface WalkingRouteStopCardProps {
  stopNumber: number;
  stallName: string;
  stallLocation: string;
  itemsCount: number;
  totalAmount: number;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  phone?: string;
  className?: string;
}

export const WalkingRouteStopCard: React.FC<WalkingRouteStopCardProps> = ({
  stopNumber,
  stallName,
  stallLocation,
  itemsCount,
  totalAmount,
  isCompleted = false,
  onToggleComplete,
  phone,
  className = '',
}) => {
  return (
    <div
      onClick={onToggleComplete}
      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
        isCompleted
          ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-md'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-600 text-white shadow-sm'
            }`}
          >
            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : `#${stopNumber}`}
          </div>

          <div>
            <h5
              className={`text-xs font-bold ${
                isCompleted ? 'text-slate-400 line-through' : 'text-white'
              }`}
            >
              {stallName}
            </h5>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-500" />
              {stallLocation}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <CurrencyDisplay
            amount={totalAmount}
            size="sm"
            className={isCompleted ? 'text-slate-500' : 'font-bold text-white'}
          />
          <span className="text-[10px] text-slate-500 block">
            {itemsCount} item{itemsCount > 1 ? 's' : ''} to acquire
          </span>
        </div>
      </div>

      {phone && (
        <div
          className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-slate-500">Vendor Contact:</span>
          <QuickPhoneAction phone={phone} size="sm" />
        </div>
      )}
    </div>
  );
};

export default WalkingRouteStopCard;
