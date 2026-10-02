'use client';

import React from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export interface ProductAiGeneratorPanelProps {
  aiInput: string;
  isGenerating: boolean;
  aiApplied: boolean;
  aiAppliedModelName?: string;
  aiError?: string;
  onChangeInput: (val: string) => void;
  onGenerate: () => void;
  onReset: () => void;
  children?: React.ReactNode;
}

export function ProductAiGeneratorPanel({
  aiInput,
  isGenerating,
  aiApplied,
  aiAppliedModelName = 'AI',
  aiError,
  onChangeInput,
  onGenerate,
  onReset,
  children,
}: ProductAiGeneratorPanelProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isGenerating && aiInput.trim()) {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <div
      className={`mb-6 rounded-xl border-2 p-5 shadow-sm transition-all ${
        aiApplied
          ? 'border-emerald-500/50 bg-emerald-950/30'
          : 'border-[#232636] bg-[#161824]'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-5 h-5 ${aiApplied ? 'text-emerald-400' : 'text-white/80'}`} />
          <span
            className={`text-sm font-semibold tracking-tight ${
              aiApplied ? 'text-emerald-300' : 'text-[#F7F8F8]'
            }`}
          >
            {aiApplied
              ? `✅ Generated with ${aiAppliedModelName} — Review and adjust fields below`
              : 'AI Product Copilot & Catalogue Generator'}
          </span>
        </div>

        {aiApplied && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-white/50 hover:text-rose-400 underline transition-colors"
          >
            Reset & start fresh
          </button>
        )}
      </div>

      {!aiApplied && (
        <>
          <p className="text-xs text-white/60 mb-3">
            Enter a beauty product name or barcode. The AI engine will automatically generate SEO titles, descriptions, INCI ingredients, skin type tags, and dimensions.
          </p>

          {children}

          <div className="flex gap-2.5 mt-3">
            <Input
              type="text"
              value={aiInput}
              onChange={(e) => onChangeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. COSRX Advanced Snail 96 Mucin Power Essence..."
              className="flex-1 px-3.5 py-2.5 border-2 border-[#232636] rounded-lg text-xs bg-[#10121b] text-[#F7F8F8] placeholder:text-white/30 focus:border-[#5e6ad2]"
              disabled={isGenerating}
            />

            <Button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating || !aiInput.trim()}
              className="inline-flex items-center px-5 py-2.5 bg-[#5e6ad2] hover:bg-[#525ec2] text-white rounded-lg text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50 active:scale-[0.98] transition-all shrink-0"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {aiError && (
        <div className="mt-3 flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {aiError}
        </div>
      )}
    </div>
  );
}
