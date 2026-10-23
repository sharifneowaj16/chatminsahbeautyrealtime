'use client';

import { Wallet, Zap, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface ReturnResolutionPayoutCardProps {
  refundAmount: number;
  paymentMethod?: string;
  accountNumber?: string;
}

export function ReturnResolutionPayoutCard({
  refundAmount,
  paymentMethod = 'Instant bKash',
  accountNumber = '01712-***102',
}: ReturnResolutionPayoutCardProps) {
  return (
    <section className="w-full bg-white rounded-[28px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#E2DED8]/60 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#ccee9b]/50 flex items-center justify-center text-[#4b6723]">
            <Wallet className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-[#43483f] uppercase tracking-wider">
            Resolution Mode
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-[#ccee9b] text-[#516d29] text-[10px] font-bold uppercase tracking-wider">
          100% Guaranteed
        </span>
      </div>

      <div className="bg-[#f4f3f1] rounded-[22px] p-4 flex flex-col space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-[#43483f] font-medium">
              Selected Reimbursement
            </span>
            <span className="text-2xl font-bold text-[#1a1c1a] tracking-tight">
              {formatPrice(refundAmount)}
            </span>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[#4b6723] text-xs font-bold">
              <Zap className="w-3.5 h-3.5 fill-[#4b6723]" />
              {paymentMethod}
            </span>
            <p className="text-[11px] font-mono text-[#43483f] mt-0.5">
              {accountNumber}
            </p>
          </div>
        </div>

        {/* Meter Progress */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full bg-[#e9e8e5] h-2 rounded-full overflow-hidden flex">
            <div className="bg-[#4b6723] h-full rounded-full w-2/3 transition-all duration-500" />
          </div>
          <div className="flex justify-between items-center text-[10px] font-medium text-[#43483f]">
            <span>Queued for Disbursement</span>
            <span className="text-[#4b6723] font-bold">Auto-Release on Scan</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 text-[#43483f] text-xs">
        <CheckCircle className="w-4 h-4 text-[#4b6723] flex-shrink-0" />
        <span>
          Disbursed within <strong className="text-[#1a1c1a]">2 hours</strong> of rider pickup • ৳0 Restocking Fee
        </span>
      </div>
    </section>
  );
}
