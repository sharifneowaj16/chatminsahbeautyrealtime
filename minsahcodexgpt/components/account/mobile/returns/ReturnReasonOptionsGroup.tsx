'use client';

import {
  AlertTriangle,
  PackageX,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { ReturnReasonOption } from './types';

export const RETURN_REASONS: ReturnReasonOption[] = [
  {
    id: 'damaged',
    title: 'Defective or Damaged Item',
    description: 'Broken bottle, leaky cap, pump failure, or crushed outer packaging.',
    tag: 'Priority Pickup',
    iconType: 'damage',
  },
  {
    id: 'wrong_item',
    title: 'Received Wrong Item / Shade',
    description: 'Incorrect product variant, shade, milliliters, or mismatch from order.',
    tag: 'Free Replacement',
    iconType: 'wrong',
  },
  {
    id: 'authenticity',
    title: 'Authenticity / Seal Concern',
    description: 'Authenticity hologram sticker missing, serial tampered, or barcode query.',
    tag: '100% Genuine Audit',
    iconType: 'authenticity',
  },
  {
    id: 'skin_reaction',
    title: 'Adverse Skin Reaction',
    description: 'Severe breakouts, rash, or irritation after first patch test.',
    tag: 'Care Team Assistance',
    iconType: 'reaction',
  },
  {
    id: 'changed_mind',
    title: 'Changed Mind / Unopened',
    description: 'Item remains completely unopened with original factory seal intact.',
    tag: 'Fast Refund',
    iconType: 'mind',
  },
];

interface ReturnReasonOptionsGroupProps {
  selectedReason: string;
  onSelectReason: (id: string, title: string) => void;
}

export function ReturnReasonOptionsGroup({
  selectedReason,
  onSelectReason,
}: ReturnReasonOptionsGroupProps) {
  const getIcon = (type: ReturnReasonOption['iconType'], isSelected: boolean) => {
    const className = `w-4 h-4 ${isSelected ? 'text-rose-600' : 'text-slate-500'}`;
    switch (type) {
      case 'damage':
        return <AlertTriangle className={className} />;
      case 'wrong':
        return <PackageX className={className} />;
      case 'authenticity':
        return <ShieldAlert className={className} />;
      case 'reaction':
        return <Sparkles className={className} />;
      case 'mind':
      default:
        return <HelpCircle className={className} />;
    }
  };

  return (
    <div className="px-4 mt-5 space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Reason for Return
        </h2>
        <span className="text-[11px] text-rose-600 font-medium">* Required</span>
      </div>

      <div className="space-y-2">
        {RETURN_REASONS.map((option) => {
          const isSelected = selectedReason === option.title || selectedReason === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectReason(option.id, option.title)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                isSelected
                  ? 'bg-rose-50/60 border-rose-500 shadow-sm ring-1 ring-rose-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  isSelected ? 'text-rose-600' : 'text-slate-300'
                }`}
              >
                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 fill-rose-600 text-white" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getIcon(option.iconType, isSelected)}
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {option.title}
                    </span>
                  </div>
                  {option.tag && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        isSelected
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {option.tag}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
