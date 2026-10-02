'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

export interface AiModelOption {
  id: string;
  label: string;
  badge: string;
  badgeColor: string;
  cost: string;
  note: string;
}

export const DEFAULT_AI_MODELS: AiModelOption[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Haiku — Fast (~5s)',
    badge: 'Economical',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    cost: '~$0.02/product',
    note: 'Best for simple catalogue products',
  },
  {
    id: 'claude-sonnet-4-20250514',
    label: 'Sonnet — Balanced (~12s)',
    badge: 'Recommended',
    badgeColor: 'bg-[#5e6ad2]/20 text-[#8590ea] border border-[#5e6ad2]/30',
    cost: '~$0.09/product',
    note: 'Best quality-cost balance',
  },
  {
    id: 'claude-opus-4-20250514',
    label: 'Opus — Best Quality (~25s)',
    badge: 'Premium',
    badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    cost: '~$0.40/product',
    note: 'For complex cosmetics & rich descriptions',
  },
];

export interface ProductAiModelSelectorProps {
  selectedModel: string;
  onSelectModel: (id: string) => void;
  models?: AiModelOption[];
}

export function ProductAiModelSelector({
  selectedModel,
  onSelectModel,
  models = DEFAULT_AI_MODELS,
}: ProductAiModelSelectorProps) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-white/80 mb-2">Choose an AI Engine:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {models.map((m) => {
          const isSelected = selectedModel === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectModel(m.id)}
              className={`text-left px-3.5 py-2.5 rounded-lg border-2 transition-all active:scale-[0.98] ${
                isSelected
                  ? 'border-[#5e6ad2] bg-[#1b1e2c] shadow-md ring-1 ring-[#5e6ad2]/30'
                  : 'border-[#232636] bg-[#10121b] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#F7F8F8]">{m.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.badgeColor}`}>
                  {m.badge}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span>{m.note}</span>
                <span className="font-mono text-white/40">{m.cost}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
