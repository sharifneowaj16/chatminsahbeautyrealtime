'use client';

import { useState } from 'react';
import { BellRing, Plane, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { BackInStockChannelToggle } from './BackInStockChannelToggle';
import { BackInStockContactInput } from './BackInStockContactInput';
import { BackInStockSuccessCard } from './BackInStockSuccessCard';
import { BackInStockAlertModalProps, StockProductSummary, NotificationChannels } from './types';

const DEFAULT_PRODUCT: StockProductSummary = {
  id: 'laneige-lip-mask-berry',
  brand: 'Laneige Korea',
  title: 'Laneige Lip Sleeping Mask Berry',
  subtitle: 'Net Weight: 20g • Vitamin C + Berry Fruit Complex',
  price: 1720,
  regularPrice: 2100,
  discountPercent: 18,
  image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=300&q=80',
  expectedDate: '১৫ নভেম্বর (Fresh Authentic Batch)',
  batchInfo: 'Air Cargo In-Transit',
};

export function BackInStockAlertModal({
  isOpen,
  onClose,
  product = DEFAULT_PRODUCT,
  userPhone = '+880 1712-894102',
  userName = 'Tasneem Ahmed',
  onConfirmAlert,
}: BackInStockAlertModalProps) {
  const [channels, setChannels] = useState<NotificationChannels>({
    whatsapp: true,
    sms: true,
    email: false,
    push: true,
  });
  const [contact, setContact] = useState(userPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      onConfirmAlert?.(channels, contact);
    }, 600);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      badge={
        <>
          <BellRing className="h-3.5 w-3.5 text-[#4b6723]" />
          <span>VIP Priority Restock Alert</span>
        </>
      }
      title="স্টক এলার্ট নোটিফিকেশন"
      description="Back in Stock Priority Notification"
      footer={
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-5 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
                <span>সংরক্ষণ করা হচ্ছে...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-[#D4F6A2]" />
                <span>সফলভাবে সক্রিয় হয়েছে!</span>
              </>
            ) : (
              <>
                <BellRing className="h-4 w-4 text-[#D4F6A2]" />
                <span>স্টকে আসলে জানান (Notify Me)</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center rounded-full border border-[#E2DED8] bg-[#F4F3EF] font-semibold text-[#5A615D] hover:text-[#181C1A]"
          >
            একই ক্যাটাগরির প্রোডাক্ট দেখুন (Close)
          </button>
        </div>
      }
    >
      <div className="rounded-2xl border border-[#E2DED8] bg-white p-3.5 flex items-center gap-3.5 shadow-xs">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E2DED8] bg-stone-100">
          <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-[#062402]/35">
            <span className="rounded-full bg-[#ba1a1a] px-2 py-0.5 text-xs font-bold text-white">
              স্টক আউট
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-xs font-semibold text-[#28531c]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#4b6723]" />
            <span>100% Authentic Import</span>
          </div>
          <h4 className="truncate font-bold text-[#181C1A]">{product.title}</h4>
          <p className="truncate text-xs text-[#5A615D]">{product.subtitle}</p>
          <div className="mt-1 flex items-baseline gap-2 font-price">
            <span className="font-bold text-[#062402]">৳{product.price.toLocaleString('bn-BD')}</span>
            {product.regularPrice > product.price ? (
              <span className="text-xs text-[#5A615D] line-through">
                ৳{product.regularPrice.toLocaleString('bn-BD')}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-[#B5C4BB] bg-[#F2F6F0] px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#062402] text-[#D4F6A2]">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-[#5A615D]">সম্ভাব্য স্টক পৌঁছানোর তারিখ:</p>
            <p className="font-bold text-[#1c3a13]">
              {product.expectedDate || 'Fresh Authentic Batch'}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[#B5C4BB] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#28531c]">
          {product.batchInfo || 'In-Transit'}
        </span>
      </div>

      <BackInStockChannelToggle channels={channels} onChange={setChannels} />
      <BackInStockContactInput
        initialContact={contact}
        userName={userName}
        onChangeContact={setContact}
      />

      {isSuccess ? (
        <BackInStockSuccessCard
          productTitle={product.title}
          onDismiss={() => setIsSuccess(false)}
        />
      ) : null}
    </Modal>
  );
}
