'use client';

import React from 'react';
import { Order } from '../../types';
import { Truck, Send, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CourierStatusBadge } from '@/components/admin/courier/CourierStatusBadge';
import { CourierTrackingButton } from '@/components/admin/courier/CourierTrackingButton';
import { CourierCodBreakdownCard } from '@/components/admin/courier/CourierCodBreakdownCard';

export interface OrderDetailLogisticsTabProps {
  order: Order;
  onOpenDispatchDrawer: () => void;
}

export const OrderDetailLogisticsTab: React.FC<OrderDetailLogisticsTabProps> = ({
  order,
  onOpenDispatchDrawer,
}) => {
  const courierName =
    order.courier === 'pathao' || order.shippingMethod === 'pathao'
      ? 'Pathao Logistics'
      : 'Steadfast Courier';

  const courierType =
    order.courier === 'pathao' || order.shippingMethod === 'pathao' ? 'pathao' : 'steadfast';

  const trackingCode =
    order.steadfastTrackingCode ||
    order.pathaoTrackingCode ||
    order.tracking ||
    null;

  const courierStatus =
    courierType === 'pathao' ? order.pathaoStatus : order.steadfastStatus;

  return (
    <div className="space-y-4">
      {/* Courier Header Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{courierName}</h4>
              <p className="text-[11px] text-slate-400">Doorstep delivery partner</p>
            </div>
          </div>

          <CourierStatusBadge
            courier={courierType}
            status={courierStatus}
            trackingCode={trackingCode}
            size="md"
          />
        </div>

        {/* Tracking Code */}
        {trackingCode && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Tracking Code:</span>
            <CourierTrackingButton
              courier={courierType}
              trackingCode={trackingCode}
              consignmentId={order.steadfastConsignmentId || order.pathaoConsignmentId}
            />
          </div>
        )}
      </div>

      {/* Settlement Breakdown Card */}
      <CourierCodBreakdownCard
        orderTotal={order.total}
        advancePaid={order.paymentStatus === 'paid' ? order.total : 0}
        courierDeliveryFee={order.shippingCost || 60}
        isCod={order.paymentMethod === 'cash_on_delivery' || order.paymentStatus !== 'paid'}
        courierName={courierName}
      />

      {/* Dispatch Action */}
      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          onClick={onOpenDispatchDrawer}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20"
        >
          <Send className="w-4 h-4" />
          <span>
            {trackingCode ? `Manage Consignment / Re-Dispatch` : `Dispatch to ${courierName}`}
          </span>
        </Button>
      </div>
    </div>
  );
};

export default OrderDetailLogisticsTab;
