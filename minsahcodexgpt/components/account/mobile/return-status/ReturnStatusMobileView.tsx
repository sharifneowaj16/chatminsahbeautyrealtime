'use client';

import { useState } from 'react';
import { ReturnStatusMobileHeader } from './ReturnStatusMobileHeader';
import { ReturnStatusHeroCard } from './ReturnStatusHeroCard';
import { ReturnResolutionPayoutCard } from './ReturnResolutionPayoutCard';
import { ReturnLiveTelemetryStepper } from './ReturnLiveTelemetryStepper';
import { ReturnItemPickupCard } from './ReturnItemPickupCard';
import { ReturnBentoPickupInfo } from './ReturnBentoPickupInfo';
import { ReturnConciergeTrustCard } from './ReturnConciergeTrustCard';
import { ReturnRiderQrModal } from './ReturnRiderQrModal';
import { ReturnStickyActionBar } from './ReturnStickyActionBar';
import { ReturnStatusData } from './types';

interface ReturnStatusMobileViewProps {
  returnRecord: ReturnStatusData;
  onCancelReturn?: () => void;
}

export function ReturnStatusMobileView({
  returnRecord,
}: ReturnStatusMobileViewProps) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const primaryItem = returnRecord.items[0] || {
    name: 'Korean Beauty Item',
    price: returnRecord.refundAmount,
    quantity: 1,
    image: null,
    issueDescription: 'Validation Confirmed • 100% Covered under Warranty',
  };

  const handleReschedule = () => {
    alert('Pickup Reschedule window: Available slots for tomorrow (10:00 AM – 1:00 PM). Request logged!');
  };

  const handleChangeAddress = () => {
    alert('Banani Hub dispatch in progress. Minor floor/flat adjustments can be phoned directly to rider.');
  };

  const handleSupport = () => {
    alert('Connecting to Minsah Beauty Dhaka Priority Return Hotline: +880 9612-MINSAH');
  };

  return (
    <div className="lg:hidden min-h-screen bg-[#faf9f6] text-[#1a1c1a] flex flex-col pb-32">
      <ReturnStatusMobileHeader
        returnNumber={returnRecord.returnNumber}
        onOpenSupport={handleSupport}
      />

      <main className="flex flex-col space-y-4 px-4 pt-3">
        <ReturnStatusHeroCard
          returnNumber={returnRecord.returnNumber}
          orderNumber={returnRecord.orderNumber}
          pickupWindow={returnRecord.pickupWindow}
          riderName={returnRecord.riderName}
          riderPhone={returnRecord.riderPhone}
          onReschedule={handleReschedule}
        />

        <ReturnResolutionPayoutCard
          refundAmount={returnRecord.refundAmount}
          paymentMethod={returnRecord.paymentMethod}
          accountNumber={returnRecord.accountNumber}
        />

        <ReturnLiveTelemetryStepper
          steps={returnRecord.timeline}
        />

        <ReturnItemPickupCard
          name={primaryItem.name}
          price={primaryItem.price}
          quantity={primaryItem.quantity}
          image={primaryItem.image}
          issueDescription={primaryItem.issueDescription}
        />

        <ReturnBentoPickupInfo
          address={returnRecord.pickupAddress}
          onChangeAddress={handleChangeAddress}
        />

        <ReturnConciergeTrustCard />
      </main>

      <ReturnStickyActionBar
        onShowQr={() => setIsQrModalOpen(true)}
        onOpenHelp={handleSupport}
      />

      <ReturnRiderQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        returnNumber={returnRecord.returnNumber}
        riderName={returnRecord.riderName}
      />
    </div>
  );
}
