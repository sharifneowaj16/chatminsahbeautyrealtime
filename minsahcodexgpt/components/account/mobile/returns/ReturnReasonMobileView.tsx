'use client';

import { useState } from 'react';
import { ReturnReasonMobileHeader } from './ReturnReasonMobileHeader';
import { ReturnStepProgress } from './ReturnStepProgress';
import { ReturnItemSummaryCard } from './ReturnItemSummaryCard';
import { ReturnReasonOptionsGroup } from './ReturnReasonOptionsGroup';
import { ReturnNotesInput } from './ReturnNotesInput';
import { ReturnPolicyAssurance } from './ReturnPolicyAssurance';
import { ReturnFloatingActionFooter } from './ReturnFloatingActionFooter';
import { ReturnItemInfo } from './types';

interface ReturnReasonMobileViewProps {
  order: {
    id: string;
    orderNumber: string;
    items: ReturnItemInfo[];
  };
  reason: string;
  onReasonChange: (reason: string) => void;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export function ReturnReasonMobileView({
  order,
  reason,
  onReasonChange,
  onContinue,
  isSubmitting = false,
}: ReturnReasonMobileViewProps) {
  const [notes, setNotes] = useState('');
  const primaryItem = order.items[0] || {
    id: 'default',
    productId: '',
    productName: 'Minsah Beauty Item',
    productSlug: '',
    productImage: null,
    quantity: 1,
    price: 0,
    totalPrice: 0,
    sku: 'MB-SKU',
  };

  const handleSelectReason = (_id: string, title: string) => {
    onReasonChange(title);
  };

  const handleProceed = () => {
    if (notes.trim()) {
      onReasonChange(`${reason} — ${notes.trim()}`);
    }
    onContinue();
  };

  return (
    <div className="lg:hidden min-h-screen bg-slate-50 pb-32">
      <ReturnReasonMobileHeader
        orderId={order.id}
        orderNumber={order.orderNumber}
      />

      <ReturnStepProgress currentStep={1} totalSteps={3} />

      <ReturnItemSummaryCard
        item={primaryItem}
        orderNumber={order.orderNumber}
      />

      <ReturnReasonOptionsGroup
        selectedReason={reason}
        onSelectReason={handleSelectReason}
      />

      <ReturnNotesInput
        value={notes}
        onChange={setNotes}
      />

      <ReturnPolicyAssurance />

      <ReturnFloatingActionFooter
        canContinue={Boolean(reason.trim())}
        onContinue={handleProceed}
        isLoading={isSubmitting}
      />
    </div>
  );
}
