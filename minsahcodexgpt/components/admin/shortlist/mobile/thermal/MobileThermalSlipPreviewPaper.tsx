// components/admin/shortlist/mobile/thermal/MobileThermalSlipPreviewPaper.tsx
'use client';

import React from 'react';
import { ThermalReceiptPayload } from '@/app/admin/shortlist/types';

export interface MobileThermalSlipPreviewPaperProps {
  receiptData: ThermalReceiptPayload;
}

export function MobileThermalSlipPreviewPaper({
  receiptData,
}: MobileThermalSlipPreviewPaperProps) {
  return (
    <div className="my-1">
      <div
        id="mobile-printable-80mm-slip"
        className="relative w-full bg-[#fcfcfc] text-[#0f172a] rounded-t-lg shadow-2xl p-5 font-mono select-none overflow-hidden"
      >
        {/* Receipt Brand Banner */}
        <div className="relative text-center pb-3 border-b-2 border-dashed border-[#1e293b]/20">
          <div className="text-sm tracking-wider font-extrabold text-[#090d16] uppercase font-sans">
            MINSAH BEAUTY OPS
          </div>
          <div className="text-[10px] tracking-widest text-[#334155] font-bold mt-0.5">
            WHOLESALE SOURCING SLIP
          </div>
          <div className="text-[11px] text-[#475569] mt-0.5 font-medium">
            {receiptData.hubLocation}
          </div>
        </div>

        {/* Dispatch Timestamp & Rig Info */}
        <div className="relative py-2 flex justify-between items-center text-[11px] text-[#334155] font-semibold border-b border-[#cbd5e1]">
          <div>{receiptData.dateTimeStr}</div>
          <div className="px-1.5 py-0.5 bg-[#e2e8f0] rounded text-[#0f172a] font-bold">
            {receiptData.rigId} : {receiptData.runnerName.toUpperCase()}
          </div>
        </div>

        {/* Walking Route Summary */}
        {receiptData.walkingRouteSummary.length > 0 && (
          <div className="relative py-2.5 border-b border-[#cbd5e1] space-y-1">
            <div className="text-[9px] text-[#64748b] tracking-wider uppercase font-bold">
              WALKING ROUTE — {receiptData.walkingRouteSummary.length} STOP{receiptData.walkingRouteSummary.length !== 1 ? 'S' : ''}
            </div>
            {receiptData.walkingRouteSummary.map((stop, idx) => (
              <div key={idx} className="text-[10px] font-bold text-[#0f172a]">
                {stop}
              </div>
            ))}
          </div>
        )}

        {/* Multi-item SKU Line Items */}
        <div className="relative py-3 border-b-2 border-dashed border-[#1e293b]/20 space-y-3">
          <div className="flex justify-between text-[9px] text-[#64748b] font-bold uppercase tracking-wider pb-1 border-b border-[#e2e8f0]">
            <span>SKU / PRODUCT</span>
            <span>QTY × BDT</span>
          </div>
          {receiptData.lineItems.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] bg-[#090d16] text-[#ffffff] px-1.5 py-0.5 rounded font-bold tracking-wider">
                    SKU: {item.skuCode}
                  </span>
                  <div className="text-[13px] leading-tight font-extrabold text-[#090d16] mt-1 font-sans">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-[#475569] font-medium mt-0.5">
                    {item.shadeOrType}
                    {item.volumeSpec ? ` • ${item.volumeSpec}` : ''}
                  </div>
                  {item.orderRefs.length > 0 && (
                    <div className="text-[9px] text-[#64748b] bg-[#f1f5f9] px-1 py-0.5 rounded mt-0.5 font-bold">
                      Alloc: {item.orderRefs.join(' + ')}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl leading-none font-extrabold text-[#090d16]">
                    {item.qty}
                  </div>
                  <div className="text-[10px] font-bold text-[#475569]">PCS</div>
                  <div className="text-[11px] font-black text-[#090d16] mt-0.5">
                    ৳{item.totalPrice.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Totals Block */}
        <div className="relative py-2.5 border-b-2 border-dashed border-[#1e293b]/20 space-y-1">
          <div className="flex justify-between items-center text-[11px] text-[#475569]">
            <span>Total Units</span>
            <span className="font-bold text-[#0f172a]">
              {receiptData.totalUnits} PCS ({receiptData.totalSkus} SKUs)
            </span>
          </div>
          <div className="flex justify-between items-center pt-0.5">
            <div>
              <div className="text-[10px] font-extrabold tracking-wider uppercase text-[#090d16]">
                CASH PAYOUT REQUIRED
              </div>
              <div className="text-[10px] text-[#64748b] font-medium">
                Float Source: {receiptData.rigId}
              </div>
            </div>
            <div className="text-xl font-black text-[#090d16]">
              ৳{receiptData.requiredCashFloat.toLocaleString()}
            </div>
          </div>
          <div className="text-[9px] text-[#64748b] font-medium">
            Settlement: {receiptData.settlementMethod}
          </div>
        </div>

        {/* Scannable High-Density Barcode Block */}
        <div className="relative pt-3 pb-2 flex flex-col items-center justify-center">
          <svg className="w-full h-12" fill="#090d16" preserveAspectRatio="none" viewBox="0 0 240 60">
            <rect height="52" width="3" x="0" y="0" />
            <rect height="52" width="2" x="5" y="0" />
            <rect height="52" width="4" x="9" y="0" />
            <rect height="52" width="2" x="16" y="0" />
            <rect height="52" width="5" x="20" y="0" />
            <rect height="52" width="2" x="27" y="0" />
            <rect height="52" width="3" x="31" y="0" />
            <rect height="52" width="6" x="36" y="0" />
            <rect height="52" width="2" x="44" y="0" />
            <rect height="52" width="4" x="48" y="0" />
            <rect height="52" width="2" x="55" y="0" />
            <rect height="52" width="5" x="59" y="0" />
            <rect height="52" width="3" x="66" y="0" />
            <rect height="52" width="2" x="71" y="0" />
            <rect height="52" width="6" x="75" y="0" />
            <rect height="52" width="2" x="83" y="0" />
            <rect height="52" width="4" x="87" y="0" />
            <rect height="52" width="3" x="93" y="0" />
            <rect height="52" width="5" x="98" y="0" />
            <rect height="52" width="2" x="105" y="0" />
            <rect height="52" width="4" x="109" y="0" />
            <rect height="52" width="2" x="115" y="0" />
            <rect height="52" width="6" x="119" y="0" />
            <rect height="52" width="3" x="127" y="0" />
            <rect height="52" width="2" x="132" y="0" />
            <rect height="52" width="5" x="136" y="0" />
            <rect height="52" width="3" x="143" y="0" />
            <rect height="52" width="2" x="148" y="0" />
            <rect height="52" width="6" x="152" y="0" />
            <rect height="52" width="3" x="160" y="0" />
            <rect height="52" width="2" x="165" y="0" />
            <rect height="52" width="5" x="169" y="0" />
            <rect height="52" width="2" x="176" y="0" />
            <rect height="52" width="4" x="180" y="0" />
            <rect height="52" width="3" x="186" y="0" />
            <rect height="52" width="5" x="191" y="0" />
            <rect height="52" width="2" x="198" y="0" />
            <rect height="52" width="6" x="202" y="0" />
            <rect height="52" width="2" x="210" y="0" />
            <rect height="52" width="4" x="214" y="0" />
            <rect height="52" width="3" x="220" y="0" />
            <rect height="52" width="5" x="225" y="0" />
            <rect height="52" width="3" x="232" y="0" />
            <rect height="52" width="3" x="237" y="0" />
          </svg>
          <div className="text-xs tracking-[0.2em] font-extrabold text-[#090d16] mt-1 text-center font-mono">
            {receiptData.barcodeString}
          </div>
        </div>

        {/* Physical QC Checklist */}
        <div className="relative pt-2 pb-1 space-y-1 text-[10px] text-[#334155] border-t border-[#cbd5e1]">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#e2e8f0] flex items-center justify-center font-bold text-[#090d16] text-[9px]">
              ✓
            </span>
            <span>QC: Batch Hologram Verified on Box</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#e2e8f0] flex items-center justify-center font-bold text-[#090d16] text-[9px]">
              ✓
            </span>
            <span>QC: Minimum 12 Months Expiry Window</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-dotted border-[#cbd5e1] text-[9px]">
            <span>Runner: {receiptData.runnerName}</span>
            <span>{receiptData.dispatchInCharge}</span>
          </div>
          <div className="text-[9px] text-[#64748b] pt-0.5">
            Settlement: {receiptData.settlementMethod} • Float Verified
          </div>
        </div>
      </div>

      {/* Perforated Jagged Paper Tear Cut Edge */}
      <div className="w-full h-3 flex overflow-hidden -mt-0.5">
        <div className="w-full flex">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="w-3 h-3 bg-[#fcfcfc] rotate-45 -translate-y-1.5 shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
export default MobileThermalSlipPreviewPaper;
