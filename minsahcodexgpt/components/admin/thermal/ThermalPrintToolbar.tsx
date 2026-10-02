'use client';

import React from 'react';
import { Printer, Copy, Check, Download, X } from 'lucide-react';
import { ThermalPaperWidth } from './ThermalSlipContainer';
import { Button } from '@/components/ui/Button';

export interface ThermalPrintToolbarProps {
  paperWidth: ThermalPaperWidth;
  onPaperWidthChange: (width: ThermalPaperWidth) => void;
  onPrint?: () => void;
  onCopyMemo?: () => void;
  onDownloadTxt?: () => void;
  onClose?: () => void;
  copiedMemo?: boolean;
  className?: string;
}

export const ThermalPrintToolbar: React.FC<ThermalPrintToolbarProps> = ({
  paperWidth,
  onPaperWidthChange,
  onPrint = () => window.print(),
  onCopyMemo,
  onDownloadTxt,
  onClose,
  copiedMemo = false,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 bg-slate-900 border-b border-slate-800 text-xs text-white print:hidden ${className}`}
    >
      {/* Paper Width Selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Roll:</span>
        {(['80mm', '58mm'] as ThermalPaperWidth[]).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onPaperWidthChange(w)}
            className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
              paperWidth === w
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 ml-auto">
        {onCopyMemo && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCopyMemo}
            className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Copy plain-text formatted memo"
          >
            {copiedMemo ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Copy Memo</span>
              </>
            )}
          </Button>
        )}

        {onDownloadTxt && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onDownloadTxt}
            className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Download text slip"
          >
            <Download className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={onPrint}
          className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md flex items-center gap-1"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Slip</span>
        </Button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ThermalPrintToolbar;
