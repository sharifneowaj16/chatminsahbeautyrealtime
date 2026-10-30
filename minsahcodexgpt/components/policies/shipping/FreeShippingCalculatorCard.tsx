'use client';

import React, { useState, useEffect } from 'react';
import { PiggyBank, Zap, CheckCircle2 } from 'lucide-react';
import { useOfferEngine } from '@/contexts/OfferEngineContext';

interface FreeShippingCalculatorCardProps {
  currentCartBdt?: number;
  targetBdt?: number;
}

export function FreeShippingCalculatorCard({
  currentCartBdt = 0,
  targetBdt,
}: FreeShippingCalculatorCardProps) {
  const { freeDelivery } = useOfferEngine();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const threshold = targetBdt ?? freeDelivery?.nationwideThreshold ?? 1100;
  const diff = Math.max(threshold - currentCartBdt, 0);
  const percentage = threshold > 0 ? Math.min(Math.round((currentCartBdt / threshold) * 100), 100) : 100;

  return (
    <section className="bg-[#FAF6F2] rounded-2xl p-4 border border-[#EADFD5] shadow-xs relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
            <PiggyBank size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#2D1F18] leading-tight">
              Free Delivery Calculator
            </h3>
            <p className="text-[10px] text-[#7A6E65]">Nationwide Delivery Privilege Tracker</p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
          {percentage}% Complete
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1.5 mt-2">
        <div className="w-full bg-[#EFE6DE] h-2.5 rounded-full overflow-hidden p-0.5 flex items-center border border-[#E2DED8]/60">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-500 shadow-xs"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-medium text-[#7A6E65]">
          <span>
            Current cart: <strong className="text-[#2D1F18] font-bold">৳{currentCartBdt.toLocaleString()}</strong>
          </span>
          <span>
            Free delivery threshold: <strong className="text-[#2D1F18] font-bold">৳{threshold.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Callout Banner */}
      <div className="mt-3 bg-white px-3 py-2 rounded-xl flex items-center gap-2 border border-[#EADFD5]">
        {diff > 0 ? (
          <>
            <Zap size={15} className="shrink-0 text-emerald-600" />
            <p className="text-[11px] text-[#2D1F18] leading-tight">
              Add products worth <strong className="text-emerald-700 font-bold">৳{diff.toLocaleString()}</strong> more to unlock{' '}
              <strong className="text-[#2D1F18] font-bold">100% Free Nationwide Delivery!</strong>
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            <p className="text-[11px] text-emerald-800 font-bold leading-tight">
              Congratulations! Free nationwide delivery unlocked.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
