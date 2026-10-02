'use client';

import React, { useState } from 'react';
import { Order, STATUS_CONFIG } from '@/app/admin/orders/types';
import { Eye, Printer, Truck, Copy, Check } from 'lucide-react';
import { PaymentMethodBadge } from '../finance/PaymentMethodBadge';
import { CourierStatusBadge } from '../courier/CourierStatusBadge';
import { CourierTrackingButton } from '../courier/CourierTrackingButton';
import { CurrencyDisplay } from '../finance/CurrencyDisplay';
import { QuickPhoneAction } from '../customer/QuickPhoneAction';

export interface OrderTableRowProps {
  order: Order;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onSelectOrder: (order: Order) => void;
  onOpenReceipt?: (order: Order) => void;
  onOpenDispatch?: (order: Order) => void;
  className?: string;
}

export const OrderTableRow: React.FC<OrderTableRowProps> = ({
  order,
  isSelected,
  onToggleSelect,
  onSelectOrder,
  onOpenReceipt,
  onOpenDispatch,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const orderNum = order.id.slice(-8).toUpperCase();
  const recipientName = order.shipping?.name || order.customer?.name || 'Guest';
  const recipientPhone = order.shipping?.phone || order.customer?.phone || '';

  const courierType =
    order.courier === 'pathao' || order.shippingMethod === 'pathao' ? 'pathao' : 'steadfast';

  const trackingCode =
    order.steadfastTrackingCode ||
    order.pathaoTrackingCode ||
    order.tracking ||
    null;

  const courierStatus =
    courierType === 'pathao' ? order.pathaoStatus : order.steadfastStatus;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusCfg = STATUS_CONFIG[order.status] || {
    label: order.status,
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const itemsSummary = (order.items || [])
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(', ');

  return (
    <tr
      onClick={() => onSelectOrder(order)}
      className={`border-b border-slate-800/80 hover:bg-slate-900/60 transition-colors cursor-pointer text-xs ${
        isSelected ? 'bg-rose-950/20' : ''
      } ${className}`}
    >
      {/* Checkbox */}
      <td className="p-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(order.id)}
          className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-0 cursor-pointer"
        />
      </td>

      {/* Order Reference */}
      <td className="p-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-white">#{orderNum}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-slate-500 hover:text-white"
            title="Copy ID"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </td>

      {/* Customer Info */}
      <td className="p-3">
        <span className="font-bold text-slate-200 block truncate max-w-[140px]">
          {recipientName}
        </span>
        <QuickPhoneAction phone={recipientPhone} size="sm" />
      </td>

      {/* Items preview */}
      <td className="p-3 max-w-[180px]">
        <span
          className="text-slate-300 block truncate"
          title={itemsSummary}
        >
          {itemsSummary || 'No items'}
        </span>
        <span className="text-[10px] text-slate-500">
          {order.items?.length || 0} product{order.items?.length === 1 ? '' : 's'}
        </span>
      </td>

      {/* Order Status */}
      <td className="p-3">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusCfg.color}`}
        >
          {statusCfg.label}
        </span>
      </td>

      {/* Payment & Amount */}
      <td className="p-3">
        <CurrencyDisplay amount={order.total} size="sm" className="font-bold text-white block" />
        <PaymentMethodBadge
          method={order.paymentMethod}
          trxId={order.paymentTransactionId}
          status={order.paymentStatus}
          size="sm"
          showTrxId={false}
        />
      </td>

      {/* Courier & Tracking */}
      <td className="p-3">
        <div className="space-y-1">
          <CourierStatusBadge
            courier={courierType}
            status={courierStatus}
            trackingCode={trackingCode}
            size="sm"
          />
          {trackingCode && (
            <CourierTrackingButton
              courier={courierType}
              trackingCode={trackingCode}
              consignmentId={order.steadfastConsignmentId || order.pathaoConsignmentId}
              size="sm"
            />
          )}
        </div>
      </td>

      {/* Action Buttons */}
      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {onOpenReceipt && (
            <button
              type="button"
              onClick={() => onOpenReceipt(order)}
              title="Print Thermal Slip"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenDispatch && (
            <button
              type="button"
              onClick={() => onOpenDispatch(order)}
              title="Dispatch Courier"
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectOrder(order)}
            title="View Details"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default OrderTableRow;
