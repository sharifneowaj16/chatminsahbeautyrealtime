'use client';

import React from 'react';
import { ScanBarcode } from 'lucide-react';

interface ManifestBarcodeScannerInputProps {
  barcodeQuery: string;
  onBarcodeQueryChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  scanMessage: string | null;
}

export const ManifestBarcodeScannerInput: React.FC<ManifestBarcodeScannerInputProps> = ({
  barcodeQuery,
  onBarcodeQueryChange,
  onSubmit,
  scanMessage,
}) => {
  return (
    <div className="p-3 bg-[#0a111e] border-b border-[#1b2537]">
      <form onSubmit={onSubmit} className="relative">
        <ScanBarcode className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Scan barcode / SKU to verify inward (+1 pc)..."
          value={barcodeQuery}
          onChange={(e) => onBarcodeQueryChange(e.target.value)}
          className="w-full bg-[#050912] border border-[#1d293d] text-xs font-mono text-white pl-9 pr-16 py-2 rounded-md focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
          autoFocus
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1.5 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold rounded transition-colors cursor-pointer"
        >
          Scan
        </button>
      </form>

      {scanMessage && (
        <div
          className={`mt-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
            scanMessage.startsWith('✓')
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
              : 'bg-amber-950/80 border border-amber-800 text-amber-300'
          }`}
        >
          {scanMessage}
        </div>
      )}
    </div>
  );
};
