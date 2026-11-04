'use client';

import React, { useState } from 'react';
import { Order } from './types';
import { ThermalSlipContainer, ThermalPaperWidth } from '@/components/admin/thermal/ThermalSlipContainer';
import { ThermalPrintToolbar } from '@/components/admin/thermal/ThermalPrintToolbar';
import { ThermalSlipHeader } from '@/components/admin/thermal/ThermalSlipHeader';
import { ThermalSlipCustomerBlock } from '@/components/admin/thermal/ThermalSlipCustomerBlock';
import { ThermalSlipItemsTable } from '@/components/admin/thermal/ThermalSlipItemsTable';
import { MarklifeLabelSticker } from '@/components/admin/thermal/MarklifeLabelSticker';

export interface ThermalReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ThermalReceiptModal({
  order,
  isOpen,
  onClose,
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const [copiedMemo, setCopiedMemo] = useState(false);

  if (!isOpen || !order) return null;

  const orderNum = order.id.slice(-8).toUpperCase();
  const subtotal = order.subtotal ?? order.total;
  const delivery = order.shippingCost || 0;
  const discount = order.discountAmount || 0;
  const grandTotal = order.total;

  const recipientName = order.shipping?.name || order.customer?.name || 'Walk-in Customer';
  const recipientPhone = order.shipping?.phone || order.customer?.phone || '';
  const recipientAddress = [order.shipping?.street1, order.shipping?.street2, order.shipping?.city]
    .filter(Boolean)
    .join(', ');

  const courierPartner =
    order.courier === 'pathao' || order.shippingMethod === 'pathao'
      ? 'Pathao Logistics'
      : 'Steadfast Courier';

  const trackingCode =
    order.steadfastTrackingCode ||
    order.pathaoTrackingCode ||
    order.tracking ||
    `ST-${orderNum}`;

  const formatTextMemo = () => {
    return [
      '==========================================',
      '             MINSAH BEAUTY                ',
      '     Authentic Premium Cosmetics          ',
      '  Shop #204, Genetic Plaza, Dhanmondi 27  ',
      '      Hotline: +880 9612-888999           ',
      '------------------------------------------',
      '       RETAIL INVOICE / CASH MEMO         ',
      `Order ID:    #ORD-${orderNum}`,
      `Date:        ${new Date(order.createdAt).toLocaleString()}`,
      `Cashier:     POS-01 (Admin)`,
      `Customer:    ${recipientName}`,
      `Phone:       ${recipientPhone || '—'}`,
      `Courier:     ${courierPartner} (${order.shipping?.city || 'Dhaka'})`,
      '------------------------------------------',
      'ITEM / DESCRIPTION                  TOTAL',
      '------------------------------------------',
      ...(order.items || []).map(
        (it) =>
          `${it.name.slice(0, 20).padEnd(22)} ${it.quantity}x৳${it.price} = ৳${it.total}`
      ),
      '------------------------------------------',
      `Subtotal:                    ৳${subtotal}`,
      `Delivery Charge:             ৳${delivery}`,
      discount > 0 ? `Discount (Promo):           -৳${discount}` : '',
      `TOTAL PAYABLE:               ৳${grandTotal}`,
      '------------------------------------------',
      `Payment Method:  ${order.paymentMethod}`,
      `Status:          ${order.paymentStatus === 'paid' ? 'PAID / SETTLED' : 'COD / PENDING COLLECTION'}`,
      `Tracking Code:   ${trackingCode}`,
      '==========================================',
      ' Thank you for shopping with Minsah Beauty!',
      ' Exchange accepted within 7 days with memo',
      '==========================================',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(formatTextMemo());
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = formatTextMemo();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-ORD-${orderNum}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 print:border-none print:shadow-none print:max-w-none">
        {/* Printable Toolbar */}
        <ThermalPrintToolbar
          paperWidth={paperWidth}
          onPaperWidthChange={setPaperWidth}
          onCopyMemo={handleCopyMemo}
          onDownloadTxt={handleDownloadTxt}
          onClose={onClose}
          copiedMemo={copiedMemo}
        />

        {/* Paper Container */}
        <div className="p-4 bg-slate-950/60 overflow-y-auto max-h-[82vh] print:p-0 print:max-h-none print:bg-white flex flex-col items-center">
          {paperWidth === '40x12mm' ? (
            <div className="flex flex-col items-center py-6">
              <ThermalSlipContainer paperWidth="40x12mm">
                <MarklifeLabelSticker
                  orderId={order.id}
                  orderNumber={orderNum}
                  showActions={false}
                />
              </ThermalSlipContainer>
              <div className="mt-4 print:hidden text-center max-w-xs">
                <MarklifeLabelSticker
                  orderId={order.id}
                  orderNumber={orderNum}
                  showActions={true}
                  className="mt-1"
                />
                <p className="text-[11px] text-slate-400 mt-2 leading-tight">
                  Marklife 15 হ্যান্ডহেল্ড লেবেল প্রিন্টারের জন্য অপ্টিমাইজড (40mm × 12mm)। এক স্টিকারে স্লিপ ও ওয়ারেন্টি কানেক্টেড।
                </p>
              </div>
            </div>
          ) : (
            <ThermalSlipContainer paperWidth={paperWidth}>
              <ThermalSlipHeader
                orderNumber={orderNum}
                date={order.createdAt}
                barcodeValue={trackingCode || orderNum}
              />

              <ThermalSlipCustomerBlock
                customerName={recipientName}
                phone={recipientPhone}
                address={recipientAddress}
                courierPartner={courierPartner}
                courierTracking={trackingCode}
                specialInstructions={order.adminNote}
              />

              <ThermalSlipItemsTable
                items={(order.items || []).map((it) => ({
                  name: it.name,
                  sku: it.sku,
                  quantity: it.quantity,
                  price: it.price,
                  total: it.total,
                  variant: it.variant?.name,
                }))}
                subtotal={subtotal}
                deliveryFee={delivery}
                discount={discount}
                grandTotal={grandTotal}
                isCod={order.paymentMethod === 'cash_on_delivery' || order.paymentStatus !== 'paid'}
                paymentMethod={order.paymentMethod}
                trxId={order.paymentTransactionId || undefined}
              />

              {/* Integrated QR Block on standard slips */}
              <div className="pt-2 pb-1 border-t border-dashed border-black flex flex-col items-center text-center">
                <span className="text-[8px] font-bold uppercase tracking-wider text-black">
                  Digital Slip & Warranty QR
                </span>
                <div className="py-1">
                  <MarklifeLabelSticker
                    orderId={order.id}
                    orderNumber={orderNum}
                    showActions={false}
                  />
                </div>
              </div>
            </ThermalSlipContainer>
          )}
        </div>
      </div>
    </div>
  );
}
