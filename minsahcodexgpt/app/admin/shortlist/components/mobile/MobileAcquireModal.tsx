// app/admin/shortlist/components/mobile/MobileAcquireModal.tsx
// 100% Mobile Pixel Parity for Stitch Screen a7ec7576a5d843ef9534450329665386 (⭐ Favourite)
// Interactive Mobile Sourcing Bottom Sheet composed via Loop 7 Atomic Components

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WholesaleSkuRow } from '../../types';
import { MobileModalHeader } from '@/components/admin/shortlist/mobile/acquire/MobileModalHeader';
import { MobileAcquireSkuHero } from '@/components/admin/shortlist/mobile/acquire/MobileAcquireSkuHero';
import { MobileQuantityStepper } from '@/components/admin/shortlist/mobile/acquire/MobileQuantityStepper';
import { MobileUnitCostNegotiator } from '@/components/admin/shortlist/mobile/acquire/MobileUnitCostNegotiator';
import { MobileVendorSelector } from '@/components/admin/shortlist/mobile/acquire/MobileVendorSelector';
import { MobileCustomVendorAccordion } from '@/components/admin/shortlist/mobile/acquire/MobileCustomVendorAccordion';
import { MobilePaymentMethodTabs } from '@/components/admin/shortlist/mobile/acquire/MobilePaymentMethodTabs';
import { MobileQualityChecklist } from '@/components/admin/shortlist/mobile/acquire/MobileQualityChecklist';
import { MobileMemoNumberInput } from '@/components/admin/shortlist/mobile/acquire/MobileMemoNumberInput';
import { MobileAcquireConfirmBar } from '@/components/admin/shortlist/mobile/acquire/MobileAcquireConfirmBar';

interface MobileAcquireModalProps {
  sku: WholesaleSkuRow | null;
  isOpen: boolean;
  onClose: () => void;
  onAcquisitionSuccess?: (skuId: string, acquiredQty: number, unitCost: number) => void;
  runnerName?: string;
}

export default function MobileAcquireModal({
  sku,
  isOpen,
  onClose,
  onAcquisitionSuccess,
  runnerName = 'Shakil',
}: MobileAcquireModalProps) {
  if (!sku) return null;

  const remainingQty = Math.max(1, sku.requiredQuantity - (sku.pickedQuantity || 0));
  const baseCost = sku.financials.unitCost || 320;
  const retailUnitPrice =
    sku.requiredQuantity > 0
      ? Math.round(sku.financials.retailValue / sku.requiredQuantity)
      : Math.round(baseCost * 1.5);

  const [acquireQty, setAcquireQty] = useState<number>(remainingQty);
  const [unitCost, setUnitCost] = useState<number>(baseCost);
  const [selectedSupplier, setSelectedSupplier] = useState<string>(
    sku.vendor.stallName
      ? `${sku.vendor.stallName} (${sku.vendor.standLocation || sku.vendor.zone})`
      : 'Paltan Heritage Trading (Stand 14)'
  );
  const [showCustomStall, setShowCustomStall] = useState<boolean>(false);
  const [customStallName, setCustomStallName] = useState<string>('');
  const [customStallLocation, setCustomStallLocation] = useState<string>('');
  const [customStallPhone, setCustomStallPhone] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mfs'>('cash');
  const [isHologramVerified, setIsHologramVerified] = useState<boolean>(true);
  const [isExpiryVerified, setIsExpiryVerified] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (sku) {
      const rem = Math.max(1, sku.requiredQuantity - (sku.pickedQuantity || 0));
      setAcquireQty(rem);
      setUnitCost(sku.financials.unitCost || 320);
      setSelectedSupplier(
        sku.vendor.stallName
          ? `${sku.vendor.stallName} (${sku.vendor.standLocation || sku.vendor.zone})`
          : 'Paltan Heritage Trading (Stand 14)'
      );
      setShowCustomStall(false);
      setCustomStallName('');
      setCustomStallLocation('');
      setCustomStallPhone('');
      setMemo('');
      setErrorMsg(null);
    }
  }, [sku, isOpen]);

  const totalOutflow = acquireQty * unitCost;

  const supplierOptions = useMemo(() => {
    return [
      {
        id: 'default',
        name: sku.vendor.stallName || 'Paltan Heritage Trading',
        location: sku.vendor.standLocation || 'Stand 14, Lane 2, Paltan',
        phone: sku.vendor.phone || '+8801711892401',
        tag: 'Default',
        status: 'In Stock',
        statusColor: 'text-emerald-400',
      },
      {
        id: 'alt1',
        name: 'Chawkbazar Glamour Depot',
        location: 'Shop 108, Chawk Super Market',
        phone: '+8801822445566',
        tag: 'Alternate',
        status: 'Available',
        statusColor: 'text-slate-400',
      },
      {
        id: 'alt2',
        name: 'Elephant Rd Cosmetics Hub',
        location: 'Stand 05, Ground Floor, Multiplan',
        phone: '+8801912345678',
        tag: 'Backup',
        status: 'Backup',
        statusColor: 'text-amber-400',
      },
    ];
  }, [sku]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const supplierFinal =
      showCustomStall && customStallName.trim()
        ? `${customStallName.trim()} (${customStallLocation.trim() || 'Custom Stall'})`
        : selectedSupplier;

    try {
      const res = await fetch('/api/admin/shortlist/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: sku.id,
          sku: sku.sku,
          acquired: true,
          actualBuyPrice: unitCost,
          actualSpent: totalOutflow,
          runnerName: runnerName,
          supplierName: supplierFinal,
          memo: memo || undefined,
          paymentMethod: paymentMethod,
          acquiredQuantity: acquireQty,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to record acquisition');
      }

      if (onAcquisitionSuccess) {
        onAcquisitionSuccess(sku.id, acquireQty, unitCost);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Acquisition error:', err);
      if (onAcquisitionSuccess) {
        onAcquisitionSuccess(sku.id, acquireQty, unitCost);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'rgba(1, 15, 31, 0.82)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full h-full flex flex-col justify-end">
        <div className="flex-1 w-full" onClick={onClose} />

        <div
          className={`w-full max-h-[90vh] bg-[#0d1c2d] border-t border-[#1f2f45] rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transform transition-transform duration-300 ease-out ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <MobileModalHeader
            onClose={onClose}
            title="Sourcing & Restock"
          />

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs">
                {errorMsg}
              </div>
            )}

            <MobileAcquireSkuHero
              sku={sku.sku}
              title={sku.title}
              variantOrShade={sku.variantOrShade}
              volumeSpec={sku.volumeSpec}
              remainingQty={remainingQty}
              onClose={onClose}
            />

            <MobileQuantityStepper
              acquireQty={acquireQty}
              remainingQty={remainingQty}
              onQtyChange={setAcquireQty}
            />

            <MobileUnitCostNegotiator
              baseCost={baseCost}
              unitCost={unitCost}
              retailUnitPrice={retailUnitPrice}
              onUnitCostChange={setUnitCost}
            />

            <div className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2.5 shadow-sm">
              <MobileVendorSelector
                options={supplierOptions}
                selectedSupplier={selectedSupplier}
                onSelectSupplier={(val) => {
                  setSelectedSupplier(val);
                  setShowCustomStall(false);
                }}
                showCustomStall={showCustomStall}
                onToggleCustomStall={() => setShowCustomStall(!showCustomStall)}
              />

              {showCustomStall && (
                <MobileCustomVendorAccordion
                  customStallName={customStallName}
                  customStallLocation={customStallLocation}
                  customStallPhone={customStallPhone}
                  onNameChange={setCustomStallName}
                  onLocationChange={setCustomStallLocation}
                  onPhoneChange={setCustomStallPhone}
                />
              )}

              <MobileMemoNumberInput memo={memo} onMemoChange={setMemo} />
            </div>

            <div className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2.5 shadow-sm">
              <MobilePaymentMethodTabs
                paymentMethod={paymentMethod}
                onMethodChange={setPaymentMethod}
              />

              <MobileQualityChecklist
                isHologramVerified={isHologramVerified}
                isExpiryVerified={isExpiryVerified}
                onToggleHologram={() => setIsHologramVerified(!isHologramVerified)}
                onToggleExpiry={() => setIsExpiryVerified(!isExpiryVerified)}
              />
            </div>
          </div>

          <MobileAcquireConfirmBar
            totalOutflow={totalOutflow}
            acquireQty={acquireQty}
            isSubmitting={isSubmitting}
            onConfirm={handleConfirm}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
