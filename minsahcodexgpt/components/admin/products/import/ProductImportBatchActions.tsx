'use client';

import React from 'react';
import { Sparkles, Trash2, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ProductImportBatchActionsProps {
  step: 'paste' | 'review';
  isParsing?: boolean;
  canParse?: boolean;
  isSaving?: boolean;
  onParse: () => void;
  onClear: () => void;
  onBackToPaste?: () => void;
  onSave?: () => void;
}

export function ProductImportBatchActions({
  step,
  isParsing = false,
  canParse = true,
  isSaving = false,
  onParse,
  onClear,
  onBackToPaste,
  onSave,
}: ProductImportBatchActionsProps) {
  if (step === 'paste') {
    return (
      <div className="flex items-center gap-2.5 pt-2">
        <Button
          type="button"
          onClick={onParse}
          disabled={!canParse || isParsing}
          className="inline-flex items-center px-5 py-2.5 bg-[#5e6ad2] hover:bg-[#525ec2] text-white text-xs font-medium rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Parsing JSON...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Parse JSON
            </>
          )}
        </Button>

        <Button
          type="button"
          onClick={onClear}
          className="inline-flex items-center px-4 py-2.5 bg-[#10121b] border border-[#232636] hover:bg-[#1b1e2c] text-white/70 hover:text-white text-xs font-medium rounded-lg transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Clear Input
        </Button>
      </div>
    );
  }

  return (
    <div className="sticky bottom-4 z-30 flex items-center justify-between bg-[#161824]/95 backdrop-blur-md rounded-xl border border-[#232636] p-4 shadow-xl">
      {onBackToPaste && (
        <Button
          type="button"
          onClick={onBackToPaste}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-[#232636] bg-[#10121b] text-white/70 hover:text-white rounded-lg text-xs font-medium hover:bg-[#1b1e2c]"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Edit Raw JSON
        </Button>
      )}

      {onSave && (
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center px-6 py-2.5 bg-[#5e6ad2] hover:bg-[#525ec2] text-white text-xs font-medium rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all ml-auto disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Importing Product...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save & Import Product
            </>
          )}
        </Button>
      )}
    </div>
  );
}
