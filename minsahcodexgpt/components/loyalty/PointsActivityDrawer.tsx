'use client';

import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { PointsLogItem } from './types';

const defaultLogs: PointsLogItem[] = [
  {
    id: 'log-1',
    title: 'Order #MB-88294 (Express Delivery)',
    date: '26 Oct 2024 • Banani Hub',
    detail: 'Order item points credit',
    pointsDelta: 170,
    runningBalance: 850,
    isPositive: true,
  },
  {
    id: 'log-2',
    title: 'Verified Photo & Product Review',
    date: '24 Oct 2024 • Anua Heartleaf Toner',
    detail: 'Community review bonus',
    pointsDelta: 50,
    runningBalance: 680,
    isPositive: true,
  },
  {
    id: 'log-3',
    title: '৳200 OFF Voucher Redemption',
    date: '19 Oct 2024 • Checkout Applied',
    detail: 'Promo voucher claim',
    pointsDelta: -400,
    runningBalance: 630,
    isPositive: false,
  },
  {
    id: 'log-4',
    title: 'Minsah VIP Birthday Bonus',
    date: '12 Oct 2024 • Annual Gift',
    detail: 'Exclusive birthday perk',
    pointsDelta: 80,
    runningBalance: 1030,
    isPositive: true,
  },
];

interface PointsActivityDrawerProps {
  onOpenFullModal?: () => void;
}

export default function PointsActivityDrawer({ onOpenFullModal }: PointsActivityDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl p-2.5 border border-[#E2DED8]/60 shadow-xs transition-all duration-300">
      {/* Drawer Trigger */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F2F6F0] flex items-center justify-center text-[#062402] shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-[12px] text-[#062402] font-bold">
                Points Activity Log
              </h4>
              <span className="px-1.5 py-0.2 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[9px] font-bold">
                +170 Pts recent
              </span>
            </div>
            <p className="text-[10px] text-[#43483f] truncate">
              Tap to view recent transactions &amp; running balance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="py-1 px-2.5 rounded-lg bg-[#E8F0E5] text-[#062402] text-[10px] font-bold">
            Details
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#43483f]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#43483f]" />
          )}
        </div>
      </div>

      {/* Expanded Log Drawer */}
      {isExpanded && (
        <div className="pt-2.5 mt-2 border-t border-[#E2DED8]/60 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#E8F0E5]/60 text-[10px] font-bold">
            <span className="text-[#43483f]">Running Live Balance:</span>
            <span className="text-[#062402]">850 Pts (৳425 value)</span>
          </div>

          <div className="space-y-1.5">
            {defaultLogs.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded-lg bg-[#F2F6F0] flex items-center justify-between text-[11px]"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-[#062402] font-bold truncate">
                    {item.title}
                  </p>
                  <p className="text-[9px] text-[#43483f]">{item.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-[11px] font-bold ${
                      item.isPositive ? 'text-[#4b6723]' : 'text-[#380f26]'
                    }`}
                  >
                    {item.isPositive ? `+${item.pointsDelta}` : item.pointsDelta} Pts
                  </span>
                  <span className="block text-[8px] text-[#43483f]">
                    Bal: {item.runningBalance}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onOpenFullModal}
              className="text-[#4b6723] text-[10px] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Full History Modal</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-[#43483f] text-[10px] hover:text-[#062402] cursor-pointer"
            >
              Collapse ▲
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
