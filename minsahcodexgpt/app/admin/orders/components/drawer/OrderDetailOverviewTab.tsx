'use client';

import React from 'react';
import { Order } from '../../types';
import { CustomerContactCard } from '@/components/admin/customer/CustomerContactCard';
import { ShippingAddressDisplay } from '@/components/admin/customer/ShippingAddressDisplay';
import { CustomerTrustScoreBadge } from '@/components/admin/customer/CustomerTrustScoreBadge';
import { OrderFinancialSummaryCard } from '@/components/admin/finance/OrderFinancialSummaryCard';
import { InlineAdminNoteEditor } from '@/components/admin/common/InlineAdminNoteEditor';
import OrderFraudAndReturnPanel from '@/components/admin/OrderFraudAndReturnPanel';

export interface OrderDetailOverviewTabProps {
  order: Order;
  onNoteUpdate: (id: string, note: string) => Promise<void>;
  onItemUpdated?: () => void;
}

export const OrderDetailOverviewTab: React.FC<OrderDetailOverviewTabProps> = ({
  order,
  onNoteUpdate,
  onItemUpdated,
}) => {
  const recipientName = order.shipping?.name || order.customer?.name || '';
  const recipientPhone = order.shipping?.phone || order.customer?.phone || '';
  const street = [order.shipping?.street1, order.shipping?.street2].filter(Boolean).join(', ');
  const city = order.shipping?.city || 'Dhaka';

  return (
    <div className="space-y-4">
      {/* Customer Profile & Contact */}
      <CustomerContactCard
        name={order.customer?.name || recipientName}
        phone={order.customer?.phone || recipientPhone}
        email={order.customer?.email}
      />

      {/* Customer Trust & Fraud Score */}
      <CustomerTrustScoreBadge
        score={order.fraudRiskScore}
        level={order.fraudRiskLevel}
      />

      {/* Shipping Address */}
      <ShippingAddressDisplay
        recipientName={recipientName}
        phone={recipientPhone}
        street={street || 'No street address specified'}
        city={city}
        postalCode={order.shipping?.postalCode}
      />

      {/* Financial Summary */}
      <OrderFinancialSummaryCard
        subtotal={order.subtotal ?? order.total}
        deliveryFee={order.shippingCost || 0}
        discount={order.discountAmount || 0}
        total={order.total}
        isCod={order.paymentMethod === 'cash_on_delivery' || order.paymentStatus !== 'paid'}
      />

      {/* Admin Notes */}
      <InlineAdminNoteEditor
        initialValue={order.adminNote}
        onSave={(newNote) => onNoteUpdate(order.id, newNote)}
      />

      {/* Pillar 6: Order Fraud & Return Risk Panel */}
      <OrderFraudAndReturnPanel
        orderId={order.dbId || order.id}
        orderNumber={order.id}
        customerPhone={order.customer?.phone || recipientPhone}
        initialFraudScore={order.fraudRiskScore}
        initialFraudLevel={order.fraudRiskLevel}
        initialFraudDetails={order.fraudRiskDetails}
        items={order.items as any}
        onItemUpdated={onItemUpdated}
      />
    </div>
  );
};

export default OrderDetailOverviewTab;
