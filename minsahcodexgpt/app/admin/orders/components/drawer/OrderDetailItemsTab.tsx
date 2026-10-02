'use client';

import React from 'react';
import { Order } from '../../types';
import { OrderItemRow } from '@/components/admin/products/OrderItemRow';
import { CurrencyDisplay } from '@/components/admin/finance/CurrencyDisplay';
import { ShoppingBag } from 'lucide-react';

export interface OrderDetailItemsTabProps {
  order: Order;
}

export const OrderDetailItemsTab: React.FC<OrderDetailItemsTabProps> = ({ order }) => {
  const subtotal = order.subtotal ?? order.total;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
          <ShoppingBag className="w-3.5 h-3.5 text-rose-400" />
          Ordered Items ({order.items?.length || 0})
        </span>
        <span>
          Subtotal: <CurrencyDisplay amount={subtotal} size="sm" className="font-bold text-white" />
        </span>
      </div>

      <div className="space-y-2">
        {order.items && order.items.length > 0 ? (
          order.items.map((item) => (
            <OrderItemRow
              key={item.id}
              title={item.name}
              sku={item.sku}
              variantName={item.variant?.name}
              imageUrl={item.image}
              unitPrice={item.price}
              quantity={item.quantity}
              total={item.total}
              editable={false}
            />
          ))
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs">
            No items listed in this order.
          </div>
        )}
      </div>

      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Items Subtotal:</span>
          <CurrencyDisplay amount={subtotal} size="sm" />
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Delivery Charge:</span>
          <CurrencyDisplay amount={order.shippingCost || 0} size="sm" />
        </div>
        {order.discountAmount ? (
          <div className="flex justify-between text-rose-400">
            <span>Discount Applied:</span>
            <span>-<CurrencyDisplay amount={order.discountAmount} size="sm" className="text-rose-400" /></span>
          </div>
        ) : null}
        <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800">
          <span>Grand Total:</span>
          <CurrencyDisplay amount={order.total} size="md" className="font-bold text-emerald-400" />
        </div>
      </div>
    </div>
  );
};

export default OrderDetailItemsTab;
