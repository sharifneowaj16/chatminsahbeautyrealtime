'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Calendar,
  QrCode,
  RotateCcw,
  FileText,
  Star,
  ChevronRight,
} from 'lucide-react';
import type { MobileOrderRecord } from './types';
import OrderHistoryProductItem from './OrderHistoryProductItem';

interface OrderHistoryDeliveredCardProps {
  order: MobileOrderRecord;
  onOpenCertModal: (orderId: string) => void;
  onReorder: (order: MobileOrderRecord) => void;
  onOpenReviewModal?: (orderId: string, productName: string) => void;
}

export default function OrderHistoryDeliveredCard({
  order,
  onOpenCertModal,
  onReorder,
  onOpenReviewModal,
}: OrderHistoryDeliveredCardProps) {
  const isCancelled = order.status === 'cancelled';

  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm flex flex-col gap-3.5 relative overflow-hidden transition-all duration-300 border border-[#E2DED8]/60">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#062402] font-bold tracking-tight">
              {order.orderNumber}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isCancelled
                  ? 'bg-red-50 text-red-700'
                  : 'bg-[#efeeeb] text-[#062402]'
              }`}
            >
              <CheckCircle2
                className={`w-3 h-3 ${isCancelled ? 'text-red-600' : 'text-[#4b6723]'}`}
              />
              {order.statusLabel}
            </span>
          </div>

          <p className="text-xs text-[#43483f] mt-1 flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#43483f]" />
            <span>{order.timestampLabel}</span>
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[16px] text-[#062402] font-bold block leading-none">
            ৳ {order.totalAmount.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#43483f] font-semibold uppercase mt-1 inline-block">
            {order.paymentMethod}
          </span>
        </div>
      </div>

      {/* Hologram & Batch Seal Strip (if available) */}
      {order.batchSeal && !isCancelled && (
        <div className="px-3 py-2 rounded-2xl bg-[#EAF7D8]/30 flex items-center justify-between gap-2 border border-[#EAF7D8]">
          <div className="flex items-center gap-2 min-w-0">
            <QrCode className="w-4 h-4 text-[#4b6723] shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#062402] block truncate">
                Authentic Batch Seal: {order.batchSeal.code}
              </span>
              <span className="text-[10px] text-[#43483f] block">
                {order.batchSeal.notes}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenCertModal(order.orderNumber)}
            className="text-[11px] text-[#4b6723] font-bold hover:underline shrink-0"
          >
            View Cert
          </button>
        </div>
      )}

      {/* Product Items Stream */}
      <div className="flex flex-col gap-2">
        {order.products.map((item) => (
          <OrderHistoryProductItem key={item.id} product={item} />
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 pt-1">
        {order.canReview ? (
          <button
            type="button"
            onClick={() =>
              onOpenReviewModal?.(
                order.orderNumber,
                order.products[0]?.name || 'Korean Skincare Product'
              )
            }
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-[#EAF7D8] hover:bg-[#ccee9b] text-[#516d29] text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer border border-[#4b6723]/20"
          >
            <Star className="w-4 h-4 text-[#4b6723] fill-[#4b6723]" />
            <span>Rate & Review (+50 Pts)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReorder(order)}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-[#EAF7D8] hover:bg-[#ccee9b] text-[#516d29] text-xs font-bold active:scale-95 transition-all shadow-xs cursor-pointer border border-[#4b6723]/20"
          >
            <RotateCcw className="w-4 h-4 text-[#4b6723]" />
            <span>Reorder All</span>
          </button>
        )}

        <Link
          href={`/account/orders/${order.id}?print=invoice`}
          target="_blank"
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-[#efeeeb] hover:bg-[#e9e8e5] text-[#1a1c1a] text-xs font-bold active:scale-95 transition-all border border-[#E2DED8]/60"
          title="Download Tax Invoice"
        >
          <FileText className="w-4 h-4 text-[#4b6723]" />
          <span>Tax Invoice</span>
        </Link>
      </div>
    </article>
  );
}
