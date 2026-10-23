'use client';

import { useState } from 'react';
import {
  BellRing,
  X,
  Plane,
  ShieldCheck,
  CheckCircle2,
  Grid,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { BackInStockChannelToggle } from './BackInStockChannelToggle';
import { BackInStockContactInput } from './BackInStockContactInput';
import { BackInStockSuccessCard } from './BackInStockSuccessCard';
import {
  BackInStockAlertModalProps,
  StockProductSummary,
  NotificationChannels,
} from './types';

const DEFAULT_PRODUCT: StockProductSummary = {
  id: 'laneige-lip-mask-berry',
  brand: 'Laneige Korea',
  title: 'Laneige Lip Sleeping Mask Berry',
  subtitle: 'Net Weight: 20g • Vitamin C + Berry Fruit Complex',
  price: 1720,
  regularPrice: 2100,
  discountPercent: 18,
  image:
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=300&q=80',
  expectedDate: '১৫ নভেম্বর, ২০২৪ (Fresh Authentic Batch)',
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

  if (!isOpen) return null;

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      if (onConfirmAlert) {
        onConfirmAlert(channels, contact);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-[#062402]/65 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      <div
        className="w-full max-w-lg max-h-[92vh] bg-[#FAF9F6] text-[#181C1A] rounded-t-[36px] lg:rounded-[28px] border-t border-[#E2DED8] shadow-[0_-20px_50px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
      >
        {/* Pull Bar & Top Header */}
        <div className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-lg pt-3 pb-2 px-5 rounded-t-[36px] border-b border-[#E2DED8]/70">
          <div className="w-12 h-1.5 bg-[#B5C4BB]/60 rounded-full mx-auto mb-2 lg:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EAF7D8] flex items-center justify-center border border-[#B5C4BB] text-[#1c3a13]">
                <BellRing className="w-4 h-4 text-[#4b6723]" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-[#181C1A] flex items-center gap-2">
                  <span>স্টক এলার্ট নোটিফিকেশন</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#1c3a13] text-[#D4F6A2]">
                    VIP Privilege
                  </span>
                </h3>
                <p className="text-[11px] text-[#5A615D]">
                  Back in Stock Priority Notification
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="w-9 h-9 rounded-full bg-[#efeeeb] hover:bg-[#e3e2e0] border border-[#E2DED8] flex items-center justify-center text-[#5A615D] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto overscroll-contain">
          {/* Product Summary Card with Out-of-Stock Badge */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E2DED8] shadow-xs flex items-center gap-3.5 relative overflow-hidden">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[#E2DED8] bg-stone-100 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#062402]/30 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
                <span className="bg-[#ba1a1a] text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase shadow-xs">
                  স্টক আউট
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-[#28531c] font-semibold mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4b6723]" />
                <span>100% Authentic Korean Import</span>
              </div>
              <h4 className="text-[14px] font-bold text-[#181C1A] truncate">
                {product.title}
              </h4>
              <p className="text-[11px] text-[#5A615D] truncate mb-1">
                {product.subtitle}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-[16px] font-bold text-[#1c3a13]">
                  ৳{product.price.toLocaleString('bn-BD')}
                </span>
                {product.regularPrice > product.price && (
                  <span className="text-xs text-[#5A615D] line-through">
                    ৳{product.regularPrice.toLocaleString('bn-BD')}
                  </span>
                )}
                {product.discountPercent && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ccee9b] text-[#1c3a13] font-bold">
                    {product.discountPercent}% ছাড়
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expected Restock Date Callout */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#F2F6F0] border border-[#B5C4BB] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#1c3a13] flex items-center justify-center text-[#D4F6A2] shrink-0">
                <Plane className="w-3.5 h-3.5 text-[#D4F6A2]" />
              </div>
              <div>
                <p className="text-[#5A615D] font-medium text-[11px]">
                  সম্ভাব্য স্টক পৌঁছানোর তারিখ:
                </p>
                <p className="text-[#1c3a13] font-bold text-xs">
                  {product.expectedDate || '১৫ নভেম্বর, ২০২৪ (Fresh Authentic Batch)'}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-[#28531c] bg-white px-2 py-0.5 rounded-md border border-[#B5C4BB] font-medium shadow-xs">
              {product.batchInfo || 'Air Cargo In-Transit'}
            </span>
          </div>

          {/* Notification Channel Toggles */}
          <BackInStockChannelToggle
            channels={channels}
            onChange={setChannels}
          />

          {/* Contact Input */}
          <BackInStockContactInput
            initialContact={contact}
            userName={userName}
            onChangeContact={setContact}
          />

          {/* Primary Action Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#1c3a13] text-white hover:bg-[#28531c] active:scale-[0.98] shadow-md transition-all flex items-center justify-center gap-2 font-bold text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D4F6A2]" />
                  <span>সংরক্ষণ করা হচ্ছে...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#D4F6A2]" />
                  <span>সফলভাবে সক্রিয় হয়েছে!</span>
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4 text-[#D4F6A2]" />
                  <span>স্টকে আসলে জানান (Notify Me When Available)</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Similar Products Link */}
          <div className="text-center pt-0.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1c3a13] hover:text-[#28531c] transition-colors underline-offset-4 hover:underline"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>একই ক্যাটাগরির অন্যান্য প্রোডাক্ট দেখুন (View Similar Products)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Success State Card if triggered */}
          {isSuccess && (
            <BackInStockSuccessCard
              productTitle={product.title}
              onDismiss={() => setIsSuccess(false)}
            />
          )}

          {/* Trust Badge Footer Note */}
          <div className="pt-2 border-t border-[#E2DED8] flex items-center justify-between text-[11px] text-[#5A615D]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4b6723]" />
              <span>100% Genuine Direct Import Guarantee</span>
            </div>
            <span>Banani Central Hub • Dhaka</span>
          </div>
        </div>
      </div>
    </div>
  );
}
